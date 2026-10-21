import inquirer from "inquirer";
import { abortBuild, getBuildInfo } from "../utils/jenkinsFolder";
import { logger } from "../utils/logger";
import { msg } from "../i18n";
import { icons } from "../utils/icons";
import { formatters } from "../utils/formatters";

/**
 * Aborta un build en ejecución, pidiendo confirmación salvo con --yes
 */
export async function abort(
  jobName: string,
  buildNumber: string,
  options: { yes?: boolean } = {}
) {
  try {
    const build = await getBuildInfo(
      jobName,
      buildNumber.toLowerCase() === 'latest' ? 'lastBuild' : buildNumber
    );

    if (!build.building) {
      const finished = build.result
        ? msg.warnings.buildNotRunningWithResult({ build: build.number, result: build.result })
        : msg.warnings.buildNotRunning({ build: build.number });
      logger.warn(`${icons.warning}  ${finished}`);
      return;
    }

    if (!options.yes) {
      const { confirm } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirm',
          message: msg.prompts.confirmAbort({ build: build.number, job: jobName }),
          default: false,
        },
      ]);

      if (!confirm) {
        logger.warn(`\n${icons.aborted} ${msg.warnings.abortCancelled()}`);
        return;
      }
    }

    const result = await abortBuild(jobName, build.number);
    logger.info(formatters.success(`${icons.success} ${result.message}`));
  } catch (error: any) {
    logger.error(`${icons.error} ${error.message}`);
    process.exit(1);
  }
}
