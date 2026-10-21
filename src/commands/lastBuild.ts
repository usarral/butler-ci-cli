import { getLastBuild, getJobInfo } from "../utils/jenkinsFolder";
import { logger } from "../utils/logger";
import { msg } from "../i18n";
import { icons } from "../utils/icons";
import { jobStatus } from "../utils/jobStatus";
import { formatters, printHeader, TableBuilder } from "../utils/formatters";

export async function lastBuild(jobName: string) {
  try {
    logger.info(`${icons.search} ${msg.info.fetchingBuildInfo({ job: formatters.jobName(jobName) })}`);
    
    const { jobData, buildData } = await validateAndGetBuildData(jobName);
    
    displayBuildHeader(jobData, buildData, jobName);
    displayBuildTiming(buildData);
    displayBuildCauses(buildData);
    
  } catch (error: any) {
    logger.error(`${icons.error} ${error.message}`);
    process.exit(1);
  }
}

async function validateAndGetBuildData(jobName: string) {
  const jobData = await getJobInfo(jobName);
  
  if (!jobData.buildable) {
    throw new Error(msg.errors.jobNotExecutableHint({ job: jobName }));
  }
  
  if (!jobData.lastBuild) {
    throw new Error(msg.errors.noBuildHistory());
  }
  
  const buildData = await getLastBuild(jobName);
  return { jobData, buildData };
}

function displayBuildHeader(jobData: any, buildData: any, jobName: string) {
  printHeader(`${icons.construction}  ${msg.labels.buildInfo()}`);
  
  const table = new TableBuilder()
    .add(msg.labels.job(), jobData.fullName || jobName)
    .add(msg.labels.buildNumber(), formatters.buildNumber(buildData.number))
    .add(msg.labels.url(), formatters.url(buildData.url));
  
  const result = buildData.result;
  if (result) {
    table.add(msg.labels.result(), getBuildResultDisplay(result));
  } else {
    table.add(msg.labels.status(), formatters.info(jobStatus.running()));
  }
  
  console.log(table.build());
}

function displayBuildTiming(buildData: any) {
  const table = new TableBuilder();
  
  if (buildData.duration && buildData.duration > 0) {
    table.add(msg.labels.duration(), formatters.duration(buildData.duration));
  }
  
  if (buildData.timestamp) {
    table.add(msg.labels.started(), formatters.date(buildData.timestamp));
    
    if (buildData.duration && buildData.duration > 0) {
      table.add(msg.labels.finished(), formatters.date(buildData.timestamp + buildData.duration));
    }
  }
  
  if (!buildData.result && buildData.estimatedDuration > 0) {
    const estimatedMinutes = Math.floor(buildData.estimatedDuration / 60000);
    table.add(msg.labels.estimatedDuration(), `~${estimatedMinutes}m`);
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
    console.log(`\n${formatters.title(msg.labels.startedBy())}`);
    causes.forEach((cause: any) => {
      console.log(`   ${icons.bullet} ${getCauseDisplay(cause)}`);
    });
  }
}

function getBuildResultDisplay(result: string): string {
  const resultMap: Record<string, string> = {
    'SUCCESS': jobStatus.success(),
    'FAILURE': jobStatus.failed(),
    'UNSTABLE': jobStatus.unstable(),
    'ABORTED': jobStatus.aborted(),
    'NOT_BUILT': `${icons.skipped} No construido`,
  };
  
  return resultMap[result] || formatters.secondary(result);
}

function getCauseDisplay(cause: any): string {
  const className = cause._class || "";
  
  if (className.includes("UserIdCause")) {
    return `${icons.user} ${msg.causes.user({ user: cause.userId || msg.builds.unknown() })}`;
  }
  if (className.includes("TimerTriggerCause")) {
    return `${icons.clock} ${msg.causes.timer()}`;
  }
  if (className.includes("SCMTriggerCause")) {
    return `${icons.running} ${msg.causes.scm()}`;
  }
  if (className.includes("UpstreamCause")) {
    return `${icons.upstream} ${msg.causes.upstream({ project: cause.upstreamProject, build: cause.upstreamBuild })}`;
  }
  if (className.includes("BranchEventCause")) {
    return `${icons.branch} ${msg.causes.branchEvent({ origin: cause.origin || msg.builds.unknown() })}`;
  }
  
  return cause.shortDescription || msg.causes.unknown();
}
