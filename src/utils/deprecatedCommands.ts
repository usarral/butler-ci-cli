import { Command } from "commander";
import { logger } from "./logger";

/**
 * Creates a deprecated command alias that shows a warning message when used.
 * 
 * @param program - The Commander program instance
 * @param commandName - The name of the deprecated command
 * @param newCommand - The name of the new command to suggest
 * @param action - The action function to execute
 * @param options - Optional configuration for arguments, options, and description
 */
export function createDeprecatedAlias(
  program: Command,
  commandName: string,
  newCommand: string,
  action: (...args: any[]) => void | Promise<void>,
  options?: {
    args?: Array<{ name: string; description: string }>;
    options?: Array<{ flags: string; description: string; defaultValue?: any; parser?: (value: string) => any }>;
    description?: string;
  }
): void {
  const cmd = program.command(commandName);
  
  if (options?.args) {
    options.args.forEach(arg => {
      cmd.argument(arg.name, arg.description);
    });
  }
  
  if (options?.options) {
    options.options.forEach(opt => {
      if (opt.parser) {
        cmd.option(opt.flags, opt.description, opt.parser, opt.defaultValue);
      } else if (opt.defaultValue !== undefined) {
        cmd.option(opt.flags, opt.description, opt.defaultValue);
      } else {
        cmd.option(opt.flags, opt.description);
      }
    });
  }
  
  if (options?.description) {
    cmd.description(options.description);
  }
  
  cmd.action((...args: any[]) => {
    logger.warn(`⚠️  El comando '${commandName}' está deprecado. Por favor usa '${newCommand}' en su lugar.`);
    return action(...args);
  });
}
