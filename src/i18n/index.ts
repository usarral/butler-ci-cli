import { en } from "./en";
import { es } from "./es";
import type { Messages, PlaceholderMismatch } from "./types";

export type Locale = "en" | "es";

const catalogs = { en, es };

// Fails to compile if a translation uses different placeholders than the English message.
export const placeholdersMatch: [PlaceholderMismatch<typeof en, typeof es>] extends [never]
  ? true
  : { mismatch: PlaceholderMismatch<typeof en, typeof es> } = true;

function toLocale(value: string | undefined): Locale | null {
  if (!value) return null;
  const lang = value.toLowerCase().split(/[._@:-]/)[0];
  if (lang === "" || lang === "c" || lang === "posix") return null;
  return lang === "es" ? "es" : "en";
}

/** Resolves the UI language: BUTLER_LANG, then LC_ALL / LC_MESSAGES / LANG, then Intl. Defaults to English. */
export function detectLocale(env: NodeJS.ProcessEnv = process.env): Locale {
  for (const name of ["BUTLER_LANG", "LC_ALL", "LC_MESSAGES", "LANG"]) {
    const locale = toLocale(env[name]);
    if (locale) return locale;
  }
  try {
    return toLocale(Intl.DateTimeFormat().resolvedOptions().locale) ?? "en";
  } catch {
    return "en";
  }
}

let current: Locale | null = null;

export function getLocale(): Locale {
  return (current ??= detectLocale());
}

export function setLocale(locale: Locale | null): void {
  current = locale;
}

type Node = { readonly [key: string]: string | Node };

function lookup(root: Node, path: string[]): string | undefined {
  let node: string | Node | undefined = root;
  for (const key of path) {
    if (typeof node !== "object") return undefined;
    node = node[key];
  }
  return typeof node === "string" ? node : undefined;
}

function interpolate(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, name) => (name in vars ? String(vars[name]) : match));
}

function build(node: Node, path: string[] = []): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(node)) {
    const here = [...path, key];
    out[key] =
      typeof value === "string"
        ? (vars: Record<string, string | number> = {}) =>
            interpolate(lookup(catalogs[getLocale()], here) ?? value, vars)
        : build(value, here);
  }
  return out;
}

/** Localized messages, e.g. `msg.update.available({ current, latest })`. The language is resolved at call time. */
export const msg = build(en) as Messages<typeof en>;
