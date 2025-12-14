import { Command } from "commander";
import { jobInfo } from "../jobInfo";
import { jobParams } from "../jobParams";
import { jobSteps } from "../jobSteps";
import { lastBuild } from "../lastBuild";
import { build } from "../build";
import { listBuilds } from "../listBuilds";
import { showLogs } from "../logs";

export function setupJobsCommands(program: Command): void {
  const jobsCommand = program
    .command("jobs")
    .description("Gestionar y consultar información de jobs de Jenkins");

  jobsCommand
    .command("info")
    .argument("<jobName>", "Nombre del job (puede incluir carpetas: folder/subfolder/job)")
    .description("Obtener información detallada de un job")
    .action(jobInfo);

  jobsCommand
    .command("params")
    .argument("<jobName>", "Nombre del job (puede incluir carpetas: folder/subfolder/job)")
    .description("Mostrar los parámetros requeridos por un job")
    .action(jobParams);

  jobsCommand
    .command("steps")
    .argument("<jobName>", "Nombre del job (puede incluir carpetas: folder/subfolder/job)")
    .argument("<buildNumber>", "Número del build o 'latest' para el más reciente")
    .description("Mostrar los pasos (steps) de un build específico")
    .action(jobSteps);

  jobsCommand
    .command("last-build")
    .argument("<jobName>", "Nombre del job (puede incluir carpetas: folder/subfolder/job)")
    .description("Obtener información del último build de un job")
    .action(lastBuild);

  jobsCommand
    .command("build")
    .argument("<jobName>", "Nombre del job (puede incluir carpetas: folder/subfolder/job)")
    .option("--params <params>", "Parámetros en formato key=value,key2=value2")
    .description("Ejecutar un build de forma asistida")
    .action(build);

  jobsCommand
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

  jobsCommand
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
}
