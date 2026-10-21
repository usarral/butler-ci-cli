import inquirer from "inquirer";
import { configManager } from "../../utils/config";
import { logger } from "../../utils/logger";
import { msg } from "../../i18n";
import { icons } from "../../utils/icons";
import { formatters } from "../../utils/formatters";

export async function deleteConfig(name?: string): Promise<void> {
  const configs = configManager.listConfigs();
  
  if (configs.length === 0) {
    logger.warn(formatters.warning(`${icons.warning} No hay configuraciones para eliminar`));
    return;
  }

  let configToDelete = name;

  // Si no se especificó un nombre, mostrar lista para seleccionar
  if (!configToDelete) {
    const answers = await inquirer.prompt([
      {
        type: "list",
        name: "config",
        message: msg.prompts.selectConfigToDelete(),
        choices: configs,
      },
    ]);
    configToDelete = answers.config;
  }

  // Verificar que la configuración existe
  if (!configToDelete) {
    logger.error(formatters.error(`${icons.error} No se especificó configuración para eliminar`));
    return;
  }

  const config = configManager.loadConfig(configToDelete);
  if (!config) {
    logger.error(formatters.error(`${icons.error} ${msg.errors.configNotFound({ name: configToDelete })}`));
    return;
  }

  // Confirmación de eliminación
  const confirmation = await inquirer.prompt([
    {
      type: "confirm",
      name: "confirm",
      message: msg.prompts.confirmDelete({ name: configToDelete }),
      default: false,
    },
  ]);

  if (!confirmation.confirm) {
    logger.info(formatters.secondary("Operación cancelada"));
    return;
  }

  const success = configManager.deleteConfig(configToDelete);
  
  if (success) {
    logger.info(formatters.success(`${icons.success} ${msg.success.configDeleted({ name: configToDelete })}`));
    
    // Si era la configuración activa, informar al usuario
    const currentConfig = configManager.getCurrentConfig();
    if (!currentConfig) {
      logger.warn(formatters.warning(`${icons.warning} No hay configuración activa ahora`));
      if (configs.length > 1) { // Había más de una configuración
        logger.info(formatters.secondary(`${icons.info} ${msg.hints.activateConfig()}`));
      }
    }
  } else {
    logger.error(formatters.error(`${icons.error} Error eliminando la configuración '${configToDelete}'`));
  }
}