import { getJenkinsClient } from "./jenkinsClient";
import { join } from "node:path";
import { homedir } from "node:os";
import { logger } from "./logger";
import { formatters } from "./formatters";

export interface JenkinsJob {
  name: string;
  url: string;
  _class: string;
  fullName?: string;
  color?: string;
}

export interface JenkinsFolder {
  name: string;
  url: string;
  _class: string;
  fullName?: string;
  jobs?: JenkinsJob[];
}

export interface JobTreeItem {
  name: string;
  fullName: string;
  type: 'job' | 'folder';
  url: string;
  level: number;
  color?: string;
}

export interface BuildInfo {
  number: number;
  url: string;
  result: string | null;
  timestamp: number;
  duration: number;
  building: boolean;
  displayName?: string;
  fullDisplayName?: string;
  description?: string | null;
}

/**
 * Obtiene todos los items (jobs y carpetas) de forma recursiva
 */
export async function getAllJobsRecursive(path: string = ""): Promise<JobTreeItem[]> {
  const jenkins = getJenkinsClient();
  
  try {
    const url = buildApiUrl(path);
    const response = await jenkins.get(url);
    
    if (!response.data?.jobs) {
      return [];
    }
    
    const items: JobTreeItem[] = [];
    for (const item of response.data.jobs) {
      const processedItems = await processJenkinsItem(item, path);
      items.push(...processedItems);
    }
    
    return items;
  } catch (error: any) {
    logger.error(formatters.error(`Error obteniendo items de ${path || 'raíz'}: ${error.message}`));
    return [];
  }
}

/**
 * Construye la URL de la API para un path dado
 */
function buildApiUrl(path: string): string {
  return path ? `/job/${path.replace(/\//g, '/job/')}/api/json` : '/api/json';
}

/**
 * Procesa un item de Jenkins y sus sub-items si es una carpeta
 */
async function processJenkinsItem(item: any, parentPath: string): Promise<JobTreeItem[]> {
  const fullName = parentPath ? `${parentPath}/${item.name}` : item.name;
  const level = parentPath ? parentPath.split('/').length : 0;
  
  const currentItem: JobTreeItem = {
    name: item.name,
    fullName,
    type: isFolder(item._class) ? 'folder' : 'job',
    url: item.url,
    level,
    color: item.color
  };
  
  const items = [currentItem];
  
  if (isFolder(item._class)) {
    const subItems = await getAllJobsRecursive(fullName);
    items.push(...subItems);
  }
  
  return items;
}

/**
 * Obtiene solo los jobs (no carpetas) de forma recursiva
 */
export async function getAllJobs(path: string = ""): Promise<JobTreeItem[]> {
  const allItems = await getAllJobsRecursive(path);
  return allItems.filter(item => item.type === 'job');
}

/**
 * Obtiene información detallada de un job específico por su fullName
 */
export async function getJobInfo(jobFullName: string): Promise<any> {
  const jenkins = getJenkinsClient();
  
  try {
    const jobPath = jobFullName.replace(/\//g, '/job/');
    const response = await jenkins.get(`/job/${jobPath}/api/json`);
    return response.data;
  } catch (error: any) {
    throw new Error(`Error obteniendo información del job ${jobFullName}: ${error.message}`);
  }
}

/**
 * Obtiene el último build de un job específico por su fullName
 */
export async function getLastBuild(jobFullName: string): Promise<any> {
  const jenkins = getJenkinsClient();
  
  try {
    const jobPath = jobFullName.replace(/\//g, '/job/');
    const response = await jenkins.get(`/job/${jobPath}/lastBuild/api/json`);
    return response.data;
  } catch (error: any) {
    throw new Error(`Error obteniendo último build del job ${jobFullName}: ${error.message}`);
  }
}

/**
 * Obtiene información básica de un build específico
 */
export async function getBuildInfo(
  jobFullName: string,
  buildNumber: number | string
): Promise<BuildInfo> {
  const jenkins = getJenkinsClient();
  
  try {
    const jobPath = jobFullName.replace(/\//g, '/job/');
    const response = await jenkins.get(`/job/${jobPath}/${buildNumber}/api/json?tree=number,url,result,timestamp,duration,building,displayName,fullDisplayName,description`);
    return response.data;
  } catch (error: any) {
    throw new Error(`Error obteniendo información del build #${buildNumber} del job ${jobFullName}: ${error.message}`);
  }
}

/**
 * Determina si un item es una carpeta basándose en su clase
 */
function isFolder(itemClass: string): boolean {
  const folderClasses = [
    'com.cloudbees.hudson.plugins.folder.Folder',
    'jenkins.branch.OrganizationFolder',
    'org.jenkinsci.plugins.workflow.multibranch.WorkflowMultiBranchProject',
    'hudson.model.Folder'
  ];
  
  return folderClasses.includes(itemClass);
}

/**
 * Busca jobs por nombre en toda la estructura de carpetas
 */
export async function findJobsByName(searchTerm: string): Promise<JobTreeItem[]> {
  const allJobs = await getAllJobs();
  return allJobs.filter(job => 
    job.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    job.fullName.toLowerCase().includes(searchTerm.toLowerCase())
  );
}

/**
 * Obtiene la estructura de carpetas hasta un nivel específico
 */
export async function getFolderStructure(maxLevel: number = 2): Promise<JobTreeItem[]> {
  const allItems = await getAllJobsRecursive();
  return allItems.filter(item => item.level <= maxLevel);
}

/**
 * Interfaz para representar un parámetro de un job
 */
export interface JobParameter {
  name: string;
  type: string;
  description?: string;
  defaultValue?: any;
  choices?: string[];
}

/**
 * Obtiene los parámetros que necesita un job para ejecutarse
 */
export async function getJobParameters(jobFullName: string): Promise<JobParameter[]> {
  const jenkins = getJenkinsClient();
  
  try {
    const jobPath = jobFullName.replace(/\//g, '/job/');
    const response = await jenkins.get(`/job/${jobPath}/api/json`);
    const jobData = response.data;
    
    // Los parámetros están en property con _class que contiene "ParametersDefinitionProperty"
    const paramProperty = jobData.property?.find(
      (p: any) => p._class?.includes("ParametersDefinitionProperty")
    );
    
    if (!paramProperty?.parameterDefinitions) {
      return [];
    }
    
    // Mapear los parámetros a nuestro formato
    return paramProperty.parameterDefinitions.map((param: any) => {
      const parameter: JobParameter = {
        name: param.name,
        type: getParameterType(param._class),
        description: param.description || undefined,
        defaultValue: getDefaultValue(param),
      };
      
      // Si es un choice parameter, añadir las opciones
      if (param._class?.includes("ChoiceParameterDefinition") && param.choices) {
        parameter.choices = param.choices;
      }
      
      return parameter;
    });
  } catch (error: any) {
    throw new Error(`Error obteniendo parámetros del job ${jobFullName}: ${error.message}`);
  }
}

/**
 * Extrae el tipo de parámetro simplificado del nombre de clase
 */
function getParameterType(className: string): string {
  if (!className) return "unknown";
  
  const typeMap: { [key: string]: string } = {
    "StringParameterDefinition": "string",
    "BooleanParameterDefinition": "boolean",
    "ChoiceParameterDefinition": "choice",
    "PasswordParameterDefinition": "password",
    "TextParameterDefinition": "text",
    "FileParameterDefinition": "file",
  };
  
  for (const [key, value] of Object.entries(typeMap)) {
    if (className.includes(key)) {
      return value;
    }
  }
  
  return className.split('.').pop() || "unknown";
}

/**
 * Extrae el valor por defecto de un parámetro
 */
function getDefaultValue(param: any): any {
  // Para parámetros booleanos
  if (param._class?.includes("BooleanParameterDefinition")) {
    return param.defaultParameterValue?.value ?? false;
  }
  
  // Para otros tipos de parámetros
  if (param.defaultParameterValue) {
    return param.defaultParameterValue.value;
  }
  
  return undefined;
}

/**
 * Ejecuta un build de un job con los parámetros proporcionados
 */
export async function buildJob(
  jobFullName: string,
  parameters?: { [key: string]: any }
): Promise<{ queueUrl: string; message: string }> {
  const jenkins = getJenkinsClient();
  
  try {
    const jobPath = jobFullName.replace(/\//g, '/job/');
    
    // Si el job tiene parámetros, usar buildWithParameters, sino build
    let endpoint: string;
    let formData: URLSearchParams | undefined;
    
    if (parameters && Object.keys(parameters).length > 0) {
      endpoint = `/job/${jobPath}/buildWithParameters`;
      formData = new URLSearchParams();
      
      // Añadir cada parámetro al formulario
      for (const [key, value] of Object.entries(parameters)) {
        formData.append(key, String(value));
      }
    } else {
      endpoint = `/job/${jobPath}/build`;
    }
    
    // Jenkins retorna una respuesta 201 con el location de la cola
    const response = await jenkins.post(endpoint, formData, {
      headers: formData ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}
    });
    
    const queueUrl = response.headers.location || response.headers.Location || "";
    
    return {
      queueUrl,
      message: "Build iniciado correctamente"
    };
  } catch (error: any) {
    throw new Error(`Error ejecutando build del job ${jobFullName}: ${error.message}`);
  }
}

/**
 * Obtiene los logs de un build específico
 */
export async function getBuildLogs(
  jobFullName: string,
  buildNumber: number | string
): Promise<string> {
  const jenkins = getJenkinsClient();
  
  try {
    const jobPath = jobFullName.replace(/\//g, '/job/');
    const endpoint = `/job/${jobPath}/${buildNumber}/consoleText`;
    
    const response = await jenkins.get(endpoint, {
      responseType: 'text',
      headers: {
        'Accept': 'text/plain'
      }
    });
    
    return response.data;
  } catch (error: any) {
    throw new Error(`Error obteniendo logs del build #${buildNumber} del job ${jobFullName}: ${error.message}`);
  }
}

/**
 * Interfaz para el resultado de logs progresivos
 */
export interface ProgressiveLogResult {
  text: string;
  hasMore: boolean;
  size: number;
}

/**
 * Obtiene los logs de un build de forma progresiva (streaming)
 * Usa el endpoint logText/progressiveText para obtener solo los nuevos logs
 */
export async function getProgressiveBuildLogs(
  jobFullName: string,
  buildNumber: number | string,
  start: number = 0
): Promise<ProgressiveLogResult> {
  const jenkins = getJenkinsClient();
  
  try {
    const jobPath = jobFullName.replace(/\//g, '/job/');
    const endpoint = `/job/${jobPath}/${buildNumber}/logText/progressiveText?start=${start}`;
    
    const response = await jenkins.get(endpoint, {
      responseType: 'text',
      headers: {
        'Accept': 'text/plain'
      }
    });
    
    // Jenkins devuelve el header X-Text-Size con el tamaño actual del log
    // y X-More-Data con 'true' si hay más datos disponibles
    const textSize = parseInt(response.headers['x-text-size'] || '0', 10);
    const hasMore = response.headers['x-more-data'] === 'true';
    
    return {
      text: response.data || '',
      hasMore,
      size: textSize
    };
  } catch (error: any) {
    throw new Error(`Error obteniendo logs progresivos del build #${buildNumber} del job ${jobFullName}: ${error.message}`);
  }
}

/**
 * Descarga los logs de un build a un archivo
 */
export async function downloadBuildLogs(
  jobFullName: string,
  buildNumber: number | string,
  outputPath?: string
): Promise<string> {
  const logs = await getBuildLogs(jobFullName, buildNumber);
  
  // Si no se especifica ruta, usar directorio por defecto
  if (!outputPath) {
    const logsDir = join(homedir(), ".butler-ci-cli", "logs");
    const { mkdirSync, existsSync } = await import("node:fs");
    
    if (!existsSync(logsDir)) {
      mkdirSync(logsDir, { recursive: true });
    }
    
    // Crear nombre de archivo: job-name_build-123_timestamp.log
    const sanitizedJobName = jobFullName.replace(/\//g, '_');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const fileName = `${sanitizedJobName}_build-${buildNumber}_${timestamp}.log`;
    outputPath = join(logsDir, fileName);
  }

  const { writeFileSync } = await import("node:fs");
  writeFileSync(outputPath, logs, 'utf8');
  
  return outputPath;
}

/**
 * Interface for build list filter options
 */
export interface BuildListOptions {
  status?: string;
  branch?: string;
  startDate?: Date;
  endDate?: Date;
  offset?: number;
  limit?: number;
  sortBy?: 'number' | 'timestamp';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Obtiene una lista de builds de un job con opciones de filtrado y paginación
 */
export async function getBuilds(
  jobFullName: string,
  options: BuildListOptions = {}
): Promise<BuildInfo[]> {
  const jenkins = getJenkinsClient();
  
  try {
    const jobPath = jobFullName.replace(/\//g, '/job/');
    
    // Obtener información del job para acceder a todos sus builds
    // Jenkins API tree parameter permite obtener builds con sus detalles
    const treeParams = 'builds[number,url,result,timestamp,duration,building,displayName,fullDisplayName,description]';
    const response = await jenkins.get(`/job/${jobPath}/api/json?tree=${treeParams}`);
    
    if (!response.data?.builds) {
      return [];
    }
    
    let builds: BuildInfo[] = response.data.builds;
    
    // Aplicar filtros
    if (options.status) {
      const statusFilter = options.status.toUpperCase();
      builds = builds.filter(build => {
        if (!build.result && statusFilter === 'RUNNING') {
          return build.building;
        }
        return build.result === statusFilter;
      });
    }
    
    if (options.startDate) {
      builds = builds.filter(build => build.timestamp >= options.startDate!.getTime());
    }
    
    if (options.endDate) {
      builds = builds.filter(build => build.timestamp <= options.endDate!.getTime());
    }
    
    // Note: branch filtering requires examining build parameters or changeSet
    // which is more expensive. We'll skip it for now unless explicitly needed
    // in the actual implementation based on Jenkins setup
    
    // Ordenar
    const sortBy = options.sortBy || 'number';
    const sortOrder = options.sortOrder || 'desc';
    
    builds.sort((a, b) => {
      const aValue = sortBy === 'number' ? a.number : a.timestamp;
      const bValue = sortBy === 'number' ? b.number : b.timestamp;
      
      if (sortOrder === 'asc') {
        return aValue - bValue;
      } else {
        return bValue - aValue;
      }
    });
    
    // Aplicar paginación
    const offset = options.offset || 0;
    const limit = options.limit || 50;
    
    return builds.slice(offset, offset + limit);
  } catch (error: any) {
    throw new Error(`Error obteniendo builds del job ${jobFullName}: ${error.message}`);
  }
}

/**
 * Interface for workflow step information
 */
export interface WorkflowStep {
  id: string;
  name: string;
  status: string;
  startTimeMillis?: number;
  durationMillis?: number;
  pauseDurationMillis?: number;
  error?: {
    message: string;
    type: string;
  };
}

/**
 * Interface for workflow stage information
 */
export interface WorkflowStage {
  id: string;
  name: string;
  status: string;
  startTimeMillis?: number;
  durationMillis?: number;
  pauseDurationMillis?: number;
  stageFlowNodes?: WorkflowStep[];
}

/**
 * Obtiene los pasos (steps) de un build específico de un workflow job
 * Usa la API wfapi que está disponible cuando el Pipeline Stage View Plugin está instalado
 */
export async function getWorkflowSteps(
  jobFullName: string,
  buildNumber: number | string
): Promise<WorkflowStage[]> {
  const jenkins = getJenkinsClient();
  
  try {
    const jobPath = jobFullName.replace(/\//g, '/job/');
    
    // Intentar usar la API wfapi primero (Pipeline Stage View Plugin)
    try {
      const response = await jenkins.get(`/job/${jobPath}/${buildNumber}/wfapi/describe`);
      
      if (response.data?.stages) {
        return response.data.stages.map((stage: any) => ({
          id: stage.id || '',
          name: stage.name || 'Unknown',
          status: stage.status || 'UNKNOWN',
          startTimeMillis: stage.startTimeMillis,
          durationMillis: stage.durationMillis,
          pauseDurationMillis: stage.pauseDurationMillis,
          stageFlowNodes: stage.stageFlowNodes?.map((step: any) => ({
            id: step.id || '',
            name: step.name || 'Unknown',
            status: step.status || 'UNKNOWN',
            startTimeMillis: step.startTimeMillis,
            durationMillis: step.durationMillis,
            pauseDurationMillis: step.pauseDurationMillis,
            error: step.error ? {
              message: step.error.message || '',
              type: step.error.type || ''
            } : undefined
          })) || []
        }));
      }
    } catch (wfapiError: any) {
      // Si wfapi no está disponible, intentar obtener información del build estándar
      logger.debug(`wfapi no disponible, intentando método alternativo: ${wfapiError.message}`);
    }
    
    // Método alternativo: obtener información básica del build
    // Esto proporciona menos detalles pero funciona sin plugins adicionales
    const buildResponse = await jenkins.get(`/job/${jobPath}/${buildNumber}/api/json`);
    const buildData = buildResponse.data;
    
    // Buscar acciones que contengan información de ejecución
    const executionAction = buildData.actions?.find(
      (action: any) => action._class?.includes('FlowGraphAction') || 
                       action._class?.includes('FlowExecutionList')
    );
    
    if (executionAction) {
      // Si encontramos información de flujo, retornarla
      const stages: WorkflowStage[] = [];
      
      // Construir una vista básica del build como un solo stage
      stages.push({
        id: '1',
        name: 'Build Execution',
        status: buildData.result || (buildData.building ? 'IN_PROGRESS' : 'UNKNOWN'),
        startTimeMillis: buildData.timestamp,
        durationMillis: buildData.duration,
        stageFlowNodes: []
      });
      
      return stages;
    }
    
    // Si no hay información de workflow, retornar un stage genérico
    return [{
      id: '1',
      name: 'Build',
      status: buildData.result || (buildData.building ? 'IN_PROGRESS' : 'UNKNOWN'),
      startTimeMillis: buildData.timestamp,
      durationMillis: buildData.duration,
      stageFlowNodes: []
    }];
    
  } catch (error: any) {
    throw new Error(`Error obteniendo pasos del build #${buildNumber} del job ${jobFullName}: ${error.message}`);
  }
}