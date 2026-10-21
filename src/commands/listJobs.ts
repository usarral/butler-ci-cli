import { getAllJobsRecursive, JobTreeItem } from "../utils/jenkinsFolder";
import { logger } from "../utils/logger";
import { msg } from "../i18n";
import { icons } from "../utils/icons";
import { formatters } from "../utils/formatters";

export async function listJobs(options?: { showFolders?: boolean; maxLevel?: number }) {
  try {
    logger.info(`${icons.search} ${msg.list.fetching()}`);
    
    const items = await getAllJobsRecursive();
    
    if (items.length === 0) {
      logger.warn(formatters.warning(`${icons.warning} ${msg.list.none()}`));
      return;
    }
    
    // Filtrar por nivel máximo si se especifica
    const filteredItems = options?.maxLevel === undefined
      ? items
      : items.filter(item => item.level <= options.maxLevel!);
    
    // Filtrar carpetas si no se desean mostrar
    const displayItems = options?.showFolders === false 
      ? filteredItems.filter(item => item.type === 'job')
      : filteredItems;
    
    logger.info(`\n${icons.list} ${msg.list.structure()}`);
    logger.info("========================");
    
    for (const item of displayItems) {
      const indent = "  ".repeat(item.level);
      const icon = getItemIcon(item);
      const status = getJobStatus(item.color);
      const displayName = item.type === 'folder' 
        ? formatters.info(formatters.bold(item.name))
        : formatters.secondary(item.name);
      
      logger.info(`${indent}${icon} ${displayName}${status}`);
    }
    
    // Mostrar resumen
    const totalJobs = displayItems.filter(item => item.type === 'job').length;
    const totalFolders = displayItems.filter(item => item.type === 'folder').length;
    
    logger.info(`\n${icons.list} ${msg.labels.summary()}`);
    logger.info(`   ${msg.list.jobs({ count: formatters.success(totalJobs.toString()) })}`);
    if (options?.showFolders !== false) {
      logger.info(`   ${msg.list.folders({ count: formatters.info(totalFolders.toString()) })}`);
    }
    
  } catch (error: any) {
    logger.error(formatters.error(`${icons.error} ${msg.errors.generic()}: ${error.message}`));
  }
}

function getItemIcon(item: JobTreeItem): string {
  if (item.type === 'folder') {
    return icons.folder;
  }
  
  // Iconos según el estado del job
  switch (item.color) {
    case 'blue':
      return icons.success;
    case 'red':
      return icons.error;
    case 'yellow':
      return icons.warning;
    case 'grey':
    case 'disabled':
      return icons.disabled;
    case 'aborted':
      return icons.aborted;
    case 'blue_anime':
    case 'red_anime':
    case 'yellow_anime':
      return icons.running;
    default:
      return icons.circle;
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
