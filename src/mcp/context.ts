import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { configManager } from "../utils/config";

/** El contexto va al prompt del sistema en cada conversación: se acota para no inflarlo sin querer. */
export const MAX_CONTEXT_CHARS = 8000;

export interface ContextSources {
  /** Texto escrito directamente (--context). */
  context?: string;
  /** Ruta a un fichero (--context-file). */
  contextFile?: string;
}

export interface ResolvedContext {
  text?: string;
  warnings: string[];
}

/** Fichero que se carga siempre que exista, sin necesidad de ninguna opción. */
export function defaultContextFile(): string {
  return join(dirname(configManager.getConfigDir()), "context.md");
}

/**
 * Reúne el contexto que el usuario quiere dar al modelo sobre su Jenkins, por
 * orden: fichero por defecto, --context-file y --context. Los fallos de lectura
 * no impiden arrancar: se devuelven como avisos.
 */
export function resolveUserContext(sources: ContextSources = {}): ResolvedContext {
  const warnings: string[] = [];
  const parts: string[] = [];

  const readFile = (path: string, mustExist: boolean) => {
    try {
      if (!existsSync(path)) {
        if (mustExist) warnings.push(`context file not found: ${path}`);
        return;
      }
      parts.push(String(readFileSync(path, "utf8")));
    } catch (error) {
      warnings.push(`could not read context file ${path}: ${error instanceof Error ? error.message : error}`);
    }
  };

  readFile(defaultContextFile(), false);
  if (sources.contextFile) readFile(sources.contextFile, true);
  if (sources.context) parts.push(sources.context);

  let text = parts
    .map((part) => part.trim())
    .filter(Boolean)
    .join("\n\n");

  if (text.length > MAX_CONTEXT_CHARS) {
    warnings.push(`context is ${text.length} characters; truncated to ${MAX_CONTEXT_CHARS}`);
    text = text.slice(0, MAX_CONTEXT_CHARS);
  }

  return { text: text || undefined, warnings };
}
