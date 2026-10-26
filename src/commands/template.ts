import { existsSync, writeFileSync } from "node:fs";
import { getAllJobs, getJobParameters } from "../utils/jenkinsFolder";
import { renderTemplate, type TemplateJob } from "../utils/batchTemplate";
import type { BatchParams } from "../utils/batchRunner";
import { debugLog } from "../utils/debug";
import { logger } from "../utils/logger";
import { msg } from "../i18n";
import { icons } from "../utils/icons";
import { formatters } from "../utils/formatters";

export interface TemplateOptions {
  output?: string;
  force?: boolean;
  withParams?: boolean;
}

// Secrets and uploads have no value worth putting in a file that is meant to be committed or shared
const SKIPPED_TYPES = new Set(["password", "file"]);

async function defaultParams(job: string): Promise<BatchParams | undefined> {
  try {
    const params: BatchParams = {};
    for (const p of await getJobParameters(job)) {
      if (SKIPPED_TYPES.has(p.type)) continue;
      const value = p.defaultValue;
      params[p.name] = typeof value === "string" || typeof value === "number" || typeof value === "boolean" ? value : "";
    }
    return params;
  } catch (error: any) {
    debugLog(`No parameters for ${job}: ${error.message}`);
    return undefined;
  }
}

/**
 * Genera un manifiesto JSONC para `jobs batch` con todos los jobs de Jenkins (o de una carpeta)
 * comentados, para ir descomentando los que se quieran lanzar.
 */
export async function template(folder: string | undefined, options: TemplateOptions = {}) {
  try {
    if (options.output && existsSync(options.output) && !options.force) {
      throw new Error(msg.template.exists({ path: options.output }));
    }

    // "disabled" jobs would fail the pre-launch check of `jobs batch`
    const items = (await getAllJobs(folder ?? "")).filter((item) => item.color !== "disabled");
    if (items.length === 0) throw new Error(msg.template.noJobs());

    const jobs: TemplateJob[] = [];
    for (const item of items) {
      jobs.push({ job: item.fullName, params: options.withParams ? await defaultParams(item.fullName) : undefined });
    }

    const text = renderTemplate(jobs);

    if (!options.output) {
      console.log(text);
      return;
    }

    writeFileSync(options.output, text, "utf8");
    logger.info(formatters.success(`${icons.success} ${msg.template.written({ count: jobs.length, path: options.output })}`));
    logger.info(formatters.info(`${icons.idea} ${msg.template.next({ path: options.output })}`));
  } catch (error: any) {
    logger.error(`${icons.error} ${error.message}`);
    process.exit(1);
  }
}
