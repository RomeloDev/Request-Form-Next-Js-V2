"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import Icon from "@/components/ui/icon";

export default function AccountMenu({ name, email, roleLabel, leaving, onLogout }: {
  name: string; email?: string; roleLabel: string; leaving: boolean; onLogout: () => void;
}) {
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; left: number; width: number } | null>(null);

  function close(restoreFocus = false) {
    setPosition(null);
    if (restoreFocus) trigger.current?.focus();
  }

  function open() {
    const bounds = trigger.current?.getBoundingClientRect();
    if (!bounds) return;
    const width = Math.min(304, window.innerWidth - 32);
    setPosition({ top: bounds.bottom + 10, left: Math.max(16, Math.min(bounds.right - width, window.innerWidth - width - 16)), width });
  }

  useEffect(() => {
    if (!position) return;
    menu.current?.querySelector<HTMLButtonElement>('[role="menuitem"]')?.focus();
    const outside = (event: PointerEvent) => {
      if (!menu.current?.contains(event.target as Node) && !trigger.current?.contains(event.target as Node)) setPosition(null);
    };
    const resize = () => setPosition(null);
    document.addEventListener("pointerdown", outside);
    window.addEventListener("resize", resize);
    return () => { document.removeEventListener("pointerdown", outside); window.removeEventListener("resize", resize); };
  }, [position]);

  function onMenuKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") { event.preventDefault(); close(true); return; }
    if (event.key === "Tab") { close(); return; }
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const items = Array.from(menu.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]') ?? []);
    const current = items.indexOf(document.activeElement as HTMLButtonElement);
    const next = event.key === "Home" ? 0 : event.key === "End" ? items.length - 1 : (current + (event.key === "ArrowDown" ? 1 : -1) + items.length) % items.length;
    items[next]?.focus();
  }

  return <div>
    <button ref={trigger} type="button" aria-label="Open account menu" aria-haspopup="menu" aria-expanded={Boolean(position)} aria-controls={position ? id : undefined} onClick={() => position ? close() : open()} onKeyDown={(event) => { if (event.key === "ArrowDown" || event.key === "ArrowUp") { event.preventDefault(); open(); } }} className="flex min-h-12 items-center gap-3 rounded-full border border-slate-200 bg-white py-1.5 pr-3 pl-1.5 text-ink shadow-sm transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">
      <span className="grid size-9 place-items-center rounded-full bg-blue-50 text-brand"><Icon name="profile" className="size-6" /></span>
      <span className="text-sm font-semibold sm:text-base">{roleLabel}</span><Icon name="chevronDown" className={`size-4 text-muted ${position ? "rotate-180" : ""}`} />
    </button>
    {position && <div ref={menu} id={id} role="menu" aria-label="Account navigation" onKeyDown={onMenuKeyDown} className="fixed z-50 max-h-[70svh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_16px_48px_#0f172a20]" style={position}>
      <div role="presentation" className="border-b border-slate-100 px-3 py-3"><p className="wrap-anywhere text-base font-semibold text-ink">{name}</p>{email && <p className="mt-1 wrap-anywhere text-sm text-muted">{email}</p>}</div>
      {([{ label: "Profile", icon: "profile" }, { label: "Settings", icon: "settings" }] as const).map(({ label, icon }) => <button key={label} type="button" role="menuitem" tabIndex={-1} aria-disabled="true" title={`${label} is not available yet.`} className="mt-1 flex min-h-12 w-full cursor-not-allowed flex-wrap items-center gap-3 rounded-xl px-3 py-3 text-left text-base text-slate-500 focus:bg-slate-100 focus:outline-none"><Icon name={icon} />{label}<span className="ml-auto text-xs">Coming soon</span></button>)}
      <div role="presentation" className="my-2 border-t border-slate-100" />
      <button type="button" role="menuitem" tabIndex={-1} aria-disabled={leaving} onClick={() => { if (!leaving) { close(true); onLogout(); } }} className="flex min-h-12 w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-base font-medium text-rose-700 hover:bg-rose-50 focus:bg-rose-50 focus:outline-none"><Icon name="logout" />{leaving ? "Signing out…" : "Logout"}</button>
    </div>}
  </div>;
}
