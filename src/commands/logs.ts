import { getBuildLogs, downloadBuildLogs, getJobInfo } from "../utils/jenkinsFolder";
import { getJenkinsConfig } from "../utils/config";
import { logger } from "../utils/logger";
import { msg } from "../utils/messages";
import { formatters, printSeparator } from "../utils/formatters";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";

/**
 * Muestra los logs de un build en la terminal
 */
export async function showLogs(
  jobName: string,
  buildNumber: string,
  options: { download?: boolean; editor?: boolean; output?: string }
) {
  try {
    // Resolver 'latest' al número de build más reciente
    let resolvedBuildNumber = buildNumber;
    if (buildNumber.toLowerCase() === 'latest') {
      logger.info(formatters.secondary(`${msg.icons.search} ${msg.info.resolvingLatest}\n`));
      const jobInfo = await getJobInfo(jobName);
      
      if (!jobInfo.lastBuild) {
        logger.error(msg.errors.noBuildHistory);
        process.exit(1);
      }
      
      resolvedBuildNumber = jobInfo.lastBuild.number.toString();
      logger.info(formatters.success(`${msg.icons.check} ${msg.info.latestBuildFound(Number(resolvedBuildNumber))}\n`));
    }
    
    logger.info(`${msg.icons.logs} ${msg.info.fetchingLogs(resolvedBuildNumber, formatters.jobName(jobName))}\n`);
    
    // Verificar que el job existe (si no se ha verificado ya)
    if (buildNumber.toLowerCase() !== 'latest') {
      await getJobInfo(jobName);
    }
    
    // Obtener los logs
    const logs = await getBuildLogs(jobName, resolvedBuildNumber);
    
    if (!logs || logs.trim().length === 0) {
      logger.warn(`${msg.icons.warning}  ${msg.errors.noLogsAvailable}`);
      return;
    }
    
    // Si se solicita descarga
    if (options.download || options.editor) {
      const outputPath = await downloadBuildLogs(jobName, resolvedBuildNumber, options.output);
      logger.info(formatters.success(`${msg.icons.success} Logs descargados en: ${formatters.highlight(outputPath)}\n`));
      
      // Si se solicita abrir en editor
      if (options.editor) {
        await openInEditor(outputPath);
        return;
      }
    }
    
    // Si se solicita solo descarga, no mostrar en terminal
    if (options.download && !options.editor) {
      return;
    }
    
    // Mostrar logs en terminal
    printSeparator();
    console.log(formatters.title(`${msg.icons.file} ${msg.labels.buildLogs(Number(resolvedBuildNumber))}`));
    printSeparator();
    console.log();
    console.log(logs);
    console.log();
    printSeparator();
    console.log(formatters.secondary(msg.formatting.endOfLogs(logs.split('\n').length)));
    printSeparator();
    
  } catch (error: any) {
    logger.error(`${msg.icons.error} ${error.message}`);
    process.exit(1);
  }
}

/**
 * Abre un archivo de logs en el editor configurado
 */
async function openInEditor(filePath: string): Promise<void> {
  if (!existsSync(filePath)) {
    throw new Error(msg.errors.fileNotFound(filePath));
  }
  
  // Obtener editor configurado
  const config = getJenkinsConfig();
  let editor = config?.preferences?.editor || config?.preferences?.logViewer;
  
  // Si no hay editor configurado, intentar usar editores comunes
  if (!editor) {
    const commonEditors = ['code', 'nvim', 'vim', 'nano', 'gedit', 'kate', 'sublime', 'atom'];
    
    for (const ed of commonEditors) {
      if (await commandExists(ed)) {
        editor = ed;
        logger.info(formatters.info(msg.info.usingDefaultEditor(editor)));
        break;
      }
    }
    
    if (!editor) {
      logger.warn(formatters.warning(msg.info.noEditorConfigured));
      logger.info(formatters.dim(msg.info.configureEditorHint));
      logger.info(formatters.dim(`${msg.icons.file} ${msg.labels.fileSavedAt}: ${filePath}`));
      return;
    }
  }
  
  logger.info(formatters.info(`${msg.icons.rocket} ${msg.info.openingInEditor(editor)}...\n`));
  
  // Abrir el editor
  const editorProcess = spawn(editor, [filePath], {
    stdio: 'inherit',
    shell: true,
    detached: true
  });
  
  editorProcess.on('error', (error) => {
    logger.error(formatters.error(`${msg.icons.error} ${msg.errors.openingEditor}: ${error.message}`));
    logger.info(formatters.dim(`${msg.icons.file} ${msg.labels.fileSavedAt}: ${filePath}`));
  });
  
  // Si el editor es VS Code u otro que no bloquea, no esperar
  const nonBlockingEditors = ['code', 'sublime', 'atom', 'gedit', 'kate'];
  if (nonBlockingEditors.includes(editor)) {
    editorProcess.unref();
    logger.info(formatters.success(`${msg.icons.success} ${msg.success.editorOpened} ${msg.labels.fileSavedAt}: ${filePath}`));
  }
}

/**
 * Verifica si un comando existe en el sistema
 */
async function commandExists(command: string): Promise<boolean> {
  return new Promise((resolve) => {
    const process = spawn('which', [command], { shell: true });
    process.on('exit', (code) => {
      resolve(code === 0);
    });
    process.on('error', () => {
      resolve(false);
    });
  });
}

/**
 * Descarga logs de un build sin mostrarlos
 */
export async function downloadLogs(
  jobName: string,
  buildNumber: string,
  options: { output?: string }
) {
  try {
    logger.info(`${msg.icons.download} ${msg.info.downloadingLogs} #${formatters.highlight(buildNumber)} ${msg.labels.fromJob}: ${formatters.highlight(jobName)}`);
    
    const outputPath = await downloadBuildLogs(jobName, buildNumber, options.output);
    
    logger.info(formatters.success(`\n${msg.icons.success} ${msg.success.logsDownloaded}`));
    logger.info(formatters.bold(`${msg.icons.file} ${msg.labels.location}: ${outputPath}`));
    
  } catch (error: any) {
    logger.error(formatters.error(`${msg.icons.error} ${msg.errors.generic}: ${error.message}`));
    process.exit(1);
  }
}
