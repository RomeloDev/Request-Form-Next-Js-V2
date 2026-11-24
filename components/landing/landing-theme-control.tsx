"use client";

import { ChevronDown, Monitor, Moon, Sun } from "lucide-react";
import {
  isLandingTheme,
  useLandingTheme,
  type LandingTheme,
} from "./landing-theme";

const themeOptions: ReadonlyArray<{ value: LandingTheme; label: string }> = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

type LandingThemeControlProps = {
  id: string;
  className?: string;
};

export default function LandingThemeControl({
  id,
  className,
}: LandingThemeControlProps) {
  const { theme, setTheme } = useLandingTheme();
  const ThemeIcon = theme === "light" ? Sun : theme === "dark" ? Moon : Monitor;

  return (
    <div
      className={`flex min-h-10 items-center gap-2 rounded-md border border-white/20 bg-white px-3 text-[#102b5c] shadow-sm focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-white ${className ?? ""}`}
    >
      <ThemeIcon
        aria-hidden="true"
        className="size-4 shrink-0 text-[#2458d3]"
        strokeWidth={1.75}
      />
      <label htmlFor={id} className="sr-only">
        Landing page theme
      </label>
      <select
        id={id}
        value={theme}
        onChange={(event) => {
          const nextTheme = event.target.value;

          if (isLandingTheme(nextTheme)) {
            setTheme(nextTheme);
          }
        }}
        className="min-h-8 cursor-pointer appearance-none bg-white pr-1 text-sm font-semibold text-[#102b5c] [color-scheme:light] focus:outline-none"
      >
        {themeOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown
        aria-hidden="true"
        className="pointer-events-none size-3 shrink-0 text-slate-500"
        strokeWidth={2}
      />
    </div>
  );
}
