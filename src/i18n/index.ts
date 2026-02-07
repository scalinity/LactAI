import { useCallback } from "react";
import { useAppStore } from "@/stores/useAppStore";
import en, { type Translations } from "./en";
import es from "./es";

export type Locale = "en" | "es";

const translations: Record<Locale, Translations> = { en, es };

// Dot-path type helper for autocomplete
type DotPath<T, Prefix extends string = ""> = T extends string
  ? Prefix
  : T extends Record<string, unknown>
    ? {
        [K in keyof T & string]: DotPath<
          T[K],
          Prefix extends "" ? K : `${Prefix}.${K}`
        >;
      }[keyof T & string]
    : never;

type RawKey = DotPath<Translations>;
// Strip _one/_other suffixes so callers can pass the base plural key
type StripPlural<K extends string> = K extends
  | `${infer Base}_one`
  | `${infer Base}_other`
  ? Base
  : K;
export type TranslationKey = RawKey | StripPlural<RawKey>;

function resolve(obj: unknown, path: string): string {
  const parts = path.split(".");
  let current: unknown = obj;
  for (const part of parts) {
    if (current == null || typeof current !== "object") return path;
    current = (current as Record<string, unknown>)[part];
  }
  return typeof current === "string" ? current : path;
}

function interpolate(
  template: string,
  vars?: Record<string, string | number>,
): string {
  if (!vars) return template;
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) =>
    vars[key] != null ? String(vars[key]) : `{{${key}}}`,
  );
}

export function useTranslation() {
  const locale = useAppStore((s) => s.locale);

  const t = useCallback(
    (key: TranslationKey, vars?: Record<string, string | number>): string => {
      const table = translations[locale] ?? translations.en;
      const fallback = translations.en;

      // Pluralization: check for _one/_other suffix
      if (vars?.count != null) {
        const suffix = Number(vars.count) === 1 ? "_one" : "_other";
        const pluralKey = `${key}${suffix}`;
        const pluralValue = resolve(table, pluralKey);
        if (pluralValue !== pluralKey) {
          return interpolate(pluralValue, vars);
        }
        // Try fallback language
        const fallbackPlural = resolve(fallback, pluralKey);
        if (fallbackPlural !== pluralKey) {
          return interpolate(fallbackPlural, vars);
        }
      }

      const value = resolve(table, key);
      if (value !== key) return interpolate(value, vars);

      // Fallback to English
      const fbValue = resolve(fallback, key);
      return interpolate(fbValue, vars);
    },
    [locale],
  );

  return { t, locale };
}

/** Non-reactive helper for use outside components (e.g. utility functions) */
export function getLocale(): Locale {
  return useAppStore.getState().locale;
}
