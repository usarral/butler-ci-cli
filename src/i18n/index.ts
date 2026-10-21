import { en, type MessageKey } from "./en";
import { es } from "./es";

export type Locale = "en" | "es";
export type { MessageKey };

const catalogs: Record<Locale, Record<MessageKey, string>> = { en, es };

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

export function t(key: MessageKey, vars: Record<string, string | number> = {}): string {
  const template = catalogs[getLocale()][key] ?? en[key];
  return template.replace(/\{(\w+)\}/g, (match, name) => (name in vars ? String(vars[name]) : match));
}
