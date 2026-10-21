import { Command } from "commander";
import { createConfig } from "./create";
import { listConfigs } from "./list";
import { useConfig } from "./use";
import { deleteConfig } from "./delete";
import { showCurrentConfig } from "./current";
import { editConfigPreferences } from "./edit";
import { msg } from "../../i18n";

export function setupConfigCommands(program: Command): void {
  const configCommand = program
    .command("config")
    .description(msg.config.command.description());

  configCommand
    .command("create")
    .description(msg.config.command.create())
    .action(createConfig);

  configCommand
    .command("list")
    .alias("ls")
    .description(msg.config.command.list())
    .action(listConfigs);

  configCommand
    .command("use")
    .argument("<name>", msg.config.command.useName())
    .description(msg.config.command.use())
    .action(useConfig);

  configCommand
    .command("delete")
    .alias("rm")
    .argument("[name]", msg.config.command.deleteName())
    .description(msg.config.command.delete())
    .action(deleteConfig);

  configCommand
    .command("current")
    .description(msg.config.command.current())
    .action(showCurrentConfig);

  configCommand
    .command("edit")
    .argument("[name]", msg.config.command.editName())
    .description(msg.config.command.edit())
    .action(editConfigPreferences);
}