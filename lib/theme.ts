/**
 * Aurora theme hook — minimal, no provider, SSR-safe.
 *
 * Pairs with the inline `__tyvera_theme_init` script in app/layout.tsx which
 * applies the stored preference BEFORE React hydrates, preventing FOUC.
 */
"use client";

import { useCallback, useEffect, useState } from "react";

export type Theme = "light" | "dark";

const STORAGE_KEY = "tyvera-theme";

function getInitialTheme(): Theme {
  if (typeof window === "undefined") return "light";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === "dark") root.classList.add("dark");
  else root.classList.remove("dark");
  root.style.colorScheme = theme;
}

export function useTheme() {
  // Start as light on the server; the inline script and the effect below
  // synchronize to the real value on the client without hydration mismatches,
  // because we only render theme-dependent UI after mount.
  const [theme, setThemeState] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = getInitialTheme();
    setThemeState(t);
    applyTheme(t);
    setMounted(true);
  }, []);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    applyTheme(t);
    try {
      window.localStorage.setItem(STORAGE_KEY, t);
    } catch {
      /* ignore */
    }
  }, []);

  const toggle = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
  }, [theme, setTheme]);

  return { theme, setTheme, toggle, mounted };
}

/**
 * Inline script to run before React hydrates. Prevents flash of wrong theme.
 */
export const THEME_INIT_SCRIPT = `
(function(){try{
  var k='${STORAGE_KEY}';
  var s=localStorage.getItem(k);
  var t=(s==='light'||s==='dark')?s:(window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');
  if(t==='dark')document.documentElement.classList.add('dark');
  document.documentElement.style.colorScheme=t;
}catch(e){}})();
`;
