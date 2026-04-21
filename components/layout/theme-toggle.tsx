"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/lib/theme";

type Size = "sm" | "md";

interface ThemeToggleProps {
  size?: Size;
  className?: string;
}

/**
 * Round pill-style theme toggle. Icon flips on click. Aria-friendly.
 */
export function ThemeToggle({ size = "md", className = "" }: ThemeToggleProps) {
  const { theme, toggle, mounted } = useTheme();

  const isDark = theme === "dark";
  const dim = size === "sm" ? "h-8 w-8" : "h-9 w-9";
  const icon = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      aria-pressed={isDark}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className={`inline-flex ${dim} items-center justify-center rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-0 ${className}`}
      style={{
        border: "1px solid var(--aurora-hair)",
        background: "var(--surface-1)",
        color: "var(--aurora-ink)",
      }}
    >
      {/* While not mounted, render the light icon as a stable SSR placeholder */}
      {!mounted || !isDark ? (
        <Sun className={icon} />
      ) : (
        <Moon className={icon} />
      )}
    </button>
  );
}
