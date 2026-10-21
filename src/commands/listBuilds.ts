import { getBuilds, BuildListOptions } from "../utils/jenkinsFolder";
import { logger } from "../utils/logger";
import { msg } from "../i18n";
import { icons } from "../utils/icons";
import { jobStatus } from "../utils/jobStatus";
import { formatters, printHeader, TableBuilder } from "../utils/formatters";

export interface ListBuildsCommandOptions {
  status?: string;
  branch?: string;
  since?: string;
  until?: string;
  offset?: number;
  limit?: number;
  sortBy?: 'number' | 'timestamp';
  order?: 'asc' | 'desc';
}

export async function listBuilds(jobName: string, options: ListBuildsCommandOptions = {}) {
  try {
    logger.info(`${icons.search} ${msg.builds.fetching({ job: formatters.jobName(jobName) })}`);
    
    // Preparar opciones de filtrado
    const buildOptions: BuildListOptions = {
      status: options.status,
      branch: options.branch,
      offset: options.offset,
      limit: options.limit || 50,
      sortBy: options.sortBy,
      sortOrder: options.order,
    };
    
    // Parsear fechas si se proporcionan
    if (options.since) {
      buildOptions.startDate = new Date(options.since);
      if (isNaN(buildOptions.startDate.getTime())) {
        throw new Error(msg.builds.invalidSince({ value: options.since }));
      }
    }
    
    if (options.until) {
      buildOptions.endDate = new Date(options.until);
      if (isNaN(buildOptions.endDate.getTime())) {
        throw new Error(msg.builds.invalidUntil({ value: options.until }));
      }
    }
    
    // Obtener builds
    const builds = await getBuilds(jobName, buildOptions);
    
    if (builds.length === 0) {
      logger.warn(formatters.warning(`${icons.warning} ${msg.builds.none()}`));
      return;
    }
    
    // Mostrar encabezado
    printHeader(`${icons.construction}  ${msg.builds.title({ job: jobName })}`);
    
    // Mostrar información de filtros aplicados
    displayFilterInfo(options);
    
    // Mostrar tabla de builds
    console.log('');
    displayBuildsTable(builds);
    
    // Mostrar resumen
    displaySummary(builds, options);
    
  } catch (error: any) {
    logger.error(`${icons.error} ${error.message}`);
    process.exit(1);
  }
}

function displayFilterInfo(options: ListBuildsCommandOptions) {
  const filters: string[] = [];
  
  if (options.status) {
    filters.push(msg.builds.filterStatus({ value: formatters.info(options.status) }));
  }
  if (options.branch) {
    filters.push(msg.builds.filterBranch({ value: formatters.info(options.branch) }));
  }
  if (options.since) {
    filters.push(msg.builds.filterSince({ value: formatters.secondary(options.since) }));
  }
  if (options.until) {
    filters.push(msg.builds.filterUntil({ value: formatters.secondary(options.until) }));
  }
  
  if (filters.length > 0) {
    console.log(`\n${formatters.title(msg.builds.filters())}`);
    filters.forEach(filter => {
      console.log(`   ${icons.bullet} ${filter}`);
    });
  }
}

function displayBuildsTable(builds: any[]) {
  console.log(formatters.title(msg.builds.list()));
  console.log('');
  
  // Column widths
  const COL_NUMBER_WIDTH = 12;
  const COL_STATUS_WIDTH = 18;
  const COL_DATE_WIDTH = 20;
  const COL_DURATION_WIDTH = 12;
  // ANSI color codes add extra characters that don't display, need to account for them in padding
  const ANSI_CODE_LENGTH = 9;
  
  // Encabezados
  const numberCol = msg.builds.colNumber().padEnd(COL_NUMBER_WIDTH);
  const statusCol = msg.builds.colStatus().padEnd(COL_STATUS_WIDTH);
  const dateCol = msg.builds.colDate().padEnd(COL_DATE_WIDTH);
  const durationCol = msg.builds.colDuration().padEnd(COL_DURATION_WIDTH);
  
  console.log(formatters.bold(`${numberCol}${statusCol}${dateCol}${durationCol}`));
  console.log(icons.rule.repeat(62));
  
  // Filas
  for (const build of builds) {
    const number = formatters.buildNumber(`#${build.number}`).padEnd(COL_NUMBER_WIDTH + ANSI_CODE_LENGTH);
    const status = getBuildStatusDisplay(build).padEnd(COL_STATUS_WIDTH + ANSI_CODE_LENGTH);
    const date = formatters.date(build.timestamp).padEnd(COL_DATE_WIDTH + ANSI_CODE_LENGTH);
    const duration = build.duration > 0 
      ? formatters.duration(build.duration).padEnd(COL_DURATION_WIDTH + ANSI_CODE_LENGTH)
      : formatters.secondary(msg.builds.inProgress()).padEnd(COL_DURATION_WIDTH + ANSI_CODE_LENGTH);
    
    console.log(`${number}${status}${date}${duration}`);
  }
}

function displaySummary(builds: any[], options: ListBuildsCommandOptions) {
  const total = builds.length;
  const successful = builds.filter(b => b.result === 'SUCCESS').length;
  const failed = builds.filter(b => b.result === 'FAILURE').length;
  const running = builds.filter(b => b.building).length;
  const other = total - successful - failed - running;
  
  console.log(`\n${formatters.title(msg.labels.summary())}`);
  console.log(`   ${msg.builds.total({ count: formatters.info(total.toString()) })}`);
  if (successful > 0) {
    console.log(`   ${jobStatus.success()}: ${successful}`);
  }
  if (failed > 0) {
    console.log(`   ${jobStatus.failed()}: ${failed}`);
  }
  if (running > 0) {
    console.log(`   ${msg.jobStatus.running()}: ${running}`);
  }
  if (other > 0) {
    console.log(`   ${msg.builds.other({ count: other })}`);
  }
  
  const limit = options.limit || 50;
  const offset = options.offset || 0;
  console.log(`\n   ${formatters.secondary(msg.builds.showing({ total, offset, limit }))}`);
}

function getBuildStatusDisplay(build: any): string {
  if (build.building) {
    return formatters.info(jobStatus.running());
  }
  
  const resultMap: Record<string, string> = {
    'SUCCESS': jobStatus.success(),
    'FAILURE': jobStatus.failed(),
    'UNSTABLE': jobStatus.unstable(),
    'ABORTED': jobStatus.aborted(),
    'NOT_BUILT': `${icons.skipped}  ${msg.builds.notBuilt()}`,
  };
  
  return resultMap[build.result] || formatters.secondary(build.result || msg.builds.unknown());
}
