import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { routeLogsToStderr } from "../utils/logger";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { registerConfigTools } from "./configTools";
import { resolveUserContext } from "./context";
import { buildInstructions } from "./instructions";
import { guarded, json, registerDisabledTool, text, WITHOUT_READ_ONLY } from "./helpers";
import {
  abortBuild,
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
  /** Contexto ya resuelto que se añade a las instrucciones del modelo. */
  userContext?: string;
}

export interface StartOptions extends McpServerOptions {
  /** Texto de contexto pasado por --context. */
  context?: string;
  /** Ruta de contexto pasada por --context-file. */
  contextFile?: string;
}

const DEFAULT_LOG_LINES = 200;
const MAX_LOG_LINES = 2000;

const jobName = z
  .string()
  .min(1)
  .describe("Full job name, with folders separated by '/' (e.g. 'folder/subfolder/job')");

const buildRef = z
  .union([z.number().int().positive(), z.literal("latest")])
  .describe("Build number, or 'latest' for the most recent one");

function packageVersion(): string {
  try {
    return JSON.parse(readFileSync(join(__dirname, "..", "..", "package.json"), "utf8")).version;
  } catch {
    return "unknown";
  }
}

export function createMcpServer(options: McpServerOptions = {}): McpServer {
  const server = new McpServer(
    { name: "butler-ci-cli", version: packageVersion() },
    { instructions: buildInstructions(options) }
  );
  const readOnly = { readOnlyHint: true, openWorldHint: true } as const;

  registerConfigTools(server, options);

  server.registerTool(
    "search_jobs",
    {
      title: "Search jobs",
      description: "Search jobs by name (partial, case-insensitive match) across all folders.",
      inputSchema: { query: z.string().min(1).describe("Text to look for in the job name or path") },
      annotations: readOnly,
    },
    guarded(async ({ query }: { query: string }) => json(await findJobsByName(query)))
  );

  server.registerTool(
    "list_jobs",
    {
      title: "List jobs and folders",
      description: "Recursively list jobs and folders, optionally starting from a folder.",
      inputSchema: {
        folder: z.string().optional().describe("Folder to list from; defaults to the root"),
        maxLevel: z.number().int().min(0).optional().describe("Maximum depth (0 = first level only)"),
        type: z.enum(["job", "folder"]).optional().describe("Filter by item type"),
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
      title: "Job information",
      description: "Detailed information about a job (status, recent builds, properties).",
      inputSchema: { job: jobName },
      annotations: readOnly,
    },
    guarded(async ({ job }: { job: string }) => json(await getJobInfo(job)))
  );

  server.registerTool(
    "get_job_params",
    {
      title: "Job parameters",
      description: "Parameters a job accepts: name, type, default value and choices.",
      inputSchema: { job: jobName },
      annotations: readOnly,
    },
    guarded(async ({ job }: { job: string }) => json(await getJobParameters(job)))
  );

  server.registerTool(
    "get_last_build",
    {
      title: "Last build",
      description: "Information about the last build of a job.",
      inputSchema: { job: jobName },
      annotations: readOnly,
    },
    guarded(async ({ job }: { job: string }) => json(await getLastBuild(job)))
  );

  server.registerTool(
    "list_builds",
    {
      title: "List builds",
      description: "List a job's builds, with status filter and pagination.",
      inputSchema: {
        job: jobName,
        status: z
          .enum(["SUCCESS", "FAILURE", "UNSTABLE", "ABORTED", "RUNNING"])
          .optional()
          .describe("Filter by status"),
        limit: z.number().int().min(1).max(200).default(20).describe("Maximum number of builds to return"),
        offset: z.number().int().min(0).default(0).describe("Number of builds to skip"),
        order: z.enum(["asc", "desc"]).default("desc").describe("Order by build number"),
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
      title: "Build logs",
      description:
        "Return the last lines of a build's console log. Raise tailLines to see more.",
      inputSchema: {
        job: jobName,
        build: buildRef.default("latest"),
        tailLines: z
          .number()
          .int()
          .min(1)
          .max(MAX_LOG_LINES)
          .default(DEFAULT_LOG_LINES)
          .describe("Number of final lines to return"),
      },
      annotations: readOnly,
    },
    guarded(async ({ job, build, tailLines }: { job: string; build: number | "latest"; tailLines: number }) => {
      const lines = (await getBuildLogs(job, build === "latest" ? "lastBuild" : build)).split(/\r?\n/);
      const tail = lines.slice(-tailLines);
      const omitted = lines.length - tail.length;
      const header = omitted > 0 ? `[... ${omitted} earlier lines omitted ...]\n` : "";
      return text(header + tail.join("\n"));
    })
  );

  server.registerTool(
    "follow_build_logs",
    {
      title: "Follow the log of a running build",
      description:
        "Incremental log reading (the equivalent of the CLI's streaming mode). Start with start=0 and pass the " +
        "returned 'nextStart' on each following call; repeat while 'hasMore' is true.",
      inputSchema: {
        job: jobName,
        build: buildRef.default("latest"),
        start: z.number().int().min(0).default(0).describe("Byte offset to read from"),
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
      title: "Build stages and steps",
      description: "Stages and steps of a pipeline build, with status and duration.",
      inputSchema: { job: jobName, build: buildRef.default("latest") },
      annotations: readOnly,
    },
    guarded(async ({ job, build }: { job: string; build: number | "latest" }) =>
      json(await getWorkflowSteps(job, build === "latest" ? "lastBuild" : build))
    )
  );

  if (options.readOnly) {
    registerDisabledTool(server, "download_build_logs", "save logs to disk", WITHOUT_READ_ONLY);
    registerDisabledTool(server, "trigger_build", "trigger builds in Jenkins", WITHOUT_READ_ONLY);
    registerDisabledTool(server, "abort_build", "abort running builds", WITHOUT_READ_ONLY);
  } else {
    server.registerTool(
      "download_build_logs",
      {
        title: "Download a build log",
        description:
          "Save the full log to butler-ci-cli's logs directory (~/.butler-ci-cli/logs) and return the path.",
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
        title: "Trigger a build",
        description:
          "Trigger a build in Jenkins. It has real effects: call get_job_params first and confirm with the user.",
        inputSchema: {
          job: jobName,
          parameters: z
            .record(z.string(), z.union([z.string(), z.number(), z.boolean()]))
            .optional()
            .describe("Build parameters as key-value pairs"),
        },
        annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
      },
      guarded(async ({ job, parameters }: { job: string; parameters?: Record<string, string | number | boolean> }) =>
        json(await buildJob(job, parameters))
      )
    );

    server.registerTool(
      "abort_build",
      {
        title: "Abort a running build",
        description:
          "Abort a build that is currently running. It stops real work in Jenkins: pass the build number " +
          "(look it up with list_builds or get_last_build) and confirm with the user before calling it. " +
          "If the build already finished it does nothing and says so.",
        inputSchema: { job: jobName, build: buildRef },
        annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: true },
      },
      guarded(async ({ job, build }: { job: string; build: number | "latest" }) => {
        const result = await abortBuild(job, build === "latest" ? "lastBuild" : build);
        return json({
          aborted: result.aborted,
          buildNumber: result.buildNumber,
          message: result.aborted
            ? `Abort requested for build #${result.buildNumber}. It may take a few seconds to stop.`
            : `Build #${result.buildNumber} has already finished; only running builds can be aborted.`,
        });
      })
    );
  }

  return server;
}

export async function startMcpServer(options: StartOptions = {}): Promise<void> {
  routeLogsToStderr();
  const { text: userContext, warnings } = resolveUserContext(options);
  for (const warning of warnings) process.stderr.write(`butler-ci-cli MCP: ${warning}\n`);

  const server = createMcpServer({ ...options, userContext });
  await server.connect(new StdioServerTransport());

  const mode = [
    "stdio",
    ...(options.readOnly ? ["read-only"] : []),
    ...(userContext ? [`user context: ${userContext.length} chars`] : []),
  ].join(", ");
  process.stderr.write(`butler-ci-cli MCP server ready (${mode})\n`);
}
