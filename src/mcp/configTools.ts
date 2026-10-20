import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { configManager, getJenkinsConfig, type JenkinsConfig } from "../utils/config";
import { resetJenkinsClient } from "../utils/jenkinsClient";
import { fail, json, registerDisabledTool, safe, WITHOUT_READ_ONLY } from "./helpers";

// El nombre se usa para construir la ruta del fichero: se restringe para evitar '../'.
const configName = z
  .string()
  .regex(/^[A-Za-z0-9][A-Za-z0-9._-]*$/, "Letters, numbers, '.', '_' and '-' only")
  .describe("Name of the saved environment");

const jenkinsUrl = z
  .string()
  .refine((value) => /^https?:\/\/[^\s/]+/.test(value), "Must be an http(s) URL")
  .describe("Jenkins base URL, e.g. https://jenkins.example.com");

const preferences = z
  .object({
    editor: z.string().optional(),
    logViewer: z.string().optional(),
    downloadLogsDir: z.string().optional(),
  })
  .describe("CLI preferences; an empty string clears the value");

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
      title: "Jenkins environments",
      description:
        "Return the active Jenkins environment and all saved ones (URL and user, never the token).",
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
        activeSource: active?.name === "env-fallback" ? "environment variables" : "saved configuration",
        configs: saved.map(publicView),
      });
    })
  );

  server.registerTool(
    "use_config",
    {
      title: "Switch environment",
      description:
        "Activate another saved Jenkins environment. Later tool calls will use that server. " +
        "It also changes the CLI's active environment (persistent).",
      inputSchema: { name: configName },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    },
    safe(({ name }: { name: string }) => {
      const config = configManager.loadConfig(name);
      if (!config) {
        return fail(`No saved environment named '${name}'. Available: ${configManager.listConfigs().join(", ") || "none"}`);
      }
      if (!configManager.setCurrentConfig(name)) {
        return fail(`Could not activate environment '${name}'`);
      }
      resetJenkinsClient();
      return json({ active: publicView(config) });
    })
  );

  if (options.allowCreateConfig && !options.readOnly) {
    server.registerTool(
      "create_config",
      {
        title: "Create an environment",
        description: "Save a new Jenkins environment with its URL, username and API token.",
        inputSchema: {
          name: configName,
          url: jenkinsUrl,
          username: z.string().min(1).describe("Jenkins username"),
          token: z.string().min(1).describe("Jenkins API token"),
          description: z.string().optional(),
          setActive: z.boolean().default(true).describe("Activate the environment after creating it"),
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
            return fail(`An environment named '${args.name}' already exists. Use update_config to modify it.`);
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
  } else {
    registerDisabledTool(
      server,
      "create_config",
      "create Jenkins environments",
      options.readOnly
        ? `${WITHOUT_READ_ONLY} and with --enable-create-config`
        : "the user must add --enable-create-config to the 'butler-ci-cli mcp' command and restart the server"
    );
  }

  if (options.readOnly) {
    registerDisabledTool(server, "update_config", "edit Jenkins environments", WITHOUT_READ_ONLY);
    registerDisabledTool(server, "delete_config", "delete Jenkins environments", WITHOUT_READ_ONLY);
    return;
  }

  server.registerTool(
    "update_config",
    {
      title: "Edit an environment",
      description:
        "Edit URL, username, token, description or preferences of a saved environment. " +
        "Only the fields you pass are changed.",
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
        if (!config) return fail(`No saved environment named '${args.name}'`);

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
      title: "Delete an environment",
      description:
        "Permanently delete a saved environment. If it was the active one, none will be active afterwards. " +
        "Confirm with the user before using it.",
      inputSchema: { name: configName },
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true },
    },
    safe(({ name }: { name: string }) => {
      if (!configManager.loadConfig(name)) return fail(`No saved environment named '${name}'`);
      const wasActive = configManager.getCurrentConfig() === name;
      if (!configManager.deleteConfig(name)) return fail(`Could not delete environment '${name}'`);
      if (wasActive) resetJenkinsClient();
      return json({ deleted: name, wasActive, remaining: configManager.listConfigs() });
    })
  );
}
