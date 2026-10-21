#!/usr/bin/env node

import { Command } from "commander";
import { msg } from "./i18n";
import { fetchJobs } from "./commands/fetchJobs";
import { listJobs } from "./commands/listJobs";
import { jobInfo } from "./commands/jobInfo";
import { lastBuild } from "./commands/lastBuild";
import { searchJobs } from "./commands/searchJobs";
import { showFolders } from "./commands/showFolders";
import { jobParams } from "./commands/jobParams";
import { build } from "./commands/build";
import { showLogs } from "./commands/logs";
import { listBuilds } from "./commands/listBuilds";
import { jobSteps } from "./commands/jobSteps";
import { setupConfigCommands } from "./commands/config";
import { setupJobsCommands } from "./commands/jobs";
import { createDeprecatedAlias } from "./utils/deprecatedCommands";
import { setupUpdateCheck } from "./utils/updateCheck";
import { enableDebug, startDebugSession } from "./utils/debug";


const program = new Command();

program
  .name("butler-ci-cli")
  .description(msg.cli.description())
  .version("3.9.0");

program
  .option("--debug", "Print diagnostic output to stderr (HTTP requests and responses, error causes). Also enabled with BUTLER_DEBUG=1")
  .hook("preAction", (_thisCommand, actionCommand) => {
    if (program.opts().debug) enableDebug();
    const path: string[] = [];
    for (let cmd: Command | null = actionCommand; cmd && cmd.parent; cmd = cmd.parent) path.unshift(cmd.name());
    startDebugSession(program.version() as string, path.join(" "));
  });

// Comandos de configuración
setupConfigCommands(program);

// Comandos de jobs (nueva estructura)
setupJobsCommands(program);

program
  .command("mcp")
  .description(msg.cli.commands.mcp())
  .option("--read-only", msg.cli.options.readOnly())
  .option("--enable-create-config", msg.cli.options.enableCreateConfig())
  .option("--context <text>", msg.cli.options.context())
  .option("--context-file <path>", msg.cli.options.contextFile())
  .action(async (options) => {
    const { startMcpServer } = await import("./mcp/server");
    await startMcpServer({
      readOnly: Boolean(options.readOnly),
      allowCreateConfig: Boolean(options.enableCreateConfig),
      context: options.context,
      contextFile: options.contextFile,
    });
  });

// Comandos deprecados (mantener compatibilidad hacia atrás)
createDeprecatedAlias(
  program,
  "job-info",
  "jobs info",
  jobInfo,
  {
    args: [{ name: "<jobName>", description: msg.cli.arg.jobName() }],
    description: msg.cli.deprecated({ description: msg.cli.commands.info(), command: "jobs info" })
  }
);

createDeprecatedAlias(
  program,
  "job-params",
  "jobs params",
  jobParams,
  {
    args: [{ name: "<jobName>", description: msg.cli.arg.jobName() }],
    description: msg.cli.deprecated({ description: msg.cli.commands.params(), command: "jobs params" })
  }
);

createDeprecatedAlias(
  program,
  "job-steps",
  "jobs steps",
  jobSteps,
  {
    args: [
      { name: "<jobName>", description: msg.cli.arg.jobName() },
      { name: "<buildNumber>", description: msg.cli.arg.buildNumber() }
    ],
    description: msg.cli.deprecated({ description: msg.cli.commands.steps(), command: "jobs steps" })
  }
);

createDeprecatedAlias(
  program,
  "last-build",
  "jobs last-build",
  lastBuild,
  {
    args: [{ name: "<jobName>", description: msg.cli.arg.jobName() }],
    description: msg.cli.deprecated({ description: msg.cli.commands.lastBuild(), command: "jobs last-build" })
  }
);

createDeprecatedAlias(
  program,
  "build",
  "jobs build",
  build,
  {
    args: [{ name: "<jobName>", description: msg.cli.arg.jobName() }],
    options: [{ flags: "--params <params>", description: msg.cli.options.params() }],
    description: msg.cli.deprecated({ description: msg.cli.commands.build(), command: "jobs build" })
  }
);

createDeprecatedAlias(
  program,
  "list-builds",
  "jobs list-builds",
  listBuilds,
  {
    args: [{ name: "<jobName>", description: msg.cli.arg.jobName() }],
    options: [
      { flags: "--status <status>", description: msg.cli.options.status() },
      { flags: "--branch <branch>", description: msg.cli.options.branch() },
      { flags: "--since <date>", description: msg.cli.options.since() },
      { flags: "--until <date>", description: msg.cli.options.until() },
      { flags: "--offset <number>", description: msg.cli.options.offset(), parser: parseInt },
      { flags: "--limit <number>", description: msg.cli.options.limit(), parser: parseInt, defaultValue: 50 },
      { flags: "--sort-by <field>", description: msg.cli.options.sortBy(), defaultValue: "number" },
      { flags: "--order <order>", description: msg.cli.options.order(), defaultValue: "desc" }
    ],
    description: msg.cli.deprecated({ description: msg.cli.commands.listBuilds(), command: "jobs list-builds" })
  }
);

createDeprecatedAlias(
  program,
  "logs",
  "jobs logs",
  showLogs,
  {
    args: [
      { name: "<jobName>", description: msg.cli.arg.jobNameShort() },
      { name: "<buildNumber>", description: msg.cli.arg.buildNumber() }
    ],
    options: [
      { flags: "-d, --download", description: msg.cli.options.download() },
      { flags: "-e, --editor", description: msg.cli.options.editor() },
      { flags: "-o, --output <path>", description: msg.cli.options.output() },
      { flags: "-s, --stream", description: msg.cli.options.stream() },
      { flags: "-i, --interval <seconds>", description: msg.cli.options.interval(), parser: parseInt, defaultValue: 5 }
    ],
    description: msg.cli.deprecated({ description: msg.cli.commands.logs(), command: "jobs logs" })
  }
);

// Comandos existentes de Jenkins (fetch-jobs, list-jobs, etc.)
program.command("fetch-jobs").action(fetchJobs);

program
  .command("list-jobs")
  .option("--folders", msg.cli.options.folders())
  .option("--max-level <level>", msg.cli.options.maxLevel(), parseInt)
  .action((options) => {
    listJobs({
      showFolders: options.folders !== false,
      maxLevel: options.maxLevel
    });
  });
program
  .command("show-folders")
  .option("--max-level <level>", msg.cli.options.maxLevel(), parseInt, 3)
  .description(msg.cli.commands.showFolders())
  .action((options) => {
    showFolders({
      maxLevel: options.maxLevel
    });
  });

program
  .command("search-jobs")
  .argument("<searchTerm>", msg.cli.arg.searchTerm())
  .description(msg.cli.commands.searchJobs())
  .action(searchJobs);

setupUpdateCheck(program.version() as string);

program.parse();
