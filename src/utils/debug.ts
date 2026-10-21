import { AxiosError, AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from "axios";
import chalk from "chalk";
import { getJenkinsConfig } from "./config";
import { errorsLogged } from "./logger";
import { getLocale } from "../i18n";

/**
 * Diagnostic mode: `--debug` or `BUTLER_DEBUG=1`.
 *
 * Everything goes to stderr (so stdout stays pipeable) and is English only. It never prints the API
 * token, request bodies or the arguments of the command, only what is needed to tell whether a
 * failure comes from Jenkins / the network or from the CLI itself.
 */

const OFF_VALUES = new Set(["", "0", "false", "no", "off"]);

export function isTruthyFlag(value: string | undefined): boolean {
  return value !== undefined && !OFF_VALUES.has(value.trim().toLowerCase());
}

let enabled = isTruthyFlag(process.env.BUTLER_DEBUG);

export function isDebugEnabled(): boolean {
  return enabled;
}

export function enableDebug(): void {
  enabled = true;
}

export function debugLog(message: string): void {
  if (!enabled) return;
  process.stderr.write(`${chalk.dim("[debug]")} ${message}\n`);
}

export interface DebugStats {
  requests: number;
  failed: number;
  unexpected: number;
}

const stats: DebugStats = { requests: 0, failed: 0, unexpected: 0 };

export function getDebugStats(): Readonly<DebugStats> {
  return stats;
}

export function resetDebugStats(): void {
  stats.requests = 0;
  stats.failed = 0;
  stats.unexpected = 0;
}

const NETWORK_HINTS: Record<string, string> = {
  ECONNREFUSED: "Nothing is listening at that host and port. Is Jenkins running? Is the URL (and port) right?",
  ENOTFOUND: "The host name could not be resolved: typo in the URL, DNS or VPN problem.",
  EAI_AGAIN: "The host name could not be resolved right now (temporary DNS failure).",
  ETIMEDOUT: "The connection timed out: network, firewall or proxy problem.",
  ECONNABORTED: "The request timed out: network, firewall or proxy problem.",
  ECONNRESET: "The connection was closed by the server or by a proxy in between.",
  EHOSTUNREACH: "The host is unreachable from this machine (routing, VPN or firewall).",
};

const TLS_HINT =
  "TLS certificate problem (self-signed certificate or incomplete chain). Trust the CA with NODE_EXTRA_CA_CERTS=/path/ca.pem.";

function httpHint(status: number): string {
  if (status === 401) return "Jenkins rejected the credentials: wrong user or API token.";
  if (status === 403)
    return "Authenticated but not allowed: missing permission, or a CSRF crumb is required (use an API token, not the password).";
  if (status === 404)
    return "Jenkins has no such path: the job, folder or build does not exist, or the URL has a wrong context path (e.g. a missing /jenkins).";
  if (status === 429) return "Too many requests: Jenkins or a proxy is rate limiting.";
  if (status >= 500) return "Jenkins (or a proxy in front of it) failed while handling the request.";
  return "Jenkins answered with an error status.";
}

export interface ErrorDiagnosis {
  kind: "network" | "http" | "other";
  summary: string;
  hint: string;
}

export function diagnoseError(error: unknown): ErrorDiagnosis {
  const err = error as AxiosError | undefined;
  if (err?.response) {
    const { status, statusText } = err.response;
    return { kind: "http", summary: `HTTP ${status} ${statusText ?? ""}`.trim(), hint: httpHint(status) };
  }
  const code = err?.code ?? "";
  if (code in NETWORK_HINTS) {
    return { kind: "network", summary: `${code}: ${err?.message ?? ""}`.trim(), hint: NETWORK_HINTS[code] };
  }
  if (/CERT|SSL|TLS/i.test(code) || /certificate/i.test(err?.message ?? "")) {
    return { kind: "network", summary: `${code || "TLS error"}: ${err?.message ?? ""}`.trim(), hint: TLS_HINT };
  }
  if (err?.request) {
    return { kind: "network", summary: `${code || "no response"}: ${err.message}`, hint: "The request was sent but no response arrived." };
  }
  return { kind: "other", summary: err?.message ?? String(error), hint: "The error did not come from an HTTP exchange." };
}

/** Plain-text excerpt of an error body (HTML tags dropped, whitespace collapsed). */
export function bodyExcerpt(data: unknown, max = 300): string {
  const raw = typeof data === "string" ? data : data === undefined || data === null ? "" : JSON.stringify(data);
  const text = raw
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

export function debugVerdict(current: Readonly<DebugStats>, errorsReported: number): string[] {
  const summary = `${current.requests} request(s), ${current.failed} failed, ${current.unexpected} unexpected answer(s), ${errorsReported} error(s) reported by the command`;
  if (current.failed > 0 && errorsReported > 0) {
    return [summary, "Verdict: at least one request failed, so the problem is on the Jenkins/network side (see the ✗ lines above)."];
  }
  if (current.unexpected > 0) {
    return [summary, "Verdict: Jenkins did not answer with the expected JSON (see the ⚠ lines above). A login page, SSO or proxy is answering instead: check the URL and credentials."];
  }
  if (errorsReported > 0 && current.requests === 0) {
    return [summary, "Verdict: the command failed before sending any request, so nothing reached Jenkins: missing configuration, invalid arguments or the CLI itself."];
  }
  if (errorsReported > 0) {
    return [
      summary,
      "Verdict: the command reported an error but every HTTP request succeeded. The problem is in the CLI or in how it handles Jenkins' answer: please report it with this output.",
    ];
  }
  if (current.failed > 0) {
    return [summary, "Verdict: some requests failed but the command handled them (see the ✗ lines above)."];
  }
  return [summary, "Verdict: no errors."];
}

type Timed = InternalAxiosRequestConfig & { __debugStart?: number };

function describeRequest(config: InternalAxiosRequestConfig): string {
  const base = (config.baseURL ?? "").replace(/\/$/, "");
  const path = config.url ?? "";
  const url = /^https?:\/\//i.test(path) ? path : `${base}${path.startsWith("/") ? "" : "/"}${path}`;
  const fields = config.data instanceof URLSearchParams ? [...new Set(config.data.keys())] : [];
  const method = (config.method ?? "get").toUpperCase();
  return `${method} ${url}${fields.length ? chalk.dim(`  [form fields: ${fields.join(", ")}]`) : ""}`;
}

function formatSize(response: AxiosResponse): string {
  const length = Number(response.headers?.["content-length"]);
  const bytes = Number.isFinite(length) && length > 0 ? length : Buffer.byteLength(typeof response.data === "string" ? response.data : JSON.stringify(response.data ?? ""));
  return bytes >= 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${bytes} B`;
}

export function attachDebugInterceptors(client: AxiosInstance): void {
  client.interceptors.request.use((config) => {
    stats.requests++;
    (config as Timed).__debugStart = Date.now();
    debugLog(`→ ${describeRequest(config)}`);
    return config;
  });

  client.interceptors.response.use(
    (response) => {
      const started = (response.config as Timed).__debugStart ?? Date.now();
      const server = response.headers?.["x-jenkins"] ? `  Jenkins ${response.headers["x-jenkins"]}` : "";
      debugLog(`← ${response.status} ${response.statusText ?? ""}  ${Date.now() - started} ms  ${formatSize(response)}${server}`.replace(/\s+/g, " "));
      const wantsJson = (response.config.url ?? "").includes("/api/json");
      if (wantsJson && String(response.headers?.["content-type"] ?? "").includes("text/html")) {
        stats.unexpected++;
        debugLog(chalk.yellow("⚠ expected JSON but got HTML: a login page, SSO redirect or proxy answered instead of Jenkins."));
      }
      return response;
    },
    (error: AxiosError) => {
      stats.failed++;
      const started = (error.config as Timed | undefined)?.__debugStart ?? Date.now();
      const diagnosis = diagnoseError(error);
      debugLog(chalk.red(`✗ ${diagnosis.summary}  (${Date.now() - started} ms)`));
      debugLog(`  ${diagnosis.hint}`);
      const body = bodyExcerpt(error.response?.data);
      if (body) debugLog(`  response body: ${body}`);
      return Promise.reject(error);
    }
  );
}

function describeConfig(): string {
  const config = getJenkinsConfig();
  if (!config) {
    return "none (create one with `config create` or set JENKINS_URL, JENKINS_USER and JENKINS_TOKEN)";
  }
  const source = config.name === "env-fallback" ? "environment variables" : `config "${config.name}"`;
  return `${source} → ${config.url} as ${config.username}, token ${config.token ? `set (${config.token.length} chars)` : "MISSING"}`;
}

export function startDebugSession(version: string, command: string): void {
  if (!enabled) return;
  debugLog(`butler-ci-cli ${version} · node ${process.version} · ${process.platform} ${process.arch}`);
  debugLog(`command: ${command || "(none)"} · language: ${getLocale()}`);
  debugLog(`using ${describeConfig()}`);
  debugLog("debug output goes to stderr; the token and request bodies are never printed");
  process.on("exit", () => {
    for (const line of debugVerdict(stats, errorsLogged())) debugLog(line);
  });
}

