import { configManager } from "../../utils/config";
import { logger } from "../../utils/logger";
import { msg } from "../../i18n";
import { icons } from "../../utils/icons";
import { formatters } from "../../utils/formatters";

export async function listConfigs(): Promise<void> {
  logger.info(formatters.info(`${icons.list} ${msg.config.list.title()}\n`));

  const configs = configManager.listConfigs();
  const currentConfig = configManager.getCurrentConfig();

  if (configs.length === 0) {
    logger.warn(formatters.warning(`${icons.warning} ${msg.config.list.none()}`));
    logger.info(formatters.secondary(`${icons.info} ${msg.hints.createConfig()}`));
    return;
  }

  for (const configName of configs) {
    const config = configManager.loadConfig(configName);
    const isActive = configName === currentConfig;
    
    if (config) {
      const status = isActive ? formatters.success(`${icons.dotActive} ${msg.config.list.activeBadge()}`) : formatters.secondary(icons.dotInactive);
      logger.info(`${status} ${formatters.highlight(configName)}`);
      logger.info(`   ${icons.location} ${config.url}`);
      logger.info(`   ${icons.user} ${config.username}`);
      if (config.description) {
        logger.info(`   ${icons.description} ${config.description}`);
      }
      logger.info('');
    }
  }

  if (!currentConfig) {
    logger.warn(formatters.warning(`${icons.warning} ${msg.config.list.noActive()}`));
    logger.info(formatters.secondary(`${icons.info} ${msg.hints.activateConfig()}`));
  }

  logger.info(formatters.secondary(`${icons.folder} ${msg.labels.location()} ${configManager.getConfigDir()}`));
}