import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

/**
 * Caché de nombres de jobs, un fichero por entorno (configuración):
 * ~/.butler-ci-cli/jobs/<entorno>.json
 *
 * Es síncrona a propósito: el autocompletado la lee en cada TAB.
 */
export interface JobsCache {
  environment: string;
  fetchedAt: string;
  jobs: string[];
}

function jobsDir(): string {
  return join(homedir(), ".butler-ci-cli", "jobs");
}

function jobsFile(environment: string): string {
  return join(jobsDir(), `${environment}.json`);
}

/** Guarda los nombres de los jobs de un entorno, sustituyendo lo anterior. */
export function saveJobs(environment: string, jobs: string[]): void {
  mkdirSync(jobsDir(), { recursive: true });
  const data: JobsCache = { environment, fetchedAt: new Date().toISOString(), jobs };
  writeFileSync(jobsFile(environment), JSON.stringify(data, null, 2), "utf-8");
}

/** Lee la caché de un entorno; null si no existe o está corrupta. */
export function loadJobsCache(environment: string): JobsCache | null {
  try {
    const file = jobsFile(environment);
    if (!existsSync(file)) return null;
    const data = JSON.parse(readFileSync(file, "utf-8"));
    if (!Array.isArray(data.jobs)) return null;
    return {
      environment,
      fetchedAt: String(data.fetchedAt ?? ""),
      jobs: data.jobs.filter((j: unknown): j is string => typeof j === "string"),
    };
  } catch {
    return null;
  }
}

/** Nombres de jobs de un entorno (vacío si no hay caché). */
export function loadJobs(environment: string): string[] {
  return loadJobsCache(environment)?.jobs ?? [];
}

/** Borra la caché de un entorno. Nunca lanza. */
export function deleteJobs(environment: string): void {
  try {
    const file = jobsFile(environment);
    if (existsSync(file)) unlinkSync(file);
  } catch {
    // la caché es prescindible
  }
}
