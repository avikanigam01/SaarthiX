import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { DEFAULT_LANG, detectLang, isLangCode, STORAGE_KEY, type LangCode } from "./languages";
import { en, MESSAGES, type MessageKey } from "./locales";

type Vars = Record<string, string | number>;
type TFn = (key: MessageKey, vars?: Vars) => string;

type I18nValue = { lang: LangCode; setLang: (lang: LangCode) => void; t: TFn };

function interpolate(text: string, vars?: Vars): string {
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (_, name: string) => (name in vars ? String(vars[name]) : `{${name}}`));
}

function makeT(lang: LangCode): TFn {
  const table = MESSAGES[lang];
  // Missing translation -> English, never a blank or a raw key.
  return (key, vars) => interpolate(table[key] ?? en[key], vars);
}

const I18nContext = createContext<I18nValue>({ lang: DEFAULT_LANG, setLang: () => {}, t: makeT(DEFAULT_LANG) });

/**
 * Server and first client render both use English so hydration always matches.
 * After mount we switch to the saved choice (or the browser language on a first visit).
 */
export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<LangCode>(DEFAULT_LANG);

  useEffect(() => {
    let next: LangCode = DEFAULT_LANG;
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      next = isLangCode(saved) ? saved : detectLang(navigator.languages ?? [navigator.language]);
    } catch {
      next = detectLang(navigator.languages ?? [navigator.language]);
    }
    setLangState(next);
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((next: LangCode) => {
    setLangState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* private mode: the choice just won't persist */
    }
  }, []);

  const value = useMemo<I18nValue>(() => ({ lang, setLang, t: makeT(lang) }), [lang, setLang]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  return useContext(I18nContext);
}

export function useT(): TFn {
  return useContext(I18nContext).t;
}
