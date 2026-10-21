import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { spawn } from "node:child_process";
import chalk from "chalk";
import { msg } from "../i18n";

const PACKAGE_NAME = "butler-ci-cli";
const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000;
const CACHE_FILE = join(homedir(), ".butler-ci-cli", "update-check.json");

interface UpdateCache {
  lastCheck: number;
  latestVersion: string;
}

/** Devuelve true si `latest` es estrictamente mayor que `current` (x.y.z; ignora prereleases). */
export function isNewerVersion(latest: string, current: string): boolean {
  const parse = (v: string) => v.split("-")[0].split(".").map((n) => parseInt(n, 10) || 0);
  const a = parse(latest);
  const b = parse(current);
  for (let i = 0; i < 3; i++) {
    if ((a[i] ?? 0) !== (b[i] ?? 0)) return (a[i] ?? 0) > (b[i] ?? 0);
  }
  return false;
}

export function updateCheckDisabled(env: NodeJS.ProcessEnv = process.env, argv: string[] = process.argv): boolean {
  if (env.BUTLER_NO_UPDATE_CHECK || env.NO_UPDATE_NOTIFIER || env.CI) return true;
  // `mcp` habla un protocolo por stdio: no se toca nada en ese proceso.
  return argv[2] === "mcp";
}

function readCache(): UpdateCache | null {
  try {
    if (!existsSync(CACHE_FILE)) return null;
    const data = JSON.parse(readFileSync(CACHE_FILE, "utf-8"));
    if (typeof data?.lastCheck !== "number" || typeof data?.latestVersion !== "string") return null;
    return data;
  } catch {
    return null;
  }
}

// Script del proceso hijo: consulta el registro de npm y guarda el resultado. Sin dependencias
// (solo https/fs) para que funcione en cualquier Node soportado y falle en silencio.
const REFRESH_SCRIPT = `
const https = require("https");
const fs = require("fs");
const path = require("path");
const [file, pkg] = process.argv.slice(1);
const req = https.get("https://registry.npmjs.org/" + pkg + "/latest", { headers: { accept: "application/json" }, timeout: 5000 }, (res) => {
  let body = "";
  res.on("data", (c) => (body += c));
  res.on("end", () => {
    try {
      const version = JSON.parse(body).version;
      if (typeof version !== "string") return;
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, JSON.stringify({ lastCheck: Date.now(), latestVersion: version }));
    } catch {}
  });
});
req.on("timeout", () => req.destroy());
req.on("error", () => {});
`;

function refreshInBackground(): void {
  try {
    const child = spawn(process.execPath, ["-e", REFRESH_SCRIPT, CACHE_FILE, PACKAGE_NAME], {
      detached: true,
      stdio: "ignore",
      windowsHide: true,
    });
    child.on("error", () => {});
    child.unref();
  } catch {
    // Un fallo aquí nunca debe afectar al comando del usuario.
  }
}

/**
 * Avisa en stderr (al terminar el comando) si hay una versión más nueva publicada en npm.
 * Lee la última versión conocida de una caché local y la refresca como mucho una vez al día
 * en un proceso aparte, así que no añade latencia ni requiere red durante el comando.
 */
export function setupUpdateCheck(currentVersion: string): void {
  if (updateCheckDisabled()) return;

  const cache = readCache();
  if (!cache || Date.now() - cache.lastCheck > CHECK_INTERVAL_MS) {
    refreshInBackground();
  }

  if (!cache || !isNewerVersion(cache.latestVersion, currentVersion)) return;
  if (!process.stderr.isTTY) return;

  process.on("exit", () => {
    const command = `npm install -g ${PACKAGE_NAME}@latest`;
    const available = msg.update.available({
      current: chalk.dim(currentVersion),
      latest: chalk.green(cache.latestVersion),
    });
    process.stderr.write(
      `\n${chalk.yellow("⬆️ ")} ${available}\n` +
        `   ${msg.update.command({ command: chalk.cyan(command) })}\n` +
        `   ${chalk.dim(msg.update.disable())}\n`
    );
  });
}

export { CACHE_FILE, CHECK_INTERVAL_MS };
