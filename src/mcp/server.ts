import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { routeLogsToStderr } from "../utils/logger";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { registerConfigTools } from "./configTools";
import { guarded, json, registerDisabledTool, text, WITHOUT_READ_ONLY } from "./helpers";
import {
  buildJob,
  downloadBuildLogs,
  findJobsByName,
  getAllJobsRecursive,
  getBuildLogs,
  getBuilds,
  getJobInfo,
  getJobParameters,
  getLastBuild,
  getProgressiveBuildLogs,
  getWorkflowSteps,
} from "../utils/jenkinsFolder";

export interface McpServerOptions {
  readOnly?: boolean;
  allowCreateConfig?: boolean;
}

const DEFAULT_LOG_LINES = 200;
const MAX_LOG_LINES = 2000;

const jobName = z
  .string()
  .min(1)
  .describe("Nombre completo del job, con carpetas separadas por '/' (p. ej. 'folder/subfolder/job')");

const buildRef = z
  .union([z.number().int().positive(), z.literal("latest")])
  .describe("Número de build o 'latest' para el más reciente");

function packageVersion(): string {
  try {
    return JSON.parse(readFileSync(join(__dirname, "..", "..", "package.json"), "utf8")).version;
  } catch {
    return "unknown";
  }
}

export function createMcpServer(options: McpServerOptions = {}): McpServer {
  const server = new McpServer({ name: "butler-ci-cli", version: packageVersion() });
  const readOnly = { readOnlyHint: true, openWorldHint: true } as const;

  registerConfigTools(server, options);

  server.registerTool(
    "search_jobs",
    {
      title: "Buscar jobs",
      description: "Busca jobs por nombre (coincidencia parcial, sin distinguir mayúsculas) en todas las carpetas.",
      inputSchema: { query: z.string().min(1).describe("Texto a buscar en el nombre o la ruta del job") },
      annotations: readOnly,
    },
    guarded(async ({ query }: { query: string }) => json(await findJobsByName(query)))
  );

  server.registerTool(
    "list_jobs",
    {
      title: "Listar jobs y carpetas",
      description: "Lista jobs y carpetas de forma recursiva, opcionalmente a partir de una carpeta.",
      inputSchema: {
        folder: z.string().optional().describe("Carpeta desde la que listar; por defecto la raíz"),
        maxLevel: z.number().int().min(0).optional().describe("Profundidad máxima (0 = solo el primer nivel)"),
        type: z.enum(["job", "folder"]).optional().describe("Filtrar por tipo de elemento"),
      },
      annotations: readOnly,
    },
    guarded(async ({ folder, maxLevel, type }: { folder?: string; maxLevel?: number; type?: "job" | "folder" }) => {
      const baseLevel = folder ? folder.split("/").length : 0;
      let items = await getAllJobsRecursive(folder ?? "");
      if (maxLevel !== undefined) items = items.filter((i) => i.level - baseLevel <= maxLevel);
      if (type) items = items.filter((i) => i.type === type);
      return json(items);
    })
  );

  server.registerTool(
    "get_job_info",
    {
      title: "Información de un job",
      description: "Información detallada de un job (estado, builds recientes, propiedades).",
      inputSchema: { job: jobName },
      annotations: readOnly,
    },
    guarded(async ({ job }: { job: string }) => json(await getJobInfo(job)))
  );

  server.registerTool(
    "get_job_params",
    {
      title: "Parámetros de un job",
      description: "Parámetros que acepta un job: nombre, tipo, valor por defecto y opciones.",
      inputSchema: { job: jobName },
      annotations: readOnly,
    },
    guarded(async ({ job }: { job: string }) => json(await getJobParameters(job)))
  );

  server.registerTool(
    "get_last_build",
    {
      title: "Último build",
      description: "Información del último build de un job.",
      inputSchema: { job: jobName },
      annotations: readOnly,
    },
    guarded(async ({ job }: { job: string }) => json(await getLastBuild(job)))
  );

  server.registerTool(
    "list_builds",
    {
      title: "Listar builds",
      description: "Lista los builds de un job con filtro por estado y paginación.",
      inputSchema: {
        job: jobName,
        status: z
          .enum(["SUCCESS", "FAILURE", "UNSTABLE", "ABORTED", "RUNNING"])
          .optional()
          .describe("Filtrar por estado"),
        limit: z.number().int().min(1).max(200).default(20).describe("Máximo de builds a devolver"),
        offset: z.number().int().min(0).default(0).describe("Builds a omitir"),
        order: z.enum(["asc", "desc"]).default("desc").describe("Orden por número de build"),
      },
      annotations: readOnly,
    },
    guarded(
      async ({
        job,
        status,
        limit,
        offset,
        order,
      }: {
        job: string;
        status?: string;
        limit: number;
        offset: number;
        order: "asc" | "desc";
      }) => json(await getBuilds(job, { status, limit, offset, sortOrder: order }))
    )
  );

  server.registerTool(
    "get_build_logs",
    {
      title: "Logs de un build",
      description:
        "Devuelve las últimas líneas del log de consola de un build. Para ver más, aumenta tailLines.",
      inputSchema: {
        job: jobName,
        build: buildRef.default("latest"),
        tailLines: z
          .number()
          .int()
          .min(1)
          .max(MAX_LOG_LINES)
          .default(DEFAULT_LOG_LINES)
          .describe("Número de líneas finales a devolver"),
      },
      annotations: readOnly,
    },
    guarded(async ({ job, build, tailLines }: { job: string; build: number | "latest"; tailLines: number }) => {
      const lines = (await getBuildLogs(job, build === "latest" ? "lastBuild" : build)).split(/\r?\n/);
      const tail = lines.slice(-tailLines);
      const omitted = lines.length - tail.length;
      const header = omitted > 0 ? `[... ${omitted} líneas anteriores omitidas ...]\n` : "";
      return text(header + tail.join("\n"));
    })
  );

  server.registerTool(
    "follow_build_logs",
    {
      title: "Seguir el log de un build en curso",
      description:
        "Lectura incremental del log (equivale al modo streaming del CLI). Empieza con start=0 y en cada " +
        "llamada siguiente pasa el 'nextStart' devuelto; repite mientras 'hasMore' sea true.",
      inputSchema: {
        job: jobName,
        build: buildRef.default("latest"),
        start: z.number().int().min(0).default(0).describe("Offset en bytes desde el que leer"),
      },
      annotations: readOnly,
    },
    guarded(async ({ job, build, start }: { job: string; build: number | "latest"; start: number }) => {
      const chunk = await getProgressiveBuildLogs(job, build === "latest" ? "lastBuild" : build, start);
      return json({ text: chunk.text, nextStart: chunk.size, hasMore: chunk.hasMore });
    })
  );

  server.registerTool(
    "get_build_steps",
    {
      title: "Stages y steps de un build",
      description: "Stages y steps de un build de pipeline, con estado y duración.",
      inputSchema: { job: jobName, build: buildRef.default("latest") },
      annotations: readOnly,
    },
    guarded(async ({ job, build }: { job: string; build: number | "latest" }) =>
      json(await getWorkflowSteps(job, build === "latest" ? "lastBuild" : build))
    )
  );

  if (options.readOnly) {
    registerDisabledTool(server, "download_build_logs", "guardar logs en disco", WITHOUT_READ_ONLY);
    registerDisabledTool(server, "trigger_build", "lanzar builds en Jenkins", WITHOUT_READ_ONLY);
  } else {
    server.registerTool(
      "download_build_logs",
      {
        title: "Descargar el log de un build",
        description:
          "Guarda el log completo en el directorio de logs de butler-ci-cli (~/.butler-ci-cli/logs) y devuelve la ruta.",
        inputSchema: { job: jobName, build: buildRef.default("latest") },
        annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
      },
      guarded(async ({ job, build }: { job: string; build: number | "latest" }) =>
        json({ path: await downloadBuildLogs(job, build === "latest" ? "lastBuild" : build) })
      )
    );

    server.registerTool(
      "trigger_build",
      {
        title: "Lanzar un build",
        description:
          "Lanza un build en Jenkins. Tiene efectos reales: consulta antes get_job_params y confirma con el usuario.",
        inputSchema: {
          job: jobName,
          parameters: z
            .record(z.string(), z.union([z.string(), z.number(), z.boolean()]))
            .optional()
            .describe("Parámetros del build como pares clave-valor"),
        },
        annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
      },
      guarded(async ({ job, parameters }: { job: string; parameters?: Record<string, string | number | boolean> }) =>
        json(await buildJob(job, parameters))
      )
    );
  }

  return server;
}

export async function startMcpServer(options: McpServerOptions = {}): Promise<void> {
  routeLogsToStderr();
  const server = createMcpServer(options);
  await server.connect(new StdioServerTransport());
  process.stderr.write(
    `butler-ci-cli MCP server listo (stdio${options.readOnly ? ", solo lectura" : ""})\n`
  );
}
