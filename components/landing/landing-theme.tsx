"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";

export type LandingTheme = "system" | "light" | "dark";

const THEME_STORAGE_KEY = "smct-landing-theme";
const THEME_CHANGE_EVENT = "smct-landing-theme-change";
const DEFAULT_THEME: LandingTheme = "system";

/*
 * The in-memory value makes theme changes work even when browser storage is
 * unavailable. It is only populated on the client, never during render.
 */
let memoryTheme: LandingTheme | null = null;

type LandingThemeContextValue = {
  theme: LandingTheme;
  setTheme: (theme: LandingTheme) => void;
};

const LandingThemeContext = createContext<LandingThemeContextValue | null>(
  null,
);

export function isLandingTheme(value: string | null): value is LandingTheme {
  return value === "system" || value === "light" || value === "dark";
}

function readStoredTheme(): LandingTheme {
  try {
    const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isLandingTheme(storedTheme) ? storedTheme : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

function getThemeSnapshot(): LandingTheme {
  return memoryTheme ?? readStoredTheme();
}

function getServerThemeSnapshot(): LandingTheme {
  return DEFAULT_THEME;
}

function subscribeToTheme(onStoreChange: () => void): () => void {
  function handleStorage(event: StorageEvent) {
    if (event.key !== null && event.key !== THEME_STORAGE_KEY) {
      return;
    }

    memoryTheme =
      event.key === THEME_STORAGE_KEY && isLandingTheme(event.newValue)
        ? event.newValue
        : null;
    onStoreChange();
  }

  function handleLocalChange() {
    onStoreChange();
  }

  window.addEventListener("storage", handleStorage);
  window.addEventListener(THEME_CHANGE_EVENT, handleLocalChange);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(THEME_CHANGE_EVENT, handleLocalChange);
  };
}

export default function LandingThemeProvider({
  children,
}: {
  children: ReactNode;
}) {
  /*
   * The server snapshot is always "system", so the first client render matches
   * the server markup exactly. useSyncExternalStore switches to the stored
   * preference only after hydration.
   */
  const theme = useSyncExternalStore(
    subscribeToTheme,
    getThemeSnapshot,
    getServerThemeSnapshot,
  );

  const setTheme = useCallback((nextTheme: LandingTheme) => {
    memoryTheme = nextTheme;

    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    } catch {
      // The in-memory theme still applies when persistence is unavailable.
    }

    window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
  }, []);

  const value = useMemo(
    () => ({ theme, setTheme }),
    [theme, setTheme],
  );

  return (
    <LandingThemeContext.Provider value={value}>
      <div
        data-theme={theme}
        className="landing-page flex min-h-svh flex-col bg-landing-background font-sans text-landing-foreground"
      >
        {children}
      </div>
    </LandingThemeContext.Provider>
  );
}

export function useLandingTheme(): LandingThemeContextValue {
  const context = useContext(LandingThemeContext);

  if (!context) {
    throw new Error(
      "useLandingTheme must be used within LandingThemeProvider.",
    );
  }

  return context;
}
