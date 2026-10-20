import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { configManager, getJenkinsConfig, type JenkinsConfig } from "../utils/config";
import { resetJenkinsClient } from "../utils/jenkinsClient";
import { fail, json, safe } from "./helpers";

// El nombre se usa para construir la ruta del fichero: se restringe para evitar '../'.
const configName = z
  .string()
  .regex(/^[A-Za-z0-9][A-Za-z0-9._-]*$/, "Solo letras, números, '.', '_' y '-'")
  .describe("Nombre de la configuración (entorno)");

const jenkinsUrl = z
  .string()
  .refine((value) => /^https?:\/\/[^\s/]+/.test(value), "Debe ser una URL http(s)")
  .describe("URL base de Jenkins, p. ej. https://jenkins.example.com");

const preferences = z
  .object({
    editor: z.string().optional(),
    logViewer: z.string().optional(),
    downloadLogsDir: z.string().optional(),
  })
  .describe("Preferencias del CLI; una cadena vacía borra el valor");

/** Vista de una configuración sin el token. */
function publicView(config: JenkinsConfig) {
  return {
    name: config.name,
    url: config.url,
    username: config.username,
    description: config.description,
    preferences: config.preferences,
  };
}

export function registerConfigTools(
  server: McpServer,
  options: { readOnly?: boolean; allowCreateConfig?: boolean }
): void {
  server.registerTool(
    "get_config",
    {
      title: "Entornos de Jenkins",
      description:
        "Devuelve el entorno de Jenkins activo y todos los guardados (URL y usuario, nunca el token).",
      annotations: { readOnlyHint: true },
    },
    safe(() => {
      const active = getJenkinsConfig();
      const saved = configManager
        .listConfigs()
        .map((name) => configManager.loadConfig(name))
        .filter((config): config is JenkinsConfig => config !== null);
      return json({
        active: active ? publicView(active) : null,
        activeSource: active?.name === "env-fallback" ? "variables de entorno" : "configuración guardada",
        configs: saved.map(publicView),
      });
    })
  );

  server.registerTool(
    "use_config",
    {
      title: "Cambiar de entorno",
      description:
        "Activa otro entorno de Jenkins guardado. Las siguientes tools usarán ese servidor. " +
        "Cambia también el entorno activo del CLI (persistente).",
      inputSchema: { name: configName },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    },
    safe(({ name }: { name: string }) => {
      const config = configManager.loadConfig(name);
      if (!config) {
        return fail(`No existe la configuración '${name}'. Disponibles: ${configManager.listConfigs().join(", ") || "ninguna"}`);
      }
      if (!configManager.setCurrentConfig(name)) {
        return fail(`No se pudo activar la configuración '${name}'`);
      }
      resetJenkinsClient();
      return json({ active: publicView(config) });
    })
  );

  if (options.readOnly) return;

  if (options.allowCreateConfig) {
    server.registerTool(
      "create_config",
      {
        title: "Crear un entorno",
        description: "Guarda un nuevo entorno de Jenkins con su URL, usuario y API token.",
        inputSchema: {
          name: configName,
          url: jenkinsUrl,
          username: z.string().min(1).describe("Usuario de Jenkins"),
          token: z.string().min(1).describe("API token de Jenkins"),
          description: z.string().optional(),
          setActive: z.boolean().default(true).describe("Activar el entorno tras crearlo"),
        },
        annotations: { readOnlyHint: false, destructiveHint: false },
      },
      safe(
        (args: {
          name: string;
          url: string;
          username: string;
          token: string;
          description?: string;
          setActive: boolean;
        }) => {
          if (configManager.listConfigs().includes(args.name)) {
            return fail(`Ya existe una configuración llamada '${args.name}'. Usa update_config para modificarla.`);
          }
          const config: JenkinsConfig = {
            name: args.name,
            url: args.url.trim(),
            username: args.username.trim(),
            token: args.token.trim(),
            description: args.description?.trim() || undefined,
          };
          configManager.saveConfig(config);
          if (args.setActive) {
            configManager.setCurrentConfig(config.name);
            resetJenkinsClient();
          }
          return json({ created: publicView(config), active: args.setActive });
        }
      )
    );
  }

  server.registerTool(
    "update_config",
    {
      title: "Modificar un entorno",
      description:
        "Modifica URL, usuario, token, descripción o preferencias de un entorno guardado. " +
        "Solo se cambian los campos indicados.",
      inputSchema: {
        name: configName,
        url: jenkinsUrl.optional(),
        username: z.string().min(1).optional(),
        token: z.string().min(1).optional(),
        description: z.string().optional(),
        preferences: preferences.optional(),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    },
    safe(
      (args: {
        name: string;
        url?: string;
        username?: string;
        token?: string;
        description?: string;
        preferences?: { editor?: string; logViewer?: string; downloadLogsDir?: string };
      }) => {
        const config = configManager.loadConfig(args.name);
        if (!config) return fail(`No existe la configuración '${args.name}'`);

        const updated: JenkinsConfig = {
          ...config,
          url: args.url?.trim() ?? config.url,
          username: args.username?.trim() ?? config.username,
          token: args.token?.trim() ?? config.token,
          description: args.description === undefined ? config.description : args.description.trim() || undefined,
        };
        if (args.preferences) {
          const merged = { ...config.preferences, ...args.preferences };
          for (const key of Object.keys(merged) as (keyof typeof merged)[]) {
            if (merged[key] === "") delete merged[key];
          }
          updated.preferences = Object.keys(merged).length > 0 ? merged : undefined;
        }

        configManager.saveConfig(updated);
        if (configManager.getCurrentConfig() === updated.name) resetJenkinsClient();
        return json({ updated: publicView(updated) });
      }
    )
  );

  server.registerTool(
    "delete_config",
    {
      title: "Eliminar un entorno",
      description:
        "Elimina un entorno guardado de forma permanente. Si era el activo, no quedará ninguno activo. " +
        "Confirma con el usuario antes de usarla.",
      inputSchema: { name: configName },
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true },
    },
    safe(({ name }: { name: string }) => {
      if (!configManager.loadConfig(name)) return fail(`No existe la configuración '${name}'`);
      const wasActive = configManager.getCurrentConfig() === name;
      if (!configManager.deleteConfig(name)) return fail(`No se pudo eliminar la configuración '${name}'`);
      if (wasActive) resetJenkinsClient();
      return json({ deleted: name, wasActive, remaining: configManager.listConfigs() });
    })
  );
}
