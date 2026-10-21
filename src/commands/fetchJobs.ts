import { getAllJobs } from "../utils/jenkinsFolder";
import { saveJobs } from "../utils/storage";
import { logger } from "../utils/logger";
import { msg } from "../i18n";
import { icons } from "../utils/icons";
import { formatters } from "../utils/formatters";

export async function fetchJobs() {
  try {
    logger.info(`${icons.search} ${msg.info.fetchingJobs()}`);
    
    const jobItems = await getAllJobs();
    const jobNames = jobItems.map(job => job.fullName);
    
    await saveJobs(jobNames);
    
    logger.info(formatters.success(`${icons.success} ${msg.success.jobsFetched({ count: jobNames.length })}`));
    
    // Mostrar algunos ejemplos de lo que se encontró
    if (jobNames.length > 0) {
      logger.info(`\n${icons.list} ${msg.fetch.examples()}`);
      const examples = jobNames.slice(0, 5);
      for (const name of examples) {
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
    
  } catch (error: any) {
    logger.error(formatters.error(`${icons.error} ${msg.errors.generic()}: ${error.message}`));
  }
}
