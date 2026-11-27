"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
// import LandingThemeControl from "./landing-theme-control";

type MobileNavLink = {
  href: string;
  label: string;
};

type LandingMobileNavProps = {
  links: ReadonlyArray<MobileNavLink>;
};

const panelId = "landing-mobile-navigation";

export default function LandingMobileNav({ links }: LandingMobileNavProps) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  function closeMenu() {
    setOpen(false);
  }

  useEffect(() => {
    if (!open) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }

    function handlePointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    const desktopQuery = window.matchMedia("(min-width: 1024px)");

    function handleDesktopChange(event: MediaQueryListEvent) {
      if (event.matches) {
        setOpen(false);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("pointerdown", handlePointerDown);
    desktopQuery.addEventListener("change", handleDesktopChange);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("pointerdown", handlePointerDown);
      desktopQuery.removeEventListener("change", handleDesktopChange);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="lg:hidden">
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={open ? "Close navigation menu" : "Open navigation menu"}
        onClick={() => setOpen((current) => !current)}
        className="grid size-10 place-items-center rounded-md border border-white/25 text-white transition-colors hover:bg-white/10 focus:outline-2 focus:outline-offset-2 focus:outline-white"
      >
        {open ? (
          <X aria-hidden="true" className="size-5" strokeWidth={1.75} />
        ) : (
          <Menu aria-hidden="true" className="size-5" strokeWidth={1.75} />
        )}
      </button>

      <div
        id={panelId}
        hidden={!open}
        className="absolute inset-x-0 top-full max-h-[calc(100svh-4rem)] overflow-y-auto border-b border-slate-200 bg-white text-[#13233c] shadow-[0_24px_40px_-24px_rgba(7,20,38,0.35)]"
      >
        <nav
          aria-label="Primary"
          className="mx-auto w-full max-w-7xl px-4 py-4 sm:px-6"
        >
          <ul className="grid gap-1">
            {links.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  onClick={closeMenu}
                  className="flex min-h-10 items-center rounded-md px-3 text-sm font-medium text-slate-600 transition-colors hover:bg-blue-50 hover:text-[#13233c] focus:outline-2 focus:outline-offset-2 focus:outline-[#2458d3]"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>

          <div className="my-4 h-px bg-slate-200" />

          {/* <div className="flex items-center justify-between gap-3">
            <LandingThemeControl
              id="landing-theme-mobile"
              className="w-full justify-between border-slate-300 sm:w-auto"
            />
            <span className="hidden text-xs leading-5 text-slate-500 sm:block">
              Choose your viewing theme
            </span>
          </div> */}

          <div className="mt-4 grid grid-cols-2 gap-2">
            <Link
              href="/login"
              onClick={closeMenu}
              className="inline-flex min-h-10 items-center justify-center rounded-md border border-slate-300 px-4 text-sm font-semibold text-[#13233c] transition-colors hover:bg-slate-50 focus:outline-2 focus:outline-offset-2 focus:outline-[#2458d3]"
            >
              Sign in
            </Link>
            <Link
              href="/registration"
              onClick={closeMenu}
              className="inline-flex min-h-10 items-center justify-center rounded-md bg-[#102b5c] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#173d7a] focus:outline-2 focus:outline-offset-2 focus:outline-[#2458d3]"
            >
              Create account
            </Link>
          </div>
        </nav>
      </div>
    </div>
  );
}
