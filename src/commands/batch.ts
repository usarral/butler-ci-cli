import { readFileSync } from "node:fs";
import inquirer from "inquirer";
import {
  buildJob,
  getBuildInfo,
  getJobInfo,
  getPipelineStages,
  getQueueItem,
  type PipelineStage,
} from "../utils/jenkinsFolder";
import {
  BatchEntry,
  BatchEvent,
  LaunchHandle,
  Probe,
  UntilTarget,
  formatUntil,
  parseManifest,
  parseUntil,
  runBatch,
} from "../utils/batchRunner";
import { parseCliParams } from "./build";
import { logger } from "../utils/logger";
import { msg } from "../i18n";
import { icons } from "../utils/icons";
import { formatters } from "../utils/formatters";

export interface BatchOptions {
  file?: string;
  params?: string;
  concurrency?: string;
  until?: string;
  interval?: string;
  yes?: boolean;
}

const STAGE_FAILED = new Set(["FAILED", "FAILURE", "ABORTED", "UNSTABLE"]);

/** Adds the first failed stage, if any, to the reason why a finished build never reached the target. */
function withFailedStage(reason: string, stages: PipelineStage[]): string {
  const failed = stages.find((s) => STAGE_FAILED.has(s.status));
  return failed ? msg.batch.reasonFailedAt({ reason, stage: failed.name, status: failed.status }) : reason;
}

/** Looks at a launched build and says whether it reached the target, can no longer reach it, or is still going. */
export async function probeBuild(job: string, handle: LaunchHandle, target: UntilTarget): Promise<Probe> {
  if (handle.build === undefined) {
    const item = await getQueueItem(handle.queueUrl);
    if (item.cancelled) return { state: "missed", reason: msg.batch.reasonQueueCancelled() };
    if (item.buildNumber === undefined) return { state: "waiting" };
    handle.build = item.buildNumber;
  }

  if (target.kind === "started") return { state: "reached" };

  const build = await getBuildInfo(job, handle.build);

  if (target.kind === "paused") {
    const stages = await getPipelineStages(job, handle.build);
    if (stages.some((s) => s.status === "PAUSED_PENDING_INPUT")) return { state: "reached" };
    if (build.building) return { state: "waiting" };
    const result = build.result ?? "UNKNOWN";
    return { state: "missed", reason: withFailedStage(msg.batch.reasonNeverPaused({ result }), stages) };
  }

  if (target.kind === "stage") {
    const stages = await getPipelineStages(job, handle.build);
    const stage = stages.find((s) => s.name === target.stage);
    if (stage?.status === "SUCCESS") return { state: "reached" };
    if (stage && STAGE_FAILED.has(stage.status)) {
      return { state: "missed", reason: msg.batch.reasonStageEnded({ stage: target.stage, status: stage.status }) };
    }
    if (build.building) return { state: "waiting" };
    const result = build.result ?? "UNKNOWN";
    return { state: "missed", reason: withFailedStage(msg.batch.reasonStageMissing({ stage: target.stage, result }), stages) };
  }

  if (build.building) return { state: "waiting" };
  if (target.kind === "success" && build.result !== "SUCCESS") {
    return { state: "missed", reason: msg.batch.reasonResult({ result: build.result ?? "UNKNOWN" }) };
  }
  return { state: "reached" };
}

function positiveNumber(value: string, error: (value: string) => string, integer: boolean): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0 || (integer && !Number.isInteger(n))) throw new Error(error(value));
  return n;
}

/** Resolves the entries and settings from arguments and --file; flags win over the manifest. */
export function resolveBatch(jobs: string[], options: BatchOptions) {
  const entries: BatchEntry[] = [];
  const sharedParams = options.params ? parseCliParams(options.params) : undefined;
  for (const job of jobs) entries.push(sharedParams ? { job, params: sharedParams } : { job });

  let manifest: ReturnType<typeof parseManifest> | undefined;
  if (options.file) {
    let text: string;
    try {
      text = readFileSync(options.file, "utf8");
    } catch (error: any) {
      throw new Error(msg.batch.unreadableManifest({ path: options.file, error: error.message }));
    }
    manifest = parseManifest(text, options.file);
    entries.push(...manifest.jobs);
  }

  if (entries.length === 0) throw new Error(msg.batch.noJobs());

  const concurrency = options.concurrency !== undefined
    ? positiveNumber(options.concurrency, (v) => msg.batch.invalidConcurrency({ value: v }), true)
    : manifest?.concurrency ?? 1;
  const intervalSeconds = options.interval !== undefined
    ? positiveNumber(options.interval, (v) => msg.batch.invalidInterval({ value: v }), false)
    : manifest?.pollInterval ?? 5;
  const until = parseUntil(options.until ?? manifest?.until ?? "finished");

  return { entries, concurrency, intervalSeconds, until };
}

function printEvent(event: BatchEvent, entries: BatchEntry[], until: string) {
  const total = entries.length;
  // El mismo job puede aparecer varias veces con parámetros distintos: se numera para distinguirlos
  const repeated = entries.filter((e) => e.job === event.job).length > 1;
  const job = repeated ? `${event.job} (${event.index + 1}/${total})` : event.job;

  switch (event.type) {
    case "launched":
      logger.info(`${icons.rocket} ${msg.batch.launched({ position: event.index + 1, total, job: formatters.jobName(event.job) })}`);
      break;
    case "started":
      logger.info(`${icons.running} ${msg.batch.running({ job: formatters.jobName(job), build: event.build })}`);
      break;
    case "reached":
      logger.info(formatters.success(`${icons.success} ${msg.batch.reached({ job, build: event.build ?? "?", until })}`));
      break;
    case "missed":
      logger.warn(`${icons.warning}  ${msg.batch.missed({ job, until, reason: event.reason })}`);
      break;
    case "failed":
      logger.error(`${icons.error} ${msg.batch.failed({ job, error: event.error })}`);
      break;
  }
}

/**
 * Lanza varios jobs manteniendo como máximo N sin haber alcanzado el estado objetivo;
 * cuando uno lo alcanza, libera su hueco y lanza el siguiente.
 */
export async function batch(jobs: string[], options: BatchOptions = {}) {
  try {
    const { entries, concurrency, intervalSeconds, until } = resolveBatch(jobs, options);
    const untilLabel = formatUntil(until);

    // Antes de lanzar nada: un nombre mal escrito no debe descubrirse con la mitad del lote en marcha
    const parameterized = new Set<string>();
    for (const job of new Set(entries.map((e) => e.job))) {
      const info = await getJobInfo(job);
      if (!info.buildable) throw new Error(msg.errors.jobNotExecutable({ job }));
      if (info.property?.some((p: any) => p._class?.includes("ParametersDefinitionProperty"))) parameterized.add(job);
    }

    logger.info(`${icons.target} ${msg.batch.plan({ count: entries.length, concurrency, until: untilLabel })}\n`);

    if (!options.yes) {
      const { confirm } = await inquirer.prompt([
        {
          type: "confirm",
          name: "confirm",
          message: msg.prompts.confirmBatch({ count: entries.length, concurrency }),
          default: true,
        },
      ]);
      if (!confirm) {
        logger.warn(`\n${icons.aborted} ${msg.batch.cancelled()}`);
        return;
      }
    }

    const results = await runBatch(
      entries,
      { concurrency, pollIntervalMs: intervalSeconds * 1000 },
      {
        launch: async (entry) => ({
          queueUrl: (await buildJob(entry.job, entry.params, { parameterized: parameterized.has(entry.job) })).queueUrl,
        }),
        probe: (entry, handle) => probeBuild(entry.job, handle, until),
        sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
        onEvent: (event) => printEvent(event, entries, untilLabel),
      }
    );

    const count = (outcome: string) => results.filter((r) => r.outcome === outcome).length;
    const summary = msg.batch.summary({ reached: count("reached"), missed: count("missed"), failed: count("failed") });
    const allReached = count("reached") === results.length;
    logger.info(`\n${allReached ? formatters.success(`${icons.success} ${summary}`) : `${icons.warning}  ${summary}`}`);

    if (!allReached) process.exit(1);
  } catch (error: any) {
    logger.error(`${icons.error} ${error.message}`);
    process.exit(1);
  }
}
