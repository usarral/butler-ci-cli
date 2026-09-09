import { findJobsByName } from "../utils/jenkinsFolder";
import { logger } from "../utils/logger";
import { messages as msg } from "../utils/messages";
import { formatters } from "../utils/formatters";
import chalk from "chalk";

export async function searchJobs(searchTerm: string) {
  try {
    logger.info(`${msg.icons.search} Buscando jobs que contengan: ${formatters.highlight(searchTerm)}`);
    
    const matchingJobs = await findJobsByName(searchTerm);
    
    if (matchingJobs.length === 0) {
      logger.warn(formatters.warning(`${msg.icons.warning} No se encontraron jobs que contengan "${searchTerm}".`));
      return;
    }
    
    logger.info(`\n${msg.icons.list} Jobs encontrados (${formatters.success(matchingJobs.length.toString())}):`);
    logger.info("==================================");
    
    for (const job of matchingJobs) {
      const indent = "  ".repeat(job.level);
      const status = getJobStatus(job.color);
      
      // Destacar el término de búsqueda en el nombre
      const highlightedName = highlightSearchTerm(job.name, searchTerm);
      const highlightedFullName = highlightSearchTerm(job.fullName, searchTerm);
      
      logger.info(`${indent}${msg.icons.circle} ${highlightedName}${status}`);
      
      if (job.fullName !== job.name) {
        logger.info(`${indent}   ${msg.icons.folder} ${formatters.secondary(highlightedFullName)}`);
      }
    }
    
    // Agrupar por carpetas padre si hay muchos resultados
    if (matchingJobs.length > 10) {
      logger.info(`\n${msg.icons.list} Resumen por carpetas:`);
      const folderGroups = groupJobsByParentFolder(matchingJobs);
      
      for (const [folder, count] of Object.entries(folderGroups)) {
        logger.info(`   ${msg.icons.folder} ${formatters.info(folder || "Raíz")}: ${formatters.success(count.toString())} jobs`);
      }
    }
    
  } catch (error: any) {
    logger.error(formatters.error(`${msg.icons.error} ${msg.errors.generic}: ${error.message}`));
  }
}

function getJobStatus(color?: string): string {
  if (!color) return "";
  
  switch (color) {
    case 'blue':
      return formatters.success(` ${msg.icons.check}`);
    case 'red':
      return formatters.error(` ${msg.icons.cross}`);
    case 'yellow':
      return formatters.warning(` ${msg.icons.unstable}`);
    case 'grey':
    case 'disabled':
      return formatters.secondary(` ${msg.icons.disabled}`);
    case 'aborted':
      return formatters.error(` ${msg.icons.aborted}`);
    case 'blue_anime':
      return formatters.info(` ${msg.icons.running}`);
    case 'red_anime':
      return formatters.error(` ${msg.icons.running}`);
    case 'yellow_anime':
      return formatters.warning(` ${msg.icons.running}`);
    default:
      return "";
  }
}

function highlightSearchTerm(text: string, searchTerm: string): string {
  const regex = new RegExp(`(${searchTerm})`, 'gi');
  return text.replace(regex, chalk.bgYellow.black('$1'));
}

function groupJobsByParentFolder(jobs: any[]): Record<string, number> {
  const groups: Record<string, number> = {};
  
  for (const job of jobs) {
    const parts = job.fullName.split('/');
    const parentFolder = parts.length > 1 ? parts.slice(0, -1).join('/') : '';
    groups[parentFolder] = (groups[parentFolder] || 0) + 1;
  }
  
  return groups;
}
