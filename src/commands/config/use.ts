import { configManager } from "../../utils/config";
import { logger } from "../../utils/logger";
import { msg } from "../../i18n";
import { icons } from "../../utils/icons";
import { formatters } from "../../utils/formatters";

export async function useConfig(name: string): Promise<void> {
  if (!name) {
    logger.error(formatters.error(`${icons.error} ${msg.config.use.nameRequired()}`));
    logger.info(formatters.secondary(`${icons.info} ${msg.config.use.usage()}`));
    return;
  }

  const config = configManager.loadConfig(name);
  
  if (!config) {
    logger.error(formatters.error(`${icons.error} ${msg.errors.configNotFound({ name })}`));
    logger.info(formatters.secondary(`${icons.info} ${msg.hints.listConfigs()}`));
    return;
  }

  const success = configManager.setCurrentConfig(name);
  
  if (success) {
    logger.info(formatters.success(`${icons.success} ${msg.success.configActivated({ name })}`));
    logger.info(formatters.secondary(`${icons.location} ${msg.config.use.server({ url: config.url })}`));
    logger.info(formatters.secondary(`${icons.user} ${msg.config.use.user({ username: config.username })}`));
  } else {
    logger.error(formatters.error(`${icons.error} ${msg.config.use.failed({ name })}`));
  }
}