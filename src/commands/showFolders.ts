import { getFolderStructure } from "../utils/jenkinsFolder";
import { logger } from "../utils/logger";
import { messages as msg } from "../utils/messages";
import { formatters } from "../utils/formatters";

export async function showFolders(options?: { maxLevel?: number }) {
  try {
    const maxLevel = options?.maxLevel || 3;
    logger.info(`${msg.icons.search} Mostrando estructura de carpetas (máximo ${maxLevel} niveles)...`);
    
    const items = await getFolderStructure(maxLevel);
    const folders = items.filter(item => item.type === 'folder');
    
    if (folders.length === 0) {
      logger.warn(formatters.warning(`${msg.icons.warning} No se encontraron carpetas en Jenkins.`));
      return;
    }
    
    logger.info(`\n${msg.icons.folder} Estructura de Carpetas:`);
    logger.info("===========================");
    
    for (const folder of folders) {
      const indent = "  ".repeat(folder.level);
      logger.info(`${indent}${msg.icons.folder} ${formatters.info(formatters.bold(folder.name))}`);
      logger.info(`${indent}   ${msg.icons.location} ${formatters.secondary(folder.fullName)}`);
    }
    
    logger.info(`\n${msg.icons.list} Total de carpetas: ${formatters.success(folders.length.toString())}`);
    
    // Mostrar estadísticas por nivel
    const levelStats: Record<number, number> = {};
    for (const folder of folders) {
      levelStats[folder.level] = (levelStats[folder.level] || 0) + 1;
    }
    
    logger.info(`\n${msg.icons.chart} Distribución por niveles:`);
    for (const [level, count] of Object.entries(levelStats)) {
      const levelName = level === '0' ? 'Raíz' : `Nivel ${level}`;
      logger.info(`   ${levelName}: ${formatters.success(count.toString())} carpetas`);
    }
    
  } catch (error: any) {
    logger.error(formatters.error(`${msg.icons.error} ${msg.errors.generic}: ${error.message}`));
  }
}
