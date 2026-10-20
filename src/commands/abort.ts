import inquirer from "inquirer";
import { abortBuild, getBuildInfo } from "../utils/jenkinsFolder";
import { logger } from "../utils/logger";
import { msg } from "../utils/messages";
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
      logger.warn(`${msg.icons.warning}  ${msg.warnings.buildNotRunning(build.number, build.result)}`);
      return;
    }

    if (!options.yes) {
      const { confirm } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirm',
          message: msg.prompts.confirmAbort(build.number, jobName),
          default: false,
        },
      ]);

      if (!confirm) {
        logger.warn(`\n${msg.icons.aborted} ${msg.warnings.abortCancelled}`);
        return;
      }
    }

    const result = await abortBuild(jobName, build.number);
    logger.info(formatters.success(`${msg.icons.success} ${result.message}`));
  } catch (error: any) {
    logger.error(`${msg.icons.error} ${error.message}`);
    process.exit(1);
  }
}
