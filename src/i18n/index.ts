import { en, type MessageKey } from "./en";
import { es } from "./es";

export type Locale = "en" | "es";
export type { MessageKey };

const catalogs: Record<Locale, Record<MessageKey, string>> = { en, es };

/** Names of the `{placeholders}` found in a message template. */
type Placeholders<S extends string> = S extends `${string}{${infer Name}}${infer Rest}`
  ? Name | Placeholders<Rest>
  : never;

type VarsArgs<K extends MessageKey> = [Placeholders<(typeof en)[K]>] extends [never]
  ? []
  : [vars: Record<Placeholders<(typeof en)[K]>, string | number>];

// Fails to compile if a translation uses different placeholders than the English message.
type PlaceholderMismatch = {
  [K in MessageKey]: [Placeholders<(typeof es)[K]>] extends [Placeholders<(typeof en)[K]>]
    ? [Placeholders<(typeof en)[K]>] extends [Placeholders<(typeof es)[K]>]
      ? never
      : K
    : K;
}[MessageKey];
export const placeholdersMatch: [PlaceholderMismatch] extends [never] ? true : { mismatch: PlaceholderMismatch } = true;

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

export function t<K extends MessageKey>(key: K, ...args: VarsArgs<K>): string {
  const vars: Record<string, string | number> = args[0] ?? {};
  const template = catalogs[getLocale()][key] ?? en[key];
  return template.replace(/\{(\w+)\}/g, (match, name) => (name in vars ? String(vars[name]) : match));
}
