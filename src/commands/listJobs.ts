import { getAllJobsRecursive, JobTreeItem } from "../utils/jenkinsFolder";
import { logger } from "../utils/logger";
import { messages as msg } from "../utils/messages";
import { formatters } from "../utils/formatters";

export async function listJobs(options?: { showFolders?: boolean; maxLevel?: number }) {
  try {
    logger.info(`${msg.icons.search} Obteniendo estructura de Jenkins...`);
    
    const items = await getAllJobsRecursive();
    
    if (items.length === 0) {
      logger.warn(formatters.warning(`${msg.icons.warning} No se encontraron jobs o carpetas.`));
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
    
    logger.info(`\n${msg.icons.list} Estructura de Jenkins:`);
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
    
    logger.info(`\n${msg.icons.list} Resumen:`);
    logger.info(`   Jobs: ${formatters.success(totalJobs.toString())}`);
    if (options?.showFolders !== false) {
      logger.info(`   Carpetas: ${formatters.info(totalFolders.toString())}`);
    }
    
  } catch (error: any) {
    logger.error(formatters.error(`${msg.icons.error} ${msg.errors.generic}: ${error.message}`));
  }
}

function getItemIcon(item: JobTreeItem): string {
  if (item.type === 'folder') {
    return msg.icons.folder;
  }
  
  // Iconos según el estado del job
  switch (item.color) {
    case 'blue':
      return msg.icons.success;
    case 'red':
      return msg.icons.error;
    case 'yellow':
      return msg.icons.warning;
    case 'grey':
    case 'disabled':
      return msg.icons.disabled;
    case 'aborted':
      return msg.icons.aborted;
    case 'blue_anime':
    case 'red_anime':
    case 'yellow_anime':
      return msg.icons.running;
    default:
      return msg.icons.circle;
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
