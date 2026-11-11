import { Command } from "commander";
import { complete, completionScript, Shell, SHELLS } from "../utils/completion";
import { logger } from "../utils/logger";
import { msg } from "../i18n";
import { icons } from "../utils/icons";
import { formatters } from "../utils/formatters";

export function setupCompletionCommands(program: Command): void {
  program
    .command("completion")
    .argument("<shell>", msg.completion.shellArg())
    .description(msg.completion.description())
    .action((shell: string) => {
      if (!SHELLS.includes(shell as Shell)) {
        logger.error(formatters.error(`${icons.error} ${msg.completion.unsupportedShell({ shell })}`));
        process.exitCode = 1;
        return;
      }
      process.stdout.write(completionScript(shell as Shell));
    });

  // Interno: lo invocan los scripts generados en cada TAB. Nunca debe escribir nada salvo candidatos.
  program
    .command("__complete", { hidden: true })
    .argument("[words...]")
    .option("--shell <shell>", "", "bash")
    .allowUnknownOption()
    .action((words: string[], options: { shell: string }) => {
      try {
        const shell = SHELLS.includes(options.shell as Shell) ? (options.shell as Shell) : "bash";
        const candidates = complete(program, words, shell);
        if (candidates.length > 0) process.stdout.write(candidates.join("\n") + "\n");
      } catch {
        // un fallo al completar no debe ensuciar la terminal del usuario
      }
    });
}
