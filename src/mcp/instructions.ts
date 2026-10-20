export interface InstructionsOptions {
  readOnly?: boolean;
  allowCreateConfig?: boolean;
}

/**
 * Instrucciones que el servidor envía al cliente MCP al conectarse. Se añaden al
 * contexto del modelo, así que deben ser breves y coincidir con las tools reales.
 */
export function buildInstructions(options: InstructionsOptions = {}): string {
  const readOnly = Boolean(options.readOnly);
  const canCreate = Boolean(options.allowCreateConfig) && !readOnly;

  const lines = [
    "Servidor MCP de Butler CI CLI para consultar y operar Jenkins.",
    "",
    "Entorno",
    "- Todas las herramientas actúan sobre el entorno de Jenkins activo. Empieza con get_config para ver cuál es y qué entornos hay guardados; cambia con use_config.",
    "- Si no hay entorno activo, pide al usuario que elija uno de los guardados.",
    ...(canCreate ? ["- create_config crea un entorno nuevo; recibe el API token por la conversación, úsala solo si el usuario te lo pide."] : []),
    "- Si una búsqueda o un listado vuelve vacío sin motivo, comprueba get_config: puede ser el entorno equivocado o credenciales inválidas.",
    "",
    "Jobs y builds",
    '- Un job se identifica por su ruta completa, con "/" entre carpetas (p. ej. "backend/api-service/deploy"). No la adivines: localízala con search_jobs o list_jobs.',
    '- El parámetro build acepta un número o "latest".',
    "- Para diagnosticar un fallo: get_last_build o list_builds (status FAILURE), después get_build_steps para ver qué stage falló y get_build_logs, que devuelve las últimas líneas, donde suele estar el error (sube tailLines si hace falta).",
    "- Para un build en ejecución usa follow_build_logs: empieza con start=0 y repite con el nextStart devuelto mientras hasMore sea true.",
    "",
    "Acciones con efectos",
    "- trigger_build y abort_build actúan sobre Jenkins de verdad. Antes de lanzar un build consulta get_job_params y usa esos nombres de parámetros; antes de abortar, comprueba el número de build. Confirma con el usuario y no las encadenes por tu cuenta.",
    "- delete_config borra un entorno de forma permanente: confirma antes. update_config modifica los guardados.",
    "- Las herramientas nunca devuelven tokens.",
    "",
    "Herramientas desactivadas",
    "- Las marcadas como DESACTIVADA devuelven un error que indica qué opción las activa. No las sustituyas por otras herramientas: explícaselo al usuario.",
  ];

  if (readOnly) {
    lines.push(
      "- Este servidor está en modo solo lectura: trigger_build, abort_build, download_build_logs, create_config, update_config y delete_config están desactivadas. use_config sigue disponible."
    );
  }

  return lines.join("\n");
}
