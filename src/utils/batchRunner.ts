import { z } from "zod";
import { msg } from "../i18n";

export type UntilTarget =
  | { kind: "started" }
  | { kind: "finished" }
  | { kind: "success" }
  | { kind: "paused" }
  | { kind: "stage"; stage: string };

export type BatchParams = Record<string, string | number | boolean>;

export interface BatchEntry {
  job: string;
  params?: BatchParams;
}

export interface BatchManifest {
  concurrency?: number;
  until?: string;
  pollInterval?: number;
  jobs: BatchEntry[];
}

export function parseUntil(value: string): UntilTarget {
  const trimmed = value.trim();
  if (trimmed === "started" || trimmed === "finished" || trimmed === "success" || trimmed === "paused") {
    return { kind: trimmed };
  }
  if (trimmed.startsWith("stage:") && trimmed.length > "stage:".length) {
    return { kind: "stage", stage: trimmed.slice("stage:".length) };
  }
  throw new Error(msg.batch.invalidUntil({ value }));
}

export function formatUntil(target: UntilTarget): string {
  return target.kind === "stage" ? `stage:${target.stage}` : target.kind;
}

const manifestSchema = z.object({
  concurrency: z.number().int().positive().optional(),
  until: z.string().optional(),
  pollInterval: z.number().positive().optional(),
  jobs: z
    .array(
      z.union([
        z.string().min(1),
        z.object({
          job: z.string().min(1),
          params: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
        }),
      ])
    )
    .min(1),
});

/** Parses and validates the JSON manifest; a bare string in `jobs` is a job without parameters. */
export function parseManifest(text: string, path: string): BatchManifest {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (error: any) {
    throw new Error(msg.batch.invalidManifest({ path, error: error.message }));
  }

  const parsed = manifestSchema.safeParse(raw);
  if (!parsed.success) {
    const error = parsed.error.issues.map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`).join("; ");
    throw new Error(msg.batch.invalidManifest({ path, error }));
  }

  const { jobs, ...rest } = parsed.data;
  return { ...rest, jobs: jobs.map((entry) => (typeof entry === "string" ? { job: entry } : entry)) };
}

/** What a launched build is doing with respect to the target state. */
export type Probe =
  | { state: "waiting" }
  | { state: "reached" }
  | { state: "missed"; reason: string };

/** Mutable on purpose: `probe` fills `build` as soon as the queue item becomes a running build. */
export interface LaunchHandle {
  queueUrl: string;
  build?: number;
}

export type BatchEvent =
  | { type: "launched"; index: number; job: string }
  | { type: "started"; index: number; job: string; build: number }
  | { type: "reached"; index: number; job: string; build?: number }
  | { type: "missed"; index: number; job: string; build?: number; reason: string }
  | { type: "failed"; index: number; job: string; error: string };

export interface BatchDeps {
  launch(entry: BatchEntry): Promise<LaunchHandle>;
  probe(entry: BatchEntry, handle: LaunchHandle): Promise<Probe>;
  sleep(ms: number): Promise<void>;
  onEvent?(event: BatchEvent): void;
}

export interface BatchResult {
  entry: BatchEntry;
  outcome: "reached" | "missed" | "failed";
  build?: number;
  detail?: string;
}

/** Consecutive failed polls tolerated before giving up on a build (a network blip must not free its slot). */
const MAX_POLL_FAILURES = 3;

/**
 * Launches `entries` in order, never keeping more than `concurrency` builds that have not yet
 * reached the target. A slot is freed when its build reaches the target, can no longer reach it
 * (e.g. it finished as FAILURE when waiting for success) or cannot be tracked.
 */
export async function runBatch(
  entries: BatchEntry[],
  options: { concurrency: number; pollIntervalMs: number },
  deps: BatchDeps
): Promise<BatchResult[]> {
  const results: BatchResult[] = [];
  const active: Array<{ index: number; handle: LaunchHandle; failures: number }> = [];
  const emit = (event: BatchEvent) => deps.onEvent?.(event);
  let next = 0;

  while (next < entries.length || active.length > 0) {
    while (next < entries.length && active.length < options.concurrency) {
      const index = next++;
      const entry = entries[index];
      try {
        const handle = await deps.launch(entry);
        active.push({ index, handle, failures: 0 });
        emit({ type: "launched", index, job: entry.job });
      } catch (error: any) {
        results[index] = { entry, outcome: "failed", detail: error.message };
        emit({ type: "failed", index, job: entry.job, error: error.message });
      }
    }

    if (active.length === 0) continue;

    await deps.sleep(options.pollIntervalMs);

    const probes = await Promise.all(
      active.map(async (item) => {
        const entry = entries[item.index];
        const hadBuild = item.handle.build !== undefined;
        try {
          return { item, probe: await deps.probe(entry, item.handle), hadBuild };
        } catch (error: any) {
          return { item, error: error as Error, hadBuild };
        }
      })
    );

    for (const { item, probe, error, hadBuild } of probes) {
      const entry = entries[item.index];
      const { build } = item.handle;

      if (build !== undefined && !hadBuild) emit({ type: "started", index: item.index, job: entry.job, build });

      if (error) {
        if (++item.failures < MAX_POLL_FAILURES) continue;
        results[item.index] = { entry, outcome: "failed", build, detail: error.message };
        emit({ type: "failed", index: item.index, job: entry.job, error: error.message });
      } else if (probe.state === "waiting") {
        item.failures = 0;
        continue;
      } else if (probe.state === "reached") {
        results[item.index] = { entry, outcome: "reached", build };
        emit({ type: "reached", index: item.index, job: entry.job, build });
      } else {
        results[item.index] = { entry, outcome: "missed", build, detail: probe.reason };
        emit({ type: "missed", index: item.index, job: entry.job, build, reason: probe.reason });
      }

      active.splice(active.indexOf(item), 1);
    }
  }

  return results;
}
