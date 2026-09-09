import { configManager } from "../../utils/config";
import { logger } from "../../utils/logger";
import { messages as msg } from "../../utils/messages";
import { formatters } from "../../utils/formatters";

export async function showCurrentConfig(): Promise<void> {
  const currentConfigName = configManager.getCurrentConfig();
  
  if (!currentConfigName) {
    logger.error(formatters.error(`${msg.icons.error} No hay configuración activa`));
    logger.info(formatters.secondary(`${msg.icons.info} Usa 'butler-ci-cli config list' para ver las disponibles`));
    return;
  }

  const config = configManager.loadConfig(currentConfigName);
  
  if (!config) {
    logger.error(formatters.error(`${msg.icons.error} Error: configuración activa '${currentConfigName}' no encontrada`));
    return;
  }

  logger.info(formatters.info(`${msg.icons.target} Configuración activa\n`));
  logger.info(`${formatters.success(msg.icons.dotActive)} ${formatters.highlight(config.name)}`);
  logger.info(`   ${msg.icons.location} ${config.url}`);
  logger.info(`   ${msg.icons.user} ${config.username}`);
  logger.info(`   ${msg.icons.key} Token: ${"*".repeat(Math.min(config.token.length, 20))}`);
  if (config.description) {
    logger.info(`   ${msg.icons.description} ${config.description}`);
  }
  
  logger.info(formatters.secondary(`\n${msg.icons.folder} Ubicación: ${configManager.getConfigDir()}`));
}