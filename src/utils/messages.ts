/**
 * Mensajes y literales de la aplicación
 * Este archivo centraliza todos los textos para facilitar la internacionalización futura
 */
import { icons } from './icons';

export const messages = {
  // Errores generales
  errors: {
    noConfig: 'No se encontró configuración de Jenkins.',
    noActiveConfig: 'No hay una configuración activa.',
    configNotFound: (name: string) => `No se encontró la configuración "${name}".`,
    jobNotFound: (job: string) => `Error: No se encontró el job "${job}".`,
    jobNotExecutable: (job: string) => `El job "${job}" no es ejecutable.`,
    buildError: (job: string, error: string) => `Error ejecutando build del job ${job}: ${error}`,
    logsError: (build: number, job: string, error: string) => 
      `Error obteniendo logs del build #${build} del job ${job}: ${error}`,
    noLogsAvailable: 'No hay logs disponibles para este build.',
    noBuildHistory: 'Este job no tiene builds.',
    editorNotConfigured: 'No se encontró un editor configurado.',
    fileNotFound: (path: string) => `El archivo ${path} no existe`,
    permissionDenied: 'Error de permisos al descargar.',
    openingEditor: 'Error abriendo editor',
    generic: 'Error',
  },

  // Sugerencias
  hints: {
    createConfig: "Usa 'butler-ci-cli config create' para crear una configuración.",
    activateConfig: "Usa 'butler-ci-cli config use <nombre>' para activar una configuración.",
    editConfig: "Usa 'butler-ci-cli config edit <nombre>' o activa una configuración primero.",
    configureEditor: "Configura uno con: butler-ci-cli config edit <nombre> --editor <editor>",
  },

  // Éxitos
  success: {
    configCreated: (name: string) => `Configuración "${name}" creada exitosamente.`,
    configDeleted: (name: string) => `Configuración "${name}" eliminada.`,
    configActivated: (name: string) => `Configuración "${name}" activada.`,
    preferencesUpdated: (name: string) => `Preferencias actualizadas para "${name}"`,
    jobsFetched: (count: number) => `${count} jobs guardados para sugerencias futuras.`,
    buildStarted: 'Build iniciado correctamente',
    logsDownloaded: 'Logs descargados exitosamente!',
    editorOpened: 'Editor abierto.',
  },

  // Información
  info: {
    fetchingJobs: 'Obteniendo todos los jobs (incluyendo carpetas)...',
    fetchingJobInfo: (job: string) => `Obteniendo información del job: ${job}`,
    fetchingBuildInfo: (job: string) => `Obteniendo información del último build del job: ${job}`,
    fetchingParams: (job: string) => `Obteniendo parámetros del job: ${job}`,
    preparingBuild: (job: string) => `Preparando build del job: ${job}`,
    fetchingLogs: (build: string, job: string) => `Obteniendo logs del build #${build} del job: ${job}`,
    downloadingLogs: 'Descargando logs del build',
    resolvingLatest: "Resolviendo 'latest' al último build...",
    latestBuildFound: (build: number) => `Último build encontrado: #${build}`,
    usingCliParams: 'Usando parámetros proporcionados por CLI',
    openingEditor: (editor: string) => `Abriendo logs en ${editor}`,
    openingInEditor: (editor: string) => `Abriendo logs en ${editor}`,
    usingDefaultEditor: (editor: string) => `${icons.idea} Usando editor: ${editor} (no configurado, usando por defecto)`,
    noEditorConfigured: `${icons.warning}  No se encontró un editor configurado.`,
    configureEditorHint: `${icons.idea} Configura uno con: butler-ci-cli config edit <nombre> --editor <editor>`,
    editingActiveConfig: (name: string) => `Editando configuración activa: ${name}`,
  },

  // Títulos y etiquetas
  labels: {
    jobInfo: 'Información del Job:',
    buildInfo: 'Información del Último Build:',
    jobParams: 'Parámetros del Job:',
    buildLogs: (build: number) => `Logs del Build #${build}`,
    preferences: 'Preferencias actuales:',
    activeConfig: 'Configuración Activa:',
    availableConfigs: 'Configuraciones Disponibles:',
    configDetails: 'Detalles de la Configuración:',
    
    // Campos
    name: 'Nombre:',
    fullName: 'Nombre completo:',
    url: 'URL:',
    description: 'Descripción:',
    lastBuild: 'Último build:',
    lastSuccessfulBuild: 'Último build exitoso:',
    lastFailedBuild: 'Último build fallido:',
    type: 'Tipo:',
    status: 'Estado:',
    executable: 'Ejecutable:',
    result: 'Resultado:',
    duration: 'Duración:',
    started: 'Iniciado:',
    finished: 'Finalizado:',
    startedBy: 'Iniciado por:',
    buildNumber: 'Número de build:',
    default: 'Default:',
    options: 'Opciones:',
    editor: 'Editor:',
    logViewer: 'Visor de logs:',
    logsDir: 'Dir. de logs:',
    location: 'Ubicación:',
    queueUrl: 'Queue URL:',
    fileSavedAt: 'Archivo guardado en',
    fromJob: 'del job',
  },

  // Prompts y preguntas
  prompts: {
    confirmBuild: '¿Confirmas que quieres ejecutar este build?',
    confirmDelete: (name: string) => `¿Estás seguro que quieres eliminar la configuración "${name}"?`,
    selectConfigToDelete: 'Selecciona la configuración a eliminar:',
    configName: 'Nombre de la configuración:',
    jenkinsUrl: 'URL del servidor Jenkins:',
    username: 'Usuario:',
    token: 'Token de API:',
    description: 'Descripción (opcional):',
    setAsActive: 'Establecer como configuración activa:',
    editorPreferred: 'Editor preferido para archivos (code, vim, nano, etc.):',
    logViewer: 'Visor de logs (deja vacío para usar el editor principal):',
    logsDirectory: 'Directorio para descargar logs (deja vacío para usar ~/.butler-ci-cli/logs):',
    downloadLogsDir: 'Directorio para descargar logs (deja vacío para usar ~/.butler-ci-cli/logs):',
  },

  // Valores por defecto y placeholders
  values: {
    noDescription: 'Sin descripción',
    noBuild: 'Ninguno',
    useEditorPrimary: '(usa el editor principal)',
    defaultLogsDir: '(~/.butler-ci-cli/logs)',
    notConfigured: '(no configurado)',
  },

  // Estados de jobs
  jobStatus: {
    success: `${icons.success} Exitoso`,
    failed: `${icons.error} Fallido`,
    unstable: `${icons.warning} Inestable`,
    disabled: `${icons.disabled} Deshabilitado`,
    aborted: `${icons.aborted} Abortado`,
    running: `${icons.running} Ejecutándose`,
    runningSuccess: `${icons.running} Ejecutándose (exitoso)`,
    runningFailed: `${icons.running} Ejecutándose (fallido)`,
    runningUnstable: `${icons.running} Ejecutándose (inestable)`,
    yes: 'Sí',
    no: 'No',
  },

  // Tipos de jobs
  jobTypes: {
    multiBranch: 'Multi-branch Pipeline',
    folder: 'Carpeta',
    pipeline: 'Pipeline',
    freestyle: 'Freestyle',
  },

  // Tipos de parámetros
  paramTypes: {
    string: 'string',
    boolean: 'boolean',
    choice: 'choice',
    password: 'password',
    text: 'text',
    file: 'file',
    unknown: 'unknown',
  },

  // Warnings
  warnings: {
    noParams: 'Este job no tiene parámetros configurados.',
    noJobsFound: 'No se encontraron jobs.',
    buildCancelled: 'Build cancelado.',
  },

  // Separadores y formato
  formatting: {
    separator: icons.separator.repeat(80),
    separator2: '='.repeat(80),
    endOfLogs: (lines: number) => `Fin de los logs (${lines} líneas)`,
  },

  // Iconos/emojis
  //
  // El juego concreto (emoji o ASCII) lo decide `utils/icons`, en función del
  // terminal y de `BUTLER_ICONS`.
  icons,
};

// Helper para acceder a mensajes de forma segura
export const msg = messages;
