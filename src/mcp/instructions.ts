export interface InstructionsOptions {
  readOnly?: boolean;
  allowCreateConfig?: boolean;
  /** Contexto escrito por el dueño de la instalación (ver context.ts). */
  userContext?: string;
}

/**
 * Instrucciones que el servidor envía al cliente MCP al conectarse. Se añaden al
 * contexto del modelo, así que van en inglés (menos tokens) y deben ser breves y
 * coincidir con las tools reales.
 */
export function buildInstructions(options: InstructionsOptions = {}): string {
  const readOnly = Boolean(options.readOnly);
  const canCreate = Boolean(options.allowCreateConfig) && !readOnly;

  const lines = [
    "Butler CI CLI MCP server: query and operate Jenkins.",
    "",
    "Environment",
    "- Every tool acts on the active Jenkins environment. Start with get_config to see the active one and the saved ones; switch with use_config.",
    "- If none is active, ask the user which saved environment to use.",
    ...(canCreate ? ["- create_config adds a new environment; it receives the API token through the conversation, so use it only when the user asks."] : []),
    "- If a search or list comes back empty unexpectedly, check get_config: a wrong environment or invalid credentials are the usual cause.",
    "",
    "Jobs and builds",
    '- A job is identified by its full path with "/" between folders (e.g. "backend/api-service/deploy"). Do not guess it: find it with search_jobs or list_jobs.',
    '- The build parameter takes a number or "latest".',
    "- To diagnose a failure: get_last_build or list_builds (status FAILURE), then get_build_steps to see which stage failed and get_build_logs, which returns the last lines, where the error usually is (raise tailLines if needed).",
    "- For a running build use follow_build_logs: start with start=0 and repeat with the returned nextStart while hasMore is true.",
    "",
    "Actions with side effects",
    "- trigger_build and abort_build act on Jenkins for real. Before triggering, call get_job_params and use exactly those parameter names; before aborting, verify the build number. Confirm with the user and do not chain them on your own.",
    "- delete_config permanently removes an environment: confirm first. update_config edits saved ones.",
    "- Tools never return tokens.",
    "",
    "Disabled tools",
    "- Tools marked DISABLED return an error saying which option enables them. Do not work around them with other tools: tell the user.",
    ...(readOnly
      ? ["- This server is read-only: trigger_build, abort_build, download_build_logs, create_config, update_config and delete_config are disabled. use_config still works."]
      : []),
    "",
    "Reply to the user in their language.",
  ];

  const userContext = options.userContext?.trim();
  if (userContext) {
    lines.push(
      "",
      "Installation context",
      "Written by the owner of this Jenkins installation. Prefer it over your own assumptions about which jobs, parameters and flow to use. It may refer to environments by name: check get_config for the active one.",
      "",
      userContext
    );
  }

  return lines.join("\n");
}
