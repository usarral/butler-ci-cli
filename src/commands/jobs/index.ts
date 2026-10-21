import { Command } from "commander";
import { msg } from "../../i18n";
import { jobInfo } from "../jobInfo";
import { jobParams } from "../jobParams";
import { jobSteps } from "../jobSteps";
import { lastBuild } from "../lastBuild";
import { build } from "../build";
import { listBuilds } from "../listBuilds";
import { showLogs } from "../logs";
import { abort } from "../abort";

export function setupJobsCommands(program: Command): void {
  const jobsCommand = program
    .command("jobs")
    .description(msg.cli.jobsDescription());

  jobsCommand
    .command("info")
    .argument("<jobName>", msg.cli.arg.jobName())
    .description(msg.cli.commands.info())
    .action(jobInfo);

  jobsCommand
    .command("params")
    .argument("<jobName>", msg.cli.arg.jobName())
    .description(msg.cli.commands.params())
    .action(jobParams);

  jobsCommand
    .command("steps")
    .argument("<jobName>", msg.cli.arg.jobName())
    .argument("<buildNumber>", msg.cli.arg.buildNumber())
    .description(msg.cli.commands.steps())
    .action(jobSteps);

  jobsCommand
    .command("last-build")
    .argument("<jobName>", msg.cli.arg.jobName())
    .description(msg.cli.commands.lastBuild())
    .action(lastBuild);

  jobsCommand
    .command("build")
    .argument("<jobName>", msg.cli.arg.jobName())
    .option("--params <params>", msg.cli.options.params())
    .description(msg.cli.commands.build())
    .action(build);

  jobsCommand
    .command("list-builds")
    .argument("<jobName>", msg.cli.arg.jobName())
    .option("--status <status>", msg.cli.options.status())
    .option("--branch <branch>", msg.cli.options.branch())
    .option("--since <date>", msg.cli.options.since())
    .option("--until <date>", msg.cli.options.until())
    .option("--offset <number>", msg.cli.options.offset(), parseInt)
    .option("--limit <number>", msg.cli.options.limit(), parseInt, 50)
    .option("--sort-by <field>", msg.cli.options.sortBy(), "number")
    .option("--order <order>", msg.cli.options.order(), "desc")
    .description(msg.cli.commands.listBuilds())
    .action(listBuilds);

  jobsCommand
    .command("logs")
    .argument("<jobName>", msg.cli.arg.jobNameShort())
    .argument("<buildNumber>", msg.cli.arg.buildNumber())
    .option("-d, --download", msg.cli.options.download())
    .option("-e, --editor", msg.cli.options.editor())
    .option("-o, --output <path>", msg.cli.options.output())
    .option("-s, --stream", msg.cli.options.stream())
    .option("-i, --interval <seconds>", msg.cli.options.interval(), parseInt, 5)
    .description(msg.cli.commands.logs())
    .action(showLogs);

  jobsCommand
    .command("abort")
    .argument("<jobName>", msg.cli.arg.jobName())
    .argument("<buildNumber>", msg.cli.arg.buildNumber())
    .option("-y, --yes", msg.cli.options.yes())
    .description(msg.cli.commands.abort())
    .action(abort);
}
