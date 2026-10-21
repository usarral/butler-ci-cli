import { getJobInfo, getWorkflowSteps, WorkflowStage } from "../utils/jenkinsFolder";
import { logger } from "../utils/logger";
import { msg } from "../i18n";
import { icons } from "../utils/icons";
import { jobStatus } from "../utils/jobStatus";
import { formatters, printHeader, TableBuilder } from "../utils/formatters";

export async function jobSteps(jobName: string, buildNumber: string) {
  try {
    logger.info(`${icons.search} ${msg.steps.fetching({ build: formatters.buildNumber(buildNumber), job: formatters.jobName(jobName) })}`);
    
    // Validar que el job existe y es ejecutable
    const jobData = await getJobInfo(jobName);
    
    if (!jobData.buildable) {
      throw new Error(msg.errors.jobNotExecutableHint({ job: jobName }));
    }
    
    // Resolver "latest" al último build number si es necesario
    let actualBuildNumber = buildNumber;
    if (buildNumber.toLowerCase() === 'latest') {
      if (!jobData.lastBuild) {
        throw new Error(msg.errors.noBuildHistory());
      }
      actualBuildNumber = String(jobData.lastBuild.number);
      logger.info(`${icons.info} ${msg.steps.latest({ build: actualBuildNumber })}`);
    }
    
    // Obtener los pasos del workflow
    const stages = await getWorkflowSteps(jobName, actualBuildNumber);
    
    if (!stages || stages.length === 0) {
      logger.info(`${icons.info} ${msg.steps.none({ build: actualBuildNumber })}`);
      return;
    }
    
    // Mostrar información del job y build
    printHeader(`${icons.file} ${msg.steps.title()}`);
    
    const headerTable = new TableBuilder()
      .add(msg.labels.job(), jobData.fullName || jobName)
      .add(msg.labels.build(), formatters.buildNumber(actualBuildNumber))
      .add(msg.labels.url(), formatters.url(`${jobData.url}${actualBuildNumber}/`));
    
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
  console.log(`\n${formatters.title(msg.steps.stage({ number: stageNumber, name: stage.name }))}`);
  
  const table = new TableBuilder()
    .add(msg.labels.status(), getStatusDisplay(stage.status));
  
  if (stage.startTimeMillis) {
    table.add(msg.labels.start(), formatters.date(stage.startTimeMillis));
  }
  
  if (stage.durationMillis) {
    table.add(msg.labels.duration(), formatters.duration(stage.durationMillis));
  }
  
  console.log(table.build());
  
  // Mostrar steps si existen
  if (stage.stageFlowNodes && stage.stageFlowNodes.length > 0) {
    console.log(`\n  ${formatters.secondary(msg.steps.steps())}`);
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
    console.log(`       ${formatters.error(`${icons.error} ${msg.steps.error({ message: step.error.message })}`)}`);
  }
}

function getStatusDisplay(status: string): string {
  const statusMap: Record<string, string> = {
    'SUCCESS': jobStatus.success(),
    'FAILED': jobStatus.failed(),
    'FAILURE': jobStatus.failed(),
    'UNSTABLE': jobStatus.unstable(),
    'ABORTED': jobStatus.aborted(),
    'IN_PROGRESS': formatters.info(`${icons.running} ${msg.steps.inProgress()}`),
    'NOT_EXECUTED': formatters.secondary(`${icons.skipped} ${msg.steps.notExecuted()}`),
    'PAUSED_PENDING_INPUT': formatters.warning(`${icons.paused} ${msg.steps.paused()}`),
  };
  
  return statusMap[status] || formatters.secondary(status);
}
