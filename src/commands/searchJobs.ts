import { findJobsByName } from "../utils/jenkinsFolder";
import { logger } from "../utils/logger";
import { msg } from "../i18n";
import { icons } from "../utils/icons";
import { formatters } from "../utils/formatters";
import chalk from "chalk";

export async function searchJobs(searchTerm: string) {
  try {
    logger.info(`${icons.search} ${msg.search.searching({ term: formatters.highlight(searchTerm) })}`);
    
    const matchingJobs = await findJobsByName(searchTerm);
    
    if (matchingJobs.length === 0) {
      logger.warn(formatters.warning(`${icons.warning} ${msg.search.none({ term: searchTerm })}`));
      return;
    }
    
    logger.info(`\n${icons.list} ${msg.search.found({ count: formatters.success(matchingJobs.length.toString()) })}`);
    logger.info("==================================");
    
    for (const job of matchingJobs) {
      const indent = "  ".repeat(job.level);
      const status = getJobStatus(job.color);
      
      // Destacar el término de búsqueda en el nombre
      const highlightedName = highlightSearchTerm(job.name, searchTerm);
      const highlightedFullName = highlightSearchTerm(job.fullName, searchTerm);
      
      logger.info(`${indent}${icons.circle} ${highlightedName}${status}`);
      
      if (job.fullName !== job.name) {
        logger.info(`${indent}   ${icons.folder} ${formatters.secondary(highlightedFullName)}`);
      }
    }
    
    // Agrupar por carpetas padre si hay muchos resultados
    if (matchingJobs.length > 10) {
      logger.info(`\n${icons.list} ${msg.search.byFolder()}`);
      const folderGroups = groupJobsByParentFolder(matchingJobs);
      
      for (const [folder, count] of Object.entries(folderGroups)) {
        logger.info(`   ${icons.folder} ${msg.search.folderCount({ folder: formatters.info(folder || msg.search.root()), count: formatters.success(count.toString()) })}`);
      }
    }
    
  } catch (error: any) {
    logger.error(formatters.error(`${icons.error} ${msg.errors.generic()}: ${error.message}`));
  }
}

function getJobStatus(color?: string): string {
  if (!color) return "";
  
  switch (color) {
    case 'blue':
      return formatters.success(` ${icons.check}`);
    case 'red':
      return formatters.error(` ${icons.cross}`);
    case 'yellow':
      return formatters.warning(` ${icons.unstable}`);
    case 'grey':
    case 'disabled':
      return formatters.secondary(` ${icons.disabled}`);
    case 'aborted':
      return formatters.error(` ${icons.aborted}`);
    case 'blue_anime':
      return formatters.info(` ${icons.running}`);
    case 'red_anime':
      return formatters.error(` ${icons.running}`);
    case 'yellow_anime':
      return formatters.warning(` ${icons.running}`);
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
