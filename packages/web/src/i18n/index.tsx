import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { en } from './en';
import { hu } from './hu';

export type Lang = 'en' | 'hu';
export type Dict = typeof en;

const dicts: Record<Lang, Dict> = { en, hu };

// Deployed default is Hungarian; override at build time with VITE_DEFAULT_LANG if needed.
const DEFAULT_LANG: Lang = import.meta.env.VITE_DEFAULT_LANG === 'en' ? 'en' : 'hu';

// Language precedence: ?lang= query param (also persisted) → localStorage → default.
function resolveInitialLang(): Lang {
  const q = new URLSearchParams(window.location.search).get('lang');
  if (q === 'en' || q === 'hu') {
    localStorage.setItem('lang', q);
    return q;
  }
  const stored = localStorage.getItem('lang');
  return stored === 'en' || stored === 'hu' ? stored : DEFAULT_LANG;
}

type LangContextValue = { lang: Lang; t: Dict; setLang: (l: Lang) => void };
const LangContext = createContext<LangContextValue>({ lang: DEFAULT_LANG, t: dicts[DEFAULT_LANG], setLang: () => {} });

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(resolveInitialLang);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.title = dicts[lang].meta.title;
  }, [lang]);

  const setLang = (l: Lang) => {
    localStorage.setItem('lang', l);
    setLangState(l);
  };

  return <LangContext.Provider value={{ lang, t: dicts[lang], setLang }}>{children}</LangContext.Provider>;
}

// Returns the active language's dictionary, e.g. const t = useT(); t.nav.home
export function useT(): Dict {
  return useContext(LangContext).t;
}

// Full context when the current language or a setter is needed (e.g. a language switch).
export function useLang(): LangContextValue {
  return useContext(LangContext);
}
