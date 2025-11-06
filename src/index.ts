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
import { setupConfigCommands } from "./commands/config";


const program = new Command();

program
  .name("butler-ci-cli")
  .description("CLI para interactuar con Pipelines Jenkins")
  .version("3.0.10");

// Comandos de configuración
setupConfigCommands(program);

// Comandos existentes de Jenkins
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

program
  .command("job-info")
  .argument("<jobName>", "Nombre del job (puede incluir carpetas: folder/subfolder/job)")
  .action(jobInfo);

program
  .command("last-build")
  .argument("<jobName>", "Nombre del job (puede incluir carpetas: folder/subfolder/job)")
  .action(lastBuild);

program
  .command("job-params")
  .argument("<jobName>", "Nombre del job (puede incluir carpetas: folder/subfolder/job)")
  .description("Mostrar los parámetros requeridos por un job")
  .action(jobParams);

program
  .command("build")
  .argument("<jobName>", "Nombre del job (puede incluir carpetas: folder/subfolder/job)")
  .option("--params <params>", "Parámetros en formato key=value,key2=value2")
  .description("Ejecutar un build de forma asistida")
  .action(build);

program
  .command("logs")
  .argument("<jobName>", "Nombre del job")
  .argument("<buildNumber>", "Número del build o 'latest' para el más reciente")
  .option("-d, --download", "Descargar logs a archivo")
  .option("-e, --editor", "Abrir logs en el editor configurado")
  .option("-o, --output <path>", "Ruta de salida para el archivo de logs")
  .option("-s, --stream", "Ver logs en tiempo real (streaming mode)")
  .option("-i, --interval <seconds>", "Intervalo de actualización en segundos para streaming (default: 5)", parseInt, 5)
  .description("Ver logs de un build específico")
  .action(showLogs);

program
  .command("list-builds")
  .argument("<jobName>", "Nombre del job (puede incluir carpetas: folder/subfolder/job)")
  .option("--status <status>", "Filtrar por estado (SUCCESS, FAILURE, UNSTABLE, ABORTED, RUNNING)")
  .option("--branch <branch>", "Filtrar por rama")
  .option("--since <date>", "Filtrar builds desde esta fecha (ISO 8601)")
  .option("--until <date>", "Filtrar builds hasta esta fecha (ISO 8601)")
  .option("--offset <number>", "Número de builds a omitir", parseInt)
  .option("--limit <number>", "Número máximo de builds a mostrar", parseInt, 50)
  .option("--sort-by <field>", "Campo por el que ordenar (number, timestamp)", "number")
  .option("--order <order>", "Orden de clasificación (asc, desc)", "desc")
  .description("Listar builds de un job con opciones de filtrado y paginación")
  .action(listBuilds);

program.parse();
