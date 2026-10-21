import inquirer from "inquirer";
import { configManager, JenkinsConfig } from "../../utils/config";
import { logger } from "../../utils/logger";
import { msg } from "../../i18n";
import { icons } from "../../utils/icons";
import { formatters } from "../../utils/formatters";

export async function createConfig(): Promise<void> {
  logger.info(formatters.info(`${icons.gear} ${msg.config.create.title()}\n`));

  const answers = await inquirer.prompt([
    {
      type: "input",
      name: "name",
      message: msg.prompts.configName(),
      validate: (input) => {
        if (!input.trim()) {
          return msg.config.create.nameRequired();
        }
        if (configManager.listConfigs().includes(input.trim())) {
          return msg.config.create.nameExists();
        }
        return true;
      },
    },
    {
      type: "input",
      name: "url",
      message: msg.prompts.jenkinsUrl(),
      validate: (input) => {
        if (!input.trim()) {
          return msg.config.create.urlRequired();
        }
        try {
          new URL(input.trim());
          return true;
        } catch {
          return msg.config.create.urlInvalid();
        }
      },
    },
    {
      type: "input",
      name: "username",
      message: msg.prompts.username(),
      validate: (input) => input.trim() ? true : msg.config.create.userRequired(),
    },
    {
      type: "password",
      name: "token",
      message: msg.prompts.token(),
      validate: (input) => input.trim() ? true : msg.config.create.tokenRequired(),
    },
    {
      type: "input",
      name: "description",
      message: msg.prompts.description(),
    },
    {
      type: "confirm",
      name: "setAsCurrent",
      message: msg.prompts.setAsActive(),
      default: true,
    },
  ]);

  const config: JenkinsConfig = {
    name: answers.name.trim(),
    url: answers.url.trim(),
    username: answers.username.trim(),
    token: answers.token.trim(),
    description: answers.description?.trim() || undefined,
  };

  try {
    configManager.saveConfig(config);
    logger.info(formatters.success(`${icons.success} ${msg.success.configCreated({ name: config.name })}`));

    if (answers.setAsCurrent) {
      configManager.setCurrentConfig(config.name);
      logger.info(formatters.success(`${icons.success} ${msg.success.configActivated({ name: config.name })}`));
    }

    logger.info(formatters.secondary(`${icons.folder} ${msg.config.create.savedAt({ dir: configManager.getConfigDir() })}`));
  } catch (error) {
    logger.error(formatters.error(`${icons.error} ${msg.config.create.failed({ error: String(error) })}`));
  }
}