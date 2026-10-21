import { getJobInfo, getWorkflowSteps, WorkflowStage } from "../utils/jenkinsFolder";
import { logger } from "../utils/logger";
import { msg } from "../i18n";
import { icons } from "../utils/icons";
import { jobStatus } from "../utils/jobStatus";
import { formatters, printHeader, TableBuilder } from "../utils/formatters";

export async function jobSteps(jobName: string, buildNumber: string) {
  try {
    logger.info(`${icons.search} Obteniendo pasos del build ${formatters.buildNumber(buildNumber)} del job ${formatters.jobName(jobName)}`);
    
    // Validar que el job existe y es ejecutable
    const jobData = await getJobInfo(jobName);
    
    if (!jobData.buildable) {
      throw new Error(`El job "${jobName}" no es ejecutable (puede ser una carpeta o estar deshabilitado).`);
    }
    
    // Resolver "latest" al último build number si es necesario
    let actualBuildNumber = buildNumber;
    if (buildNumber.toLowerCase() === 'latest') {
      if (!jobData.lastBuild) {
        throw new Error(msg.errors.noBuildHistory());
      }
      actualBuildNumber = String(jobData.lastBuild.number);
      logger.info(`${icons.info} Último build: #${actualBuildNumber}`);
    }
    
    // Obtener los pasos del workflow
    const stages = await getWorkflowSteps(jobName, actualBuildNumber);
    
    if (!stages || stages.length === 0) {
      logger.info(`${icons.info} No se encontraron pasos para el build #${actualBuildNumber}`);
      return;
    }
    
    // Mostrar información del job y build
    printHeader(`${icons.file} Pasos del Build`);
    
    const headerTable = new TableBuilder()
      .add('Job:', jobData.fullName || jobName)
      .add('Build:', formatters.buildNumber(actualBuildNumber))
      .add('URL:', formatters.url(`${jobData.url}${actualBuildNumber}/`));
    
    console.log(headerTable.build());
    
    // Mostrar cada stage y sus steps
    stages.forEach((stage, index) => {
      displayStage(stage, index + 1);
    });
    
  } catch (error: any) {
    logger.error(`${icons.error} ${error.message}`);
    process.exit(1);
  }
}

function displayStage(stage: WorkflowStage, stageNumber: number) {
  console.log(`\n${formatters.title(`Stage ${stageNumber}: ${stage.name}`)}`);
  
  const table = new TableBuilder()
    .add('Estado:', getStatusDisplay(stage.status));
  
  if (stage.startTimeMillis) {
    table.add('Inicio:', formatters.date(stage.startTimeMillis));
  }
  
  if (stage.durationMillis) {
    table.add('Duración:', formatters.duration(stage.durationMillis));
  }
  
  console.log(table.build());
  
  // Mostrar steps si existen
  if (stage.stageFlowNodes && stage.stageFlowNodes.length > 0) {
    console.log(`\n  ${formatters.secondary('Pasos:')}`);
    stage.stageFlowNodes.forEach((step, index) => {
      displayStep(step, index + 1);
    });
  }
}

function displayStep(step: any, stepNumber: number) {
  const status = getStatusDisplay(step.status);
  const duration = step.durationMillis ? ` (${formatters.duration(step.durationMillis)})` : '';
  
  console.log(`    ${stepNumber}. ${step.name} - ${status}${duration}`);
  
  if (step.error) {
    console.log(`       ${formatters.error(`${icons.error} Error: ${step.error.message}`)}`);
  }
}

function getStatusDisplay(status: string): string {
  const statusMap: Record<string, string> = {
    'SUCCESS': jobStatus.success(),
    'FAILED': jobStatus.failed(),
    'FAILURE': jobStatus.failed(),
    'UNSTABLE': jobStatus.unstable(),
    'ABORTED': jobStatus.aborted(),
    'IN_PROGRESS': formatters.info(`${icons.running} En progreso`),
    'NOT_EXECUTED': formatters.secondary(`${icons.skipped} No ejecutado`),
    'PAUSED_PENDING_INPUT': formatters.warning(`${icons.paused} Esperando entrada`),
  };
  
  return statusMap[status] || formatters.secondary(status);
}
