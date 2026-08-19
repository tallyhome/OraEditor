import { messages, type OraLocale, type OraMessageKey, type OraMessages } from "./messages.js";

export type { OraLocale, OraMessageKey, OraMessages };

const LOCALES = Object.keys(messages) as OraLocale[];

export function supportedLocales(): OraLocale[] {
  return [...LOCALES];
}

export function resolveLocale(locale?: string): OraLocale {
  const raw = (locale ?? detectBrowserLocale()).trim().toLowerCase().replace("_", "-");
  if ((LOCALES as string[]).includes(raw)) {
    return raw as OraLocale;
  }
  const short = raw.slice(0, 2);
  if (short === "pt" || raw.startsWith("pt")) {
    return "pt";
  }
  if ((LOCALES as string[]).includes(short)) {
    return short as OraLocale;
  }
  return "fr";
}

export function t(locale: OraLocale, key: OraMessageKey, vars?: Record<string, string | number>): string {
  const template = messages[locale][key] ?? messages.fr[key];
  if (!vars) {
    return template;
  }
  if (key === "words" || key === "characters") {
    return pluralize(locale, template, Number(vars.n ?? 0));
  }
  return template.replace(/\{(\w+)\}/g, (_, name: string) => String(vars[name] ?? ""));
}

export function createTranslator(locale: OraLocale): (key: OraMessageKey, vars?: Record<string, string | number>) => string {
  return (key, vars) => t(locale, key, vars);
}

function detectBrowserLocale(): string {
  if (typeof document !== "undefined" && document.documentElement.lang) {
    return document.documentElement.lang;
  }
  if (typeof navigator !== "undefined" && navigator.language) {
    return navigator.language;
  }
  return "fr";
}

function pluralize(locale: OraLocale, template: string, n: number): string {
  const parts = template.split("|");
  const index = pluralIndex(locale, n, parts.length);
  return (parts[index] ?? parts[parts.length - 1] ?? template).replace(/\{n\}/g, String(n));
}

function pluralIndex(locale: OraLocale, n: number, forms: number): number {
  if (forms <= 1) {
    return 0;
  }
  if (locale === "ru" && forms >= 3) {
    const mod10 = n % 10;
    const mod100 = n % 100;
    if (mod10 === 1 && mod100 !== 11) {
      return 0;
    }
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
      return 1;
    }
    return 2;
  }
  return n === 1 ? 0 : Math.min(1, forms - 1);
}
