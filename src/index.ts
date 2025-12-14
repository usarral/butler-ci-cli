#!/usr/bin/env node

import { Command } from "commander";
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
import { logger } from "./utils/logger";


const program = new Command();

program
  .name("butler-ci-cli")
  .description("CLI para interactuar con Pipelines Jenkins")
  .version("3.0.15");

// Comandos de configuración
setupConfigCommands(program);

// Comandos de jobs (nueva estructura)
setupJobsCommands(program);

// Helper function to create deprecated command aliases with warnings
function createDeprecatedAlias(
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

// Comandos deprecados (mantener compatibilidad hacia atrás)
createDeprecatedAlias(
  "job-info",
  "jobs info",
  jobInfo,
  {
    args: [{ name: "<jobName>", description: "Nombre del job (puede incluir carpetas: folder/subfolder/job)" }],
    description: "Obtener información detallada de un job (deprecado, usa 'jobs info')"
  }
);

createDeprecatedAlias(
  "job-params",
  "jobs params",
  jobParams,
  {
    args: [{ name: "<jobName>", description: "Nombre del job (puede incluir carpetas: folder/subfolder/job)" }],
    description: "Mostrar los parámetros requeridos por un job (deprecado, usa 'jobs params')"
  }
);

createDeprecatedAlias(
  "job-steps",
  "jobs steps",
  jobSteps,
  {
    args: [
      { name: "<jobName>", description: "Nombre del job (puede incluir carpetas: folder/subfolder/job)" },
      { name: "<buildNumber>", description: "Número del build o 'latest' para el más reciente" }
    ],
    description: "Mostrar los pasos (steps) de un build específico (deprecado, usa 'jobs steps')"
  }
);

createDeprecatedAlias(
  "last-build",
  "jobs last-build",
  lastBuild,
  {
    args: [{ name: "<jobName>", description: "Nombre del job (puede incluir carpetas: folder/subfolder/job)" }],
    description: "Obtener información del último build de un job (deprecado, usa 'jobs last-build')"
  }
);

createDeprecatedAlias(
  "build",
  "jobs build",
  build,
  {
    args: [{ name: "<jobName>", description: "Nombre del job (puede incluir carpetas: folder/subfolder/job)" }],
    options: [{ flags: "--params <params>", description: "Parámetros en formato key=value,key2=value2" }],
    description: "Ejecutar un build de forma asistida (deprecado, usa 'jobs build')"
  }
);

createDeprecatedAlias(
  "list-builds",
  "jobs list-builds",
  listBuilds,
  {
    args: [{ name: "<jobName>", description: "Nombre del job (puede incluir carpetas: folder/subfolder/job)" }],
    options: [
      { flags: "--status <status>", description: "Filtrar por estado (SUCCESS, FAILURE, UNSTABLE, ABORTED, RUNNING)" },
      { flags: "--branch <branch>", description: "Filtrar por rama" },
      { flags: "--since <date>", description: "Filtrar builds desde esta fecha (ISO 8601)" },
      { flags: "--until <date>", description: "Filtrar builds hasta esta fecha (ISO 8601)" },
      { flags: "--offset <number>", description: "Número de builds a omitir", parser: parseInt },
      { flags: "--limit <number>", description: "Número máximo de builds a mostrar", parser: parseInt, defaultValue: 50 },
      { flags: "--sort-by <field>", description: "Campo por el que ordenar (number, timestamp)", defaultValue: "number" },
      { flags: "--order <order>", description: "Orden de clasificación (asc, desc)", defaultValue: "desc" }
    ],
    description: "Listar builds de un job con opciones de filtrado y paginación (deprecado, usa 'jobs list-builds')"
  }
);

createDeprecatedAlias(
  "logs",
  "jobs logs",
  showLogs,
  {
    args: [
      { name: "<jobName>", description: "Nombre del job" },
      { name: "<buildNumber>", description: "Número del build o 'latest' para el más reciente" }
    ],
    options: [
      { flags: "-d, --download", description: "Descargar logs a archivo" },
      { flags: "-e, --editor", description: "Abrir logs en el editor configurado" },
      { flags: "-o, --output <path>", description: "Ruta de salida para el archivo de logs" },
      { flags: "-s, --stream", description: "Ver logs en tiempo real (streaming mode)" },
      { flags: "-i, --interval <seconds>", description: "Intervalo de actualización en segundos para streaming (default: 5)", parser: parseInt, defaultValue: 5 }
    ],
    description: "Ver logs de un build específico (deprecado, usa 'jobs logs')"
  }
);

// Comandos existentes de Jenkins (fetch-jobs, list-jobs, etc.)
program.command("fetch-jobs").action(fetchJobs);

program
  .command("list-jobs")
  .option("--folders", "Mostrar también las carpetas")
  .option("--max-level <level>", "Nivel máximo de profundidad a mostrar", parseInt)
  .action((options) => {
    listJobs({
      showFolders: options.folders !== false,
      maxLevel: options.maxLevel
    });
  });
program
  .command("show-folders")
  .option("--max-level <level>", "Nivel máximo de profundidad a mostrar", parseInt, 3)
  .description("Mostrar solo la estructura de carpetas de Jenkins")
  .action((options) => {
    showFolders({
      maxLevel: options.maxLevel
    });
  });

program
  .command("search-jobs")
  .argument("<searchTerm>", "Término de búsqueda")
  .description("Buscar jobs por nombre en toda la estructura de Jenkins")
  .action(searchJobs);

program.parse();
