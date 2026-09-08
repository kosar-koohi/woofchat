"use client";

import { createContext, useContext } from "react";
import { DEFAULT_LANG, strings, type Dict, type Lang } from "@/lib/i18n";

/**
 * Language context. Avoids threading `t` through every nested component
 * (chip groups, panels) that only needs a handful of labels.
 */
const Ctx = createContext<{ lang: Lang; t: Dict }>({
  lang: DEFAULT_LANG,
  t: strings(DEFAULT_LANG),
});

export function I18nProvider({
  lang,
  children,
}: {
  lang: Lang;
  children: React.ReactNode;
}) {
  return <Ctx.Provider value={{ lang, t: strings(lang) }}>{children}</Ctx.Provider>;
}

export function useT(): Dict {
  return useContext(Ctx).t;
}

export function useLang(): Lang {
  return useContext(Ctx).lang;
}
