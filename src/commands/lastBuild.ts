import { getLastBuild, getJobInfo } from "../utils/jenkinsFolder";
import { logger } from "../utils/logger";
import { msg } from "../utils/messages";
import { formatters, printHeader, TableBuilder } from "../utils/formatters";

export async function lastBuild(jobName: string) {
  try {
    logger.info(`${msg.icons.search} ${msg.info.fetchingBuildInfo(formatters.jobName(jobName))}`);
    
    const { jobData, buildData } = await validateAndGetBuildData(jobName);
    
    displayBuildHeader(jobData, buildData, jobName);
    displayBuildTiming(buildData);
    displayBuildCauses(buildData);
    
  } catch (error: any) {
    logger.error(`${msg.icons.error} ${error.message}`);
    process.exit(1);
  }
}

async function validateAndGetBuildData(jobName: string) {
  const jobData = await getJobInfo(jobName);
  
  if (!jobData.buildable) {
    throw new Error(`El job "${jobName}" no es ejecutable (puede ser una carpeta o estar deshabilitado).`);
  }
  
  if (!jobData.lastBuild) {
    throw new Error(msg.errors.noBuildHistory);
  }
  
  const buildData = await getLastBuild(jobName);
  return { jobData, buildData };
}

function displayBuildHeader(jobData: any, buildData: any, jobName: string) {
  printHeader(`${msg.icons.construction}  ${msg.labels.buildInfo}`);
  
  const table = new TableBuilder()
    .add('Job:', jobData.fullName || jobName)
    .add(msg.labels.buildNumber, formatters.buildNumber(buildData.number))
    .add(msg.labels.url, formatters.url(buildData.url));
  
  const result = buildData.result;
  if (result) {
    table.add(msg.labels.result, getBuildResultDisplay(result));
  } else {
    table.add(msg.labels.status, formatters.info(`${msg.icons.running} En ejecución`));
  }
  
  console.log(table.build());
}

function displayBuildTiming(buildData: any) {
  const table = new TableBuilder();
  
  if (buildData.duration && buildData.duration > 0) {
    table.add(msg.labels.duration, formatters.duration(buildData.duration));
  }
  
  if (buildData.timestamp) {
    table.add(msg.labels.started, formatters.date(buildData.timestamp));
    
    if (buildData.duration && buildData.duration > 0) {
      table.add(msg.labels.finished, formatters.date(buildData.timestamp + buildData.duration));
    }
  }
  
  if (!buildData.result && buildData.estimatedDuration) {
    const estimatedMinutes = Math.floor(buildData.estimatedDuration / 60000);
    table.add('Duración estimada:', `~${estimatedMinutes}m`);
  }
  
  if (table['rows'].length > 0) {
    console.log(table.build());
  }
}

function displayBuildCauses(buildData: any) {
  if (!buildData.actions) return;
  
  const causes = buildData.actions
    .filter((action: any) => action._class?.includes("CauseAction"))
    .flatMap((action: any) => action.causes || []);
  
  if (causes.length > 0) {
    console.log(`\n${formatters.title(msg.labels.startedBy)}`);
    causes.forEach((cause: any) => {
      console.log(`   ${msg.icons.bullet} ${getCauseDisplay(cause)}`);
    });
  }
}

function getBuildResultDisplay(result: string): string {
  const resultMap: Record<string, string> = {
    'SUCCESS': msg.jobStatus.success,
    'FAILURE': msg.jobStatus.failed,
    'UNSTABLE': msg.jobStatus.unstable,
    'ABORTED': msg.jobStatus.aborted,
    'NOT_BUILT': `${msg.icons.skipped} No construido`,
  };
  
  return resultMap[result] || formatters.secondary(result);
}

function getCauseDisplay(cause: any): string {
  const className = cause._class || "";
  
  if (className.includes("UserIdCause")) {
    return `${msg.icons.user} Usuario: ${cause.userId || "Desconocido"}`;
  }
  if (className.includes("TimerTriggerCause")) {
    return `${msg.icons.clock} Programación temporal`;
  }
  if (className.includes("SCMTriggerCause")) {
    return `${msg.icons.running} Cambio en repositorio`;
  }
  if (className.includes("UpstreamCause")) {
    return `${msg.icons.upstream} Build padre: ${cause.upstreamProject}#${cause.upstreamBuild}`;
  }
  if (className.includes("BranchEventCause")) {
    return `${msg.icons.branch} Evento de rama: ${cause.origin || "Desconocido"}`;
  }
  
  return cause.shortDescription || "Causa desconocida";
}
