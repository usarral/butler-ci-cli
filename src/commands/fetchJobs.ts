import { getAllJobs } from "../utils/jenkinsFolder";
import { saveJobs } from "../utils/storage";
import { logger } from "../utils/logger";
import { messages as msg } from "../utils/messages";
import { formatters } from "../utils/formatters";

export async function fetchJobs() {
  try {
    logger.info(`${msg.icons.search} ${msg.info.fetchingJobs}`);
    
    const jobItems = await getAllJobs();
    const jobNames = jobItems.map(job => job.fullName);
    
    await saveJobs(jobNames);
    
    logger.info(formatters.success(`${msg.icons.success} ${msg.success.jobsFetched(jobNames.length)}`));
    
    // Mostrar algunos ejemplos de lo que se encontró
    if (jobNames.length > 0) {
      logger.info(`\n${msg.icons.list} Ejemplos de jobs encontrados:`);
      const examples = jobNames.slice(0, 5);
      for (const name of examples) {
        const parts = name.split('/');
        if (parts.length > 1) {
          logger.info(`   ${msg.icons.folder} ${formatters.info(parts.slice(0, -1).join('/'))} ${msg.icons.arrow} ${formatters.secondary(parts[parts.length - 1])}`);
        } else {
          logger.info(`   ${msg.icons.circle} ${formatters.secondary(name)}`);
        }
      }
      
      if (jobNames.length > 5) {
        logger.info(`   ... y ${jobNames.length - 5} más`);
      }
    }
    
  } catch (error: any) {
    logger.error(formatters.error(`${msg.icons.error} ${msg.errors.generic}: ${error.message}`));
  }
}
