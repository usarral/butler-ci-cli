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