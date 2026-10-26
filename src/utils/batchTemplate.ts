import { msg } from "../i18n";
import type { BatchParams } from "./batchRunner";

export interface TemplateJob {
  job: string;
  params?: BatchParams;
}

/** Folder of a job, or "" for jobs at the root. */
function folderOf(job: string): string {
  return job.slice(0, Math.max(job.lastIndexOf("/"), 0));
}

function entry({ job, params }: TemplateJob): string {
  if (!params || Object.keys(params).length === 0) return `// ${JSON.stringify(job)},`;
  const pairs = Object.entries(params).map(([key, value]) => `${JSON.stringify(key)}: ${JSON.stringify(value)}`);
  return `// { "job": ${JSON.stringify(job)}, "params": { ${pairs.join(", ")} } },`;
}

/** Renders a JSONC batch manifest with every job commented out, grouped by folder. */
export function renderTemplate(jobs: TemplateJob[]): string {
  // Root jobs first, then folder by folder
  const sorted = [...jobs].sort(
    (a, b) => folderOf(a.job).localeCompare(folderOf(b.job)) || a.job.localeCompare(b.job)
  );
  const lines: string[] = [
    `// ${msg.template.header1()}`,
    `// ${msg.template.header2()}`,
    `// ${msg.template.header3()}`,
    "{",
    `  // ${msg.template.concurrencyHint()}`,
    `  "concurrency": 1,`,
    "",
    `  // ${msg.template.untilHint()}`,
    `  "until": "finished",`,
    "",
    `  // ${msg.template.intervalHint()}`,
    `  "pollInterval": 5,`,
    "",
    `  "jobs": [`,
  ];

  let current: string | undefined;
  for (const job of sorted) {
    const folder = folderOf(job.job);
    if (folder !== current) {
      if (current !== undefined) lines.push("");
      lines.push(`    // --- ${folder || msg.template.rootGroup()} ---`);
      current = folder;
    }
    lines.push(`    ${entry(job)}`);
  }

  lines.push("  ],", "}", "");
  return lines.join("\n");
}
