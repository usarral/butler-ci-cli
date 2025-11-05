import { getBuildLogs, downloadBuildLogs, getJobInfo, getProgressiveBuildLogs, getBuildInfo } from "../utils/jenkinsFolder";
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
  options: { download?: boolean; editor?: boolean; output?: string; stream?: boolean; interval?: number }
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
    
    // Si se solicita streaming, usar la función de streaming
    if (options.stream) {
      await streamLogs(jobName, resolvedBuildNumber, options.interval || 5);
      return;
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
 * Stream logs de un build en tiempo real
 */
async function streamLogs(
  jobName: string,
  buildNumber: string,
  intervalSeconds: number
): Promise<void> {
  let start = 0;
  let isRunning = true;
  let lastStatus = '';
  
  // Manejar Ctrl+C para salir limpiamente
  const sigintHandler = () => {
    console.log('\n');
    logger.info(formatters.info(`${msg.icons.info} Streaming detenido por el usuario`));
    process.exit(0);
  };
  
  // Añadir handler propio sin interferir con otros
  process.once('SIGINT', sigintHandler);
  
  // Mostrar encabezado
  printSeparator();
  console.log(formatters.title(`${msg.icons.file} ${msg.labels.buildLogs(Number(buildNumber))} - Streaming Mode`));
  console.log(formatters.dim(`Actualizando cada ${intervalSeconds} segundos. Presiona Ctrl+C para salir.`));
  printSeparator();
  console.log();
  
  try {
    while (isRunning) {
      try {
        // Obtener logs progresivos
        const result = await getProgressiveBuildLogs(jobName, buildNumber, start);
        
        // Mostrar nuevos logs si los hay
        if (result.text && result.text.length > 0) {
          process.stdout.write(result.text);
        }
        
        // Actualizar la posición para la próxima lectura
        start = result.size;
        
        // Verificar el estado del build
        const buildInfo = await getBuildInfo(jobName, buildNumber);
        
        // Si el build terminó y no hay más datos
        if (!buildInfo.building && !result.hasMore) {
          isRunning = false;
          console.log();
          printSeparator();
          
          const statusIcon = buildInfo.result === 'SUCCESS' ? msg.icons.success : 
                            buildInfo.result === 'FAILURE' ? msg.icons.error : 
                            msg.icons.info;
          const statusColor = buildInfo.result === 'SUCCESS' ? formatters.success : 
                             buildInfo.result === 'FAILURE' ? formatters.error : 
                             formatters.info;
          
          console.log(statusColor(`${statusIcon} Build completado con estado: ${buildInfo.result}`));
          printSeparator();
          break;
        }
        
        // Mostrar estado si cambió
        const currentStatus = buildInfo.building ? 'RUNNING' : (buildInfo.result || 'UNKNOWN');
        if (currentStatus !== lastStatus) {
          if (lastStatus !== '') {
            console.log();
            console.log(formatters.dim(`Estado: ${currentStatus}`));
          }
          lastStatus = currentStatus;
        }
        
        // Esperar antes de la próxima actualización
        await new Promise(resolve => setTimeout(resolve, intervalSeconds * 1000));
        
      } catch (error: any) {
        logger.error(`${msg.icons.error} Error en streaming: ${error.message}`);
        isRunning = false;
      }
    }
  } finally {
    // Limpiar el handler al salir
    process.removeListener('SIGINT', sigintHandler);
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
