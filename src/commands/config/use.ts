import { configManager } from "../../utils/config";
import { logger } from "../../utils/logger";
import { msg } from "../../i18n";
import { icons } from "../../utils/icons";
import { formatters } from "../../utils/formatters";

export async function useConfig(name: string): Promise<void> {
  if (!name) {
    logger.error(formatters.error(`${icons.error} Debes especificar el nombre de la configuración`));
    logger.info(formatters.secondary(`${icons.info} Uso: butler-ci-cli config use <nombre>`));
    return;
  }

  const config = configManager.loadConfig(name);
  
  if (!config) {
    logger.error(formatters.error(`${icons.error} ${msg.errors.configNotFound({ name })}`));
    logger.info(formatters.secondary(`${icons.info} Usa 'butler-ci-cli config list' para ver las disponibles`));
    return;
  }

  const success = configManager.setCurrentConfig(name);
  
  if (success) {
    logger.info(formatters.success(`${icons.success} ${msg.success.configActivated({ name })}`));
    logger.info(formatters.secondary(`${icons.location} Servidor: ${config.url}`));
    logger.info(formatters.secondary(`${icons.user} Usuario: ${config.username}`));
  } else {
    logger.error(formatters.error(`${icons.error} Error estableciendo la configuración '${name}' como activa`));
  }
}