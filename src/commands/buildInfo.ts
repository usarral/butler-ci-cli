import { getBuildInfo, getBuilds, getJobInfo, DetailedBuildInfo } from "../utils/jenkinsFolder";
import { logger } from "../utils/logger";
import { msg } from "../utils/messages";
import { formatters, printHeader, TableBuilder } from "../utils/formatters";
import inquirer from "inquirer";

export interface BuildInfoCommandOptions {
  buildNumber?: string | number;
}

export async function buildInfo(jobName: string, buildNumber?: string | number) {
  try {
    // If no build number provided, show interactive selection
    let selectedBuildNumber = buildNumber;
    
    if (!selectedBuildNumber) {
      logger.info(`${msg.icons.search} No se especificó número de build. Obteniendo lista de builds...`);
      selectedBuildNumber = await selectBuildInteractively(jobName);
    }
    
    logger.info(`${msg.icons.search} Obteniendo información detallada del build #${selectedBuildNumber} del job ${formatters.jobName(jobName)}...`);
    
    const buildData = await getBuildInfo(jobName, selectedBuildNumber);
    const jobData = await getJobInfo(jobName);
    
    displayBuildInfo(buildData, jobData, jobName);
    
  } catch (error: any) {
    logger.error(`${msg.icons.error} ${error.message}`);
    process.exit(1);
  }
}

async function selectBuildInteractively(jobName: string): Promise<number> {
  try {
    // Get recent builds
    const builds = await getBuilds(jobName, { limit: 20 });
    
    if (builds.length === 0) {
      throw new Error(`No se encontraron builds para el job "${jobName}".`);
    }
    
    const choices = builds.map(build => {
      const status = build.building ? '🔄 En ejecución' : getBuildStatusIcon(build.result);
      const date = new Date(build.timestamp).toLocaleString();
      return {
        name: `#${build.number} - ${status} - ${date}`,
        value: build.number,
        short: `#${build.number}`
      };
    });
    
    const answer = await inquirer.prompt([
      {
        type: 'list',
        name: 'buildNumber',
        message: 'Selecciona un build:',
        choices,
        pageSize: 15
      }
    ]);
    
    return answer.buildNumber;
  } catch (error: any) {
    throw new Error(`Error obteniendo builds para selección: ${error.message}`);
  }
}

function getBuildStatusIcon(result: string | null): string {
  const resultMap: Record<string, string> = {
    'SUCCESS': '✅ SUCCESS',
    'FAILURE': '❌ FAILURE',
    'UNSTABLE': '⚠️  UNSTABLE',
    'ABORTED': '⏹️  ABORTED',
    'NOT_BUILT': '⏭️  NOT_BUILT',
  };
  
  return resultMap[result || ''] || `❓ ${result || 'UNKNOWN'}`;
}

function displayBuildInfo(buildData: DetailedBuildInfo, jobData: any, jobName: string) {
  printHeader(`🏗️  ${msg.labels.buildInfoDetailed}`);
  
  // Basic build information
  const basicTable = new TableBuilder()
    .add('Job:', jobData.fullName || jobName)
    .add(msg.labels.buildNumber, formatters.buildNumber(`#${buildData.number}`))
    .add(msg.labels.url, formatters.url(buildData.url));
  
  if (buildData.displayName && buildData.displayName !== `#${buildData.number}`) {
    basicTable.add('Nombre:', buildData.displayName);
  }
  
  if (buildData.description) {
    basicTable.add('Descripción:', buildData.description);
  }
  
  const result = buildData.result;
  if (result) {
    basicTable.add(msg.labels.result, getBuildResultDisplay(result));
  } else {
    basicTable.add(msg.labels.status, formatters.info("🔄 En ejecución"));
  }
  
  console.log(basicTable.build());
  
  // Timing information
  displayTimingInfo(buildData);
  
  // Build causes
  displayBuildCauses(buildData);
  
  // Artifacts
  displayArtifacts(buildData);
  
  // Change sets
  displayChangeSets(buildData);
  
  // Additional metadata
  displayMetadata(buildData);
}

function displayTimingInfo(buildData: DetailedBuildInfo) {
  const table = new TableBuilder();
  
  if (buildData.timestamp) {
    table.add(msg.labels.started, formatters.date(buildData.timestamp));
    
    if (buildData.duration && buildData.duration > 0) {
      table.add(msg.labels.duration, formatters.duration(buildData.duration));
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

function displayBuildCauses(buildData: DetailedBuildInfo) {
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

function displayArtifacts(buildData: DetailedBuildInfo) {
  if (!buildData.artifacts || buildData.artifacts.length === 0) {
    return;
  }
  
  console.log(`\n${formatters.title('📦 Artefactos:')}`);
  buildData.artifacts.forEach((artifact) => {
    console.log(`   ${msg.icons.bullet} ${formatters.info(artifact.fileName)} ${formatters.secondary(`(${artifact.relativePath})`)}`);
  });
}

function displayChangeSets(buildData: DetailedBuildInfo) {
  if (!buildData.changeSets || buildData.changeSets.length === 0) {
    return;
  }
  
  const allChanges = buildData.changeSets.flatMap((cs: any) => cs.items || []);
  
  if (allChanges.length === 0) {
    return;
  }
  
  console.log(`\n${formatters.title('📝 Cambios:')}`);
  allChanges.slice(0, 10).forEach((change: any) => {
    const author = change.author?.fullName || change.authorEmail || 'Desconocido';
    const msg = change.msg || change.comment || 'Sin mensaje';
    console.log(`   ${msg.icons.bullet} ${formatters.info(author)}: ${msg.split('\n')[0]}`);
  });
  
  if (allChanges.length > 10) {
    console.log(`   ${formatters.secondary(`... y ${allChanges.length - 10} cambios más`)}`);
  }
}

function displayMetadata(buildData: DetailedBuildInfo) {
  const table = new TableBuilder();
  
  if (buildData.id) {
    table.add('ID:', buildData.id);
  }
  
  if (buildData.queueId) {
    table.add('Queue ID:', buildData.queueId.toString());
  }
  
  if (buildData.building !== undefined) {
    table.add('En ejecución:', buildData.building ? 'Sí' : 'No');
  }
  
  if (table['rows'].length > 0) {
    console.log(`\n${formatters.title('ℹ️  Metadata:')}`);
    console.log(table.build());
  }
}

function getBuildResultDisplay(result: string): string {
  const resultMap: Record<string, string> = {
    'SUCCESS': msg.jobStatus.success,
    'FAILURE': msg.jobStatus.failed,
    'UNSTABLE': msg.jobStatus.unstable,
    'ABORTED': msg.jobStatus.aborted,
    'NOT_BUILT': '⏭️  No construido',
  };
  
  return resultMap[result] || formatters.secondary(result);
}

function getCauseDisplay(cause: any): string {
  const className = cause._class || "";
  
  if (className.includes("UserIdCause")) {
    return `${msg.icons.user} Usuario: ${cause.userId || "Desconocido"}`;
  }
  if (className.includes("TimerTriggerCause")) {
    return "⏰ Programación temporal";
  }
  if (className.includes("SCMTriggerCause")) {
    return "🔄 Cambio en repositorio";
  }
  if (className.includes("UpstreamCause")) {
    return `⬆️ Build padre: ${cause.upstreamProject}#${cause.upstreamBuild}`;
  }
  if (className.includes("BranchEventCause")) {
    return `🌿 Evento de rama: ${cause.origin || "Desconocido"}`;
  }
  
  return cause.shortDescription || "Causa desconocida";
}
