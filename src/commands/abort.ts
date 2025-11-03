import { abortBuild, getJobInfo } from "../utils/jenkinsFolder";
import { logger } from "../utils/logger";
import { msg } from "../utils/messages";
import { formatters } from "../utils/formatters";
import inquirer from "inquirer";

export interface AbortCommandOptions {
  force?: boolean;
}

export async function abort(
  jobName: string,
  buildNumber: string,
  options: AbortCommandOptions = {}
) {
  try {
    logger.info(
      `${msg.icons.stop} ${msg.info.abortingBuild(buildNumber, formatters.jobName(jobName))}`
    );

    // Verificar que el job existe
    try {
      await getJobInfo(jobName);
    } catch (error: any) {
      logger.error(msg.errors.jobNotFound(jobName));
      process.exit(1);
    }

    // Si no está en modo force, pedir confirmación
    if (!options.force) {
      const { confirm } = await inquirer.prompt([
        {
          type: "confirm",
          name: "confirm",
          message: msg.prompts.confirmAbort(buildNumber, jobName),
          default: false,
        },
      ]);

      if (!confirm) {
        logger.warn(`\n${msg.icons.warning} ${msg.warnings.abortCancelled}`);
        return;
      }
    }

    // Intentar abortar el build
    logger.info(
      formatters.secondary(`\n${msg.icons.info} ${msg.info.checkingBuildStatus}`)
    );

    const result = await abortBuild(jobName, buildNumber);

    if (result.success) {
      logger.info(
        formatters.success(`\n${msg.icons.success} ${result.message}`)
      );
      
      // Log adicional con detalles
      logger.info(
        formatters.secondary(
          `\n💡 El build fue abortado y aparecerá como "ABORTED" en el historial de builds.`
        )
      );
      logger.info(
        formatters.secondary(
          `Puedes verificar el estado con: butler-ci-cli list-builds ${jobName}`
        )
      );
    } else {
      logger.warn(
        formatters.warning(`\n${msg.icons.warning} ${result.message}`)
      );
      
      // Si el build ya está completado, dar información adicional
      if (result.message.includes("completado")) {
        logger.info(
          formatters.secondary(
            `\nSolo los builds en ejecución o en cola pueden ser abortados.`
          )
        );
        logger.info(
          formatters.secondary(
            `Verifica el estado con: butler-ci-cli list-builds ${jobName}`
          )
        );
      }
    }
  } catch (error: any) {
    logger.error(`${msg.icons.error} ${error.message}`);
    
    // Proporcionar consejos útiles en caso de error
    if (error.message.includes("404") || error.message.includes("no encontrado")) {
      logger.info(
        formatters.secondary(
          `\n💡 Verifica que el número de build es correcto con: butler-ci-cli list-builds ${jobName}`
        )
      );
    } else if (error.message.includes("permisos") || error.message.includes("403")) {
      logger.info(
        formatters.secondary(
          `\n💡 Asegúrate de tener permisos para abortar builds en Jenkins.`
        )
      );
    }
    
    process.exit(1);
  }
}
