import { getJobInfo } from "../utils/jenkinsFolder";
import { logger } from "../utils/logger";
import { msg } from "../utils/messages";
import { formatters, printHeader, TableBuilder } from "../utils/formatters";

export async function jobInfo(jobName: string) {
  try {
    logger.info(`${msg.icons.search} ${msg.info.fetchingJobInfo(formatters.jobName(jobName))}`);
    
    const jobData = await getJobInfo(jobName);
    
    printHeader(`${msg.icons.file} ${msg.labels.jobInfo}`);
    
    const table = new TableBuilder()
      .add(msg.labels.name, jobData.name)
      .add(msg.labels.fullName, jobData.fullName || jobName)
      .add(msg.labels.url, formatters.url(jobData.url))
      .add(msg.labels.description, jobData.description, msg.values.noDescription);
    
    if (jobData.lastBuild) {
      table.add(msg.labels.lastBuild, formatters.buildNumber(jobData.lastBuild.number));
      table.add(`${msg.labels.url} ${msg.labels.lastBuild.toLowerCase()}`, formatters.url(jobData.lastBuild.url));
    } else {
      table.add(msg.labels.lastBuild, undefined, msg.values.noBuild);
    }
    
    if (jobData.lastSuccessfulBuild) {
      table.add(msg.labels.lastSuccessfulBuild, formatters.buildNumber(jobData.lastSuccessfulBuild.number));
    }
    
    if (jobData.lastFailedBuild) {
      table.add(msg.labels.lastFailedBuild, formatters.buildNumber(jobData.lastFailedBuild.number));
    }
    
    // Información adicional para MultibranchPipeline o carpetas
    if (jobData._class?.includes("MultiBranchProject") || jobData._class?.includes("Folder")) {
      table.add(msg.labels.type, getJobTypeDisplay(jobData._class));
      
      if (jobData.jobs && jobData.jobs.length > 0) {
        table.add('Sub-items:', String(jobData.jobs.length));
      }
    }
    
    // Estado del job
    if (jobData.color) {
      table.add(msg.labels.status, getJobStatusDisplay(jobData.color));
    }
    
    // Buildable
    table.add(msg.labels.executable, formatters.boolean(jobData.buildable, msg.jobStatus.yes, msg.jobStatus.no));
    
    console.log(table.build());
    
  } catch (error: any) {
    logger.error(`${msg.icons.error} ${error.message}`);
    process.exit(1);
  }
}

function getJobTypeDisplay(className: string): string {
  if (className.includes("MultiBranchProject")) {
    return formatters.info(msg.jobTypes.multiBranch);
  }
  if (className.includes("Folder")) {
    return formatters.info(msg.jobTypes.folder);
  }
  if (className.includes("WorkflowJob")) {
    return formatters.success(msg.jobTypes.pipeline);
  }
  if (className.includes("FreeStyleProject")) {
    return formatters.warning(msg.jobTypes.freestyle);
  }
  return formatters.secondary(className);
}

function getJobStatusDisplay(color: string): string {
  const statusMap: Record<string, string> = {
    'blue': msg.jobStatus.success,
    'red': msg.jobStatus.failed,
    'yellow': msg.jobStatus.unstable,
    'grey': msg.jobStatus.disabled,
    'disabled': msg.jobStatus.disabled,
    'aborted': msg.jobStatus.aborted,
    'blue_anime': msg.jobStatus.runningSuccess,
    'red_anime': msg.jobStatus.runningFailed,
    'yellow_anime': msg.jobStatus.runningUnstable,
  };
  
  return statusMap[color] || formatters.secondary(color);
}
