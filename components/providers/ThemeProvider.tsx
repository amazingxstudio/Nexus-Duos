"use client";

import { useEffect } from "react";
import { useThemeStore, resolveAdaptiveTheme } from "@/store/useThemeStore";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const mode = useThemeStore((s) => s.mode);

  useEffect(() => {
    function apply() {
      const resolved = mode === "adaptive" ? resolveAdaptiveTheme() : mode;
      document.documentElement.classList.toggle("theme-light", resolved === "light");
    }
    apply();
    const interval = setInterval(apply, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [mode]);

  return <>{children}</>;
}
