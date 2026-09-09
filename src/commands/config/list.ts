import { configManager } from "../../utils/config";
import { logger } from "../../utils/logger";
import { messages as msg } from "../../utils/messages";
import { formatters } from "../../utils/formatters";

export async function listConfigs(): Promise<void> {
  logger.info(formatters.info(`${msg.icons.list} Configuraciones de Jenkins disponibles\n`));

  const configs = configManager.listConfigs();
  const currentConfig = configManager.getCurrentConfig();

  if (configs.length === 0) {
    logger.warn(formatters.warning(`${msg.icons.warning} No hay configuraciones guardadas`));
    logger.info(formatters.secondary(`${msg.icons.info} ${msg.hints.createConfig}`));
    return;
  }

  for (const configName of configs) {
    const config = configManager.loadConfig(configName);
    const isActive = configName === currentConfig;
    
    if (config) {
      const status = isActive ? formatters.success(`${msg.icons.dotActive} ACTIVA`) : formatters.secondary(msg.icons.dotInactive);
      logger.info(`${status} ${formatters.highlight(configName)}`);
      logger.info(`   ${msg.icons.location} ${config.url}`);
      logger.info(`   ${msg.icons.user} ${config.username}`);
      if (config.description) {
        logger.info(`   ${msg.icons.description} ${config.description}`);
      }
      logger.info('');
    }
  }

  if (!currentConfig) {
    logger.warn(formatters.warning(`${msg.icons.warning} No hay ninguna configuración activa`));
    logger.info(formatters.secondary(`${msg.icons.info} ${msg.hints.activateConfig}`));
  }

  logger.info(formatters.secondary(`${msg.icons.folder} Ubicación: ${configManager.getConfigDir()}`));
}