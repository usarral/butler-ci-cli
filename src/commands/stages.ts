import { getBuildInfo, getPipelineStages } from "../utils/jenkinsFolder";
import { logger } from "../utils/logger";
import { msg } from "../i18n";
import { icons } from "../utils/icons";
import { jobStatus } from "../utils/jobStatus";
import { formatters, printHeader } from "../utils/formatters";

function statusLabel(status: string): string {
  switch (status) {
    case "SUCCESS": return jobStatus.success();
    case "FAILED": case "FAILURE": return jobStatus.failed();
    case "UNSTABLE": return jobStatus.unstable();
    case "ABORTED": return jobStatus.aborted();
    case "IN_PROGRESS": return formatters.info(`${icons.running} ${msg.steps.inProgress()}`);
    case "NOT_EXECUTED": return formatters.secondary(`${icons.skipped} ${msg.steps.notExecuted()}`);
    case "PAUSED_PENDING_INPUT": return formatters.warning(`${icons.paused} ${msg.steps.paused()}`);
    default: return formatters.secondary(status);
  }
}

/**
 * Lista los stages de un build (el último por defecto) con su estado, para saber qué nombre
 * usar en `jobs batch --until stage:<nombre>`.
 */
export async function stages(jobName: string, buildNumber: string = "latest") {
  try {
    const requested = buildNumber.toLowerCase() === "latest" ? "lastBuild" : buildNumber;
    const build = await getBuildInfo(jobName, requested);

    logger.info(`${icons.search} ${msg.stages.fetching({ build: formatters.buildNumber(build.number), job: formatters.jobName(jobName) })}`);

    const list = await getPipelineStages(jobName, build.number);

    if (list.length === 0) {
      logger.info(`${icons.info} ${msg.stages.none({ build: build.number })}`);
      return;
    }

    printHeader(`${icons.file} ${msg.stages.title()}`);
    list.forEach((stage, index) => {
      const duration = stage.durationMillis ? ` (${formatters.duration(stage.durationMillis)})` : "";
      console.log(`  ${index + 1}. ${formatters.title(stage.name)} - ${statusLabel(stage.status)}${duration}`);
    });
    console.log(`\n${formatters.secondary(`${icons.idea} ${msg.stages.hint()}`)}`);
  } catch (error: any) {
    logger.error(`${icons.error} ${error.message}`);
    process.exit(1);
  }
}
