import { getAllJobs } from "../utils/jenkinsFolder";
import { getJenkinsClient, resetJenkinsClient } from "../utils/jenkinsClient";
import { getJenkinsConfig } from "../utils/config";
import { saveJobs } from "../utils/storage";
import { logger } from "../utils/logger";
import { msg } from "../i18n";
import { icons } from "../utils/icons";
import { formatters } from "../utils/formatters";

export interface FetchJobsOptions {
  /** Solo en el flujo automático (create/use): no mostrar ejemplos ni fallar si el servidor no responde. */
  background?: boolean;
  /** Timeout por petición, para que un Jenkins inalcanzable (VPN caída) no cuelgue el comando. */
  timeoutMs?: number;
}

/**
 * Descarga todos los jobs del entorno activo y los guarda en su caché
 * (~/.butler-ci-cli/jobs/<entorno>.json), que usa el autocompletado.
 */
export async function fetchJobs(options: FetchJobsOptions = {}): Promise<boolean> {
  try {
    const environment = getJenkinsConfig()?.name;
    if (!environment) {
      logger.error(formatters.error(`${icons.error} ${msg.errors.noConfig()}`));
      return false;
    }

    logger.info(`${icons.search} ${options.background
      ? msg.fetch.autoFetching({ environment })
      : msg.info.fetchingJobs()}`);

    if (options.timeoutMs) {
      resetJenkinsClient();
      getJenkinsClient().defaults.timeout = options.timeoutMs;
    }

    const jobItems = await getAllJobs();
    const jobNames = jobItems.map(job => job.fullName);

    // getAllJobs traga los errores y devuelve []: no pisar una caché buena con una lista vacía.
    if (jobNames.length === 0) {
      logger.warn(formatters.warning(`${icons.warning} ${msg.fetch.noJobs({ environment })}`));
      return false;
    }

    saveJobs(environment, jobNames);

    logger.info(formatters.success(`${icons.success} ${msg.success.jobsFetched({ count: jobNames.length })}`));

    if (!options.background) {
      printExamples(jobNames);
    }
    return true;
  } catch (error: any) {
    if (options.background) {
      logger.warn(formatters.warning(`${icons.warning} ${msg.fetch.autoFetchFailed({ error: error.message })}`));
    } else {
      logger.error(formatters.error(`${icons.error} ${msg.errors.generic()}: ${error.message}`));
    }
    return false;
  }
}

function printExamples(jobNames: string[]): void {
  logger.info(`\n${icons.list} ${msg.fetch.examples()}`);
  for (const name of jobNames.slice(0, 5)) {
    const parts = name.split('/');
    if (parts.length > 1) {
      logger.info(`   ${icons.folder} ${formatters.info(parts.slice(0, -1).join('/'))} ${icons.arrow} ${formatters.secondary(parts[parts.length - 1])}`);
    } else {
      logger.info(`   ${icons.circle} ${formatters.secondary(name)}`);
    }
  }

  if (jobNames.length > 5) {
    logger.info(`   ${msg.fetch.more({ count: jobNames.length - 5 })}`);
  }
}
