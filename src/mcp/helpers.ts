import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getJenkinsConfig } from "../utils/config";

export type ToolResult = { content: { type: "text"; text: string }[]; isError?: boolean };

export function json(data: unknown): ToolResult {
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
}

export function text(value: string): ToolResult {
  return { content: [{ type: "text", text: value }] };
}

export function fail(message: string): ToolResult {
  return { content: [{ type: "text", text: message }], isError: true };
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** Convierte las excepciones en errores de la tool en lugar de romper la petición. */
export function safe<A>(handler: (args: A) => Promise<ToolResult> | ToolResult) {
  return async (args: A): Promise<ToolResult> => {
    try {
      return await handler(args);
    } catch (error: unknown) {
      return fail(errorMessage(error));
    }
  };
}

/**
 * `getJenkinsClient` hace `process.exit(1)` si no hay configuración, lo que
 * mataría el servidor. Se comprueba antes y se devuelve como error de la tool.
 */
export function guarded<A>(handler: (args: A) => Promise<ToolResult>) {
  const run = safe(handler);
  return async (args: A): Promise<ToolResult> => {
    if (!getJenkinsConfig()) {
      return fail(
        "No hay configuración de Jenkins activa. Actívala con la tool use_config " +
          "(o define JENKINS_URL, JENKINS_USER y JENKINS_TOKEN)."
      );
    }
    return run(args);
  };
}

export const WITHOUT_READ_ONLY = "el usuario debe reiniciar el servidor MCP sin la opción --read-only";

/**
 * Registra una tool desactivada que sigue siendo visible: los modelos pequeños
 * no deducen que algo existe pero está apagado, y acaban probando otras tools.
 */
export function registerDisabledTool(server: McpServer, name: string, purpose: string, enableWith: string): void {
  server.registerTool(
    name,
    {
      title: `${name} (desactivada)`,
      description: `DESACTIVADA en este servidor (${purpose}). Si la llamas, devuelve un error que explica cómo activarla.`,
      inputSchema: z.object({}).passthrough(),
      annotations: { readOnlyHint: true },
    },
    async () =>
      fail(
        `${name} está desactivada en este servidor MCP (${purpose}). ` +
          `Para activarla, ${enableWith}. No la sustituyas por otras herramientas.`
      )
  );
}
