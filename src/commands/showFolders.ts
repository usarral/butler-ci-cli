import { getFolderStructure } from "../utils/jenkinsFolder";
import { logger } from "../utils/logger";
import { msg } from "../i18n";
import { icons } from "../utils/icons";
import { formatters } from "../utils/formatters";

export async function showFolders(options?: { maxLevel?: number }) {
  try {
    const maxLevel = options?.maxLevel || 3;
    logger.info(`${icons.search} ${msg.folders.showing({ levels: maxLevel })}`);
    
    const items = await getFolderStructure(maxLevel);
    const folders = items.filter(item => item.type === 'folder');
    
    if (folders.length === 0) {
      logger.warn(formatters.warning(`${icons.warning} ${msg.folders.none()}`));
      return;
    }
    
    logger.info(`\n${icons.folder} ${msg.folders.structure()}`);
    logger.info("===========================");
    
    for (const folder of folders) {
      const indent = "  ".repeat(folder.level);
      logger.info(`${indent}${icons.folder} ${formatters.info(formatters.bold(folder.name))}`);
      logger.info(`${indent}   ${icons.location} ${formatters.secondary(folder.fullName)}`);
    }
    
    logger.info(`\n${icons.list} ${msg.folders.total({ count: formatters.success(folders.length.toString()) })}`);
    
    // Mostrar estadísticas por nivel
    const levelStats: Record<number, number> = {};
    for (const folder of folders) {
      levelStats[folder.level] = (levelStats[folder.level] || 0) + 1;
    }
    
    logger.info(`\n${icons.chart} ${msg.folders.byLevel()}`);
    for (const [level, count] of Object.entries(levelStats)) {
      const levelName = level === '0' ? msg.folders.root() : msg.folders.level({ level });
      logger.info(`   ${msg.folders.levelCount({ name: levelName, count: formatters.success(count.toString()) })}`);
    }
    
  } catch (error: any) {
    logger.error(formatters.error(`${icons.error} ${msg.errors.generic()}: ${error.message}`));
  }
}
