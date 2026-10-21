import { configManager } from "../../utils/config";
import { logger } from "../../utils/logger";
import { msg } from "../../i18n";
import { icons } from "../../utils/icons";
import { formatters } from "../../utils/formatters";

export async function showCurrentConfig(): Promise<void> {
  const currentConfigName = configManager.getCurrentConfig();
  
  if (!currentConfigName) {
    logger.error(formatters.error(`${icons.error} No hay configuración activa`));
    logger.info(formatters.secondary(`${icons.info} Usa 'butler-ci-cli config list' para ver las disponibles`));
    return;
  }

  const config = configManager.loadConfig(currentConfigName);
  
  if (!config) {
    logger.error(formatters.error(`${icons.error} Error: configuración activa '${currentConfigName}' no encontrada`));
    return;
  }

  logger.info(formatters.info(`${icons.target} Configuración activa\n`));
  logger.info(`${formatters.success(icons.dotActive)} ${formatters.highlight(config.name)}`);
  logger.info(`   ${icons.location} ${config.url}`);
  logger.info(`   ${icons.user} ${config.username}`);
  logger.info(`   ${icons.key} Token: ${"*".repeat(Math.min(config.token.length, 20))}`);
  if (config.description) {
    logger.info(`   ${icons.description} ${config.description}`);
  }
  
  logger.info(formatters.secondary(`\n${icons.folder} Ubicación: ${configManager.getConfigDir()}`));
}