"use client";

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

  return (
    <div
      className={`flex min-h-10 items-center gap-2 rounded-md border border-white/20 bg-white px-3 text-[#102b5c] shadow-sm focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-white ${className ?? ""}`}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        className="size-4 shrink-0 stroke-current stroke-[1.7] text-[#2458d3] [stroke-linecap:round] [stroke-linejoin:round]"
      >
        <path d="M12 3v2M12 19v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M3 12h2M19 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" />
        <circle cx="12" cy="12" r="4" />
      </svg>
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
      <svg
        aria-hidden="true"
        viewBox="0 0 16 16"
        fill="none"
        className="pointer-events-none size-3 shrink-0 stroke-current stroke-[1.8] text-slate-500 [stroke-linecap:round] [stroke-linejoin:round]"
      >
        <path d="m4 6 4 4 4-4" />
      </svg>
    </div>
  );
}
