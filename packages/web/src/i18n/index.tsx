import { createContext, type ReactNode, useContext, useEffect, useState } from 'react';
import { en } from './en';
import { hu } from './hu';

export type Lang = 'en' | 'hu';
export type Dict = typeof en;

const dicts: Record<Lang, Dict> = { en, hu };

// Deployed default is Hungarian; override at build time with VITE_DEFAULT_LANG if needed.
const DEFAULT_LANG: Lang = import.meta.env.VITE_DEFAULT_LANG === 'en' ? 'en' : 'hu';

// Language precedence: ?lang= query param (per-load override) → default (Hungarian).
// The choice is intentionally NOT persisted, so a refresh always returns to the
// default language unless ?lang= is present in the URL.
function resolveInitialLang(): Lang {
  const q = new URLSearchParams(window.location.search).get('lang');
  return q === 'en' || q === 'hu' ? q : DEFAULT_LANG;
}

type LangContextValue = { lang: Lang; t: Dict; setLang: (l: Lang) => void };
const LangContext = createContext<LangContextValue>({
  lang: DEFAULT_LANG,
  t: dicts[DEFAULT_LANG],
  setLang: () => {},
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(resolveInitialLang);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.title = dicts[lang].meta.title;
  }, [lang]);

  // Session-only switch (not persisted); a refresh reverts to the default language.
  const setLang = (l: Lang) => {
    setLangState(l);
  };

  return (
    <LangContext.Provider value={{ lang, t: dicts[lang], setLang }}>
      {children}
    </LangContext.Provider>
  );
}

// Returns the active language's dictionary, e.g. const t = useT(); t.nav.home
export function useT(): Dict {
  return useContext(LangContext).t;
}

// Full context when the current language or a setter is needed (e.g. a language switch).
export function useLang(): LangContextValue {
  return useContext(LangContext);
}
