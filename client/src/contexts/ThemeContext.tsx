import React, { createContext, useContext, useEffect, useState } from "react";

export type Theme = "light" | "dark" | "soapies" | "midnight";

export const THEMES: { id: Theme; label: string; emoji: string; description: string; preview: string[] }[] = [
  {
    id: "light",
    label: "Light",
    emoji: "☀️",
    description: "Clean white",
    preview: ["#fff8fc", "#ffffff", "#f000bc"],
  },
  {
    id: "dark",
    label: "Dark",
    emoji: "🌙",
    description: "Dark mode",
    preview: ["#1a0a20", "#2a1535", "#f000bc"],
  },
  {
    id: "soapies",
    label: "Soapies",
    emoji: "🧼",
    description: "Pink & purple",
    preview: ["#fce4f6", "#f0d0ff", "#c026d3"],
  },
  {
    id: "midnight",
    label: "Midnight",
    emoji: "✨",
    description: "Deep violet glow",
    preview: ["#0d0018", "#1a0035", "#a855f7"],
  },
];

interface ThemeContextType {
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggleTheme: () => void;
  switchable: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_CLASSES: Theme[] = ["light", "dark", "soapies", "midnight"];

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
  switchable?: boolean;
}

export function ThemeProvider({
  children,
  defaultTheme = "light",
  switchable = true,
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (switchable) {
      const stored = localStorage.getItem("soapies-theme") as Theme | null;
      if (stored && THEME_CLASSES.includes(stored)) return stored;
    }
    return defaultTheme;
  });

  useEffect(() => {
    const root = document.documentElement;
    // Remove all theme classes first
    THEME_CLASSES.forEach(t => root.classList.remove(t));
    // Add current theme class
    root.classList.add(theme);
    if (switchable) {
      localStorage.setItem("soapies-theme", theme);
    }
  }, [theme, switchable]);

  const setTheme = (t: Theme) => {
    if (switchable) setThemeState(t);
  };

  // Cycle through themes for simple toggle
  const toggleTheme = () => {
    if (!switchable) return;
    const idx = THEME_CLASSES.indexOf(theme);
    setThemeState(THEME_CLASSES[(idx + 1) % THEME_CLASSES.length]);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme, switchable }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}
