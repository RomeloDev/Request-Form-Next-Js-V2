"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useSession } from "@/components/auth/session-provider";
import { dashboardFor } from "@/lib/auth";
import { isAuditor, navigationFor } from "@/lib/navigation";
import FormAlert from "@/components/ui/form-alert";
import Icon from "@/components/ui/icon";
import AccountMenu from "@/components/layouts/account-menu";

export default function AppShell({ children }: { children: ReactNode }) {
  const { user, logout } = useSession();
  const pathname = usePathname();
  const dialog = useRef<HTMLDialogElement>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  const roleLabel = user.role === "Admin" ? "Administrator" : user.role === "approver" ? "Approver" : "User";
  const name = user.name || user.firstName || "Your account";

  useEffect(() => {
    const query = window.matchMedia("(min-width: 1024px)");
    const handleResize = () => { if (query.matches) dialog.current?.close(); };
    query.addEventListener("change", handleResize);
    return () => query.removeEventListener("change", handleResize);
  }, []);

  async function handleLogout() {
    if (leaving || !window.confirm("Sign out of your account?")) return;
    setLeaving(true);
    setLogoutError("");
    try { await logout(); }
    catch { setLogoutError("We couldn’t sign you out. Please try again."); setLeaving(false); }
  }

  function sidebar() {
    return (
      <div className="flex h-full flex-col">
        <Link href={dashboardFor(user)} onClick={() => dialog.current?.close()} className="flex min-h-24 shrink-0 items-center gap-3 border-b border-white/10 px-6 focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-white">
          <span className="w-20 rounded-lg bg-white p-1.5"><Image src="/brand/smct-logo.png" alt="SMCT Group of Companies" width={504} height={228} className="h-auto w-full" /></span>
          <span className="text-sm font-semibold tracking-widest text-blue-100">REQUEST<br />FORM</span>
        </Link>
        <nav aria-label="Main navigation" className="flex-1 overflow-y-auto px-4 py-6">
          <p className="mb-3 px-3 text-xs font-semibold tracking-widest text-blue-100/80">WORKSPACE</p>
          <ul className="space-y-1">
            {navigationFor(user).map((item) => (
              <li key={item.label}>
                {item.available ? (
                  <Link href={item.href} onClick={() => dialog.current?.close()} aria-current={pathname === item.href ? "page" : undefined} className={`flex min-h-12 items-center gap-3 rounded-xl px-3 py-3 text-base font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${pathname === item.href ? "bg-white text-brand shadow-sm" : "text-blue-50 hover:bg-white/10"}`}>
                    <Icon name={item.icon} />{item.label}
                  </Link>
                ) : (
                  <button type="button" disabled title="This section is not available yet." className="flex min-h-12 w-full cursor-not-allowed items-center gap-3 rounded-xl px-3 py-3 text-left text-base text-blue-100/70">
                    <Icon name={item.icon} />{item.label}
                  </button>
                )}
              </li>
            ))}
          </ul>
        </nav>
        <div className="shrink-0 border-t border-white/10 p-4">
          <p className="truncate px-3 text-base font-medium">{name}</p>
          <p className="mt-1 px-3 text-sm text-blue-100/80">{roleLabel}{isAuditor(user) ? " · Audit access" : ""}</p>
          <button type="button" disabled={leaving} onClick={handleLogout} className="mt-3 flex min-h-12 w-full items-center gap-3 rounded-xl border border-white/20 px-3 py-3 text-left text-base font-medium hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:opacity-60"><Icon name="logout" />{leaving ? "Signing out…" : "Sign out"}</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-svh bg-background text-ink lg:grid lg:grid-cols-[17rem_minmax(0,1fr)]">
      <a href="#workspace-content" className="fixed top-3 left-3 z-50 -translate-y-[160%] rounded-lg bg-white px-4 py-3 text-brand focus:translate-y-0 focus:outline-2 focus:outline-brand">Skip to main content</a>
      <aside className="sticky top-0 hidden h-svh bg-auth-brand text-white lg:block">{sidebar()}</aside>
      <dialog ref={dialog} onClose={() => setMobileOpen(false)} aria-label="Workspace navigation" className="fixed inset-y-0 left-0 m-0 h-svh max-h-none w-72 max-w-[90vw] border-0 bg-auth-brand p-0 text-white backdrop:bg-slate-950/50">
        <button type="button" onClick={() => dialog.current?.close()} aria-label="Close navigation" className="absolute top-2 right-2 grid size-11 place-items-center rounded-lg bg-slate-900 text-white focus-visible:outline-2 focus-visible:outline-white"><Icon name="close" /></button>
        {sidebar()}
      </dialog>
      <div className="min-w-0">
        <header className="sticky top-0 z-20 flex min-h-24 flex-wrap items-center justify-between gap-4 border-b border-line/60 bg-white px-5 py-4 sm:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button type="button" aria-label="Open navigation" aria-expanded={mobileOpen} onClick={() => { dialog.current?.showModal(); setMobileOpen(true); }} className="grid size-11 shrink-0 place-items-center rounded-xl border border-line focus-visible:outline-2 focus-visible:outline-brand lg:hidden"><Icon name="menu" /></button>
            <div><p className="text-sm text-muted">SMCT Request Form</p><p className="text-base font-semibold">Your workspace</p></div>
          </div>
          <AccountMenu name={name} email={user.email} roleLabel={roleLabel} leaving={leaving} onLogout={handleLogout} />
        </header>
        <main id="workspace-content" tabIndex={-1} className="mx-auto p-5 focus:outline-none sm:p-8">
          {logoutError && <FormAlert message={logoutError} onDismiss={() => setLogoutError("")} />}
          {children}
        </main>
        <footer className="mx-auto max-w-7xl px-5 pb-6 text-sm text-muted sm:px-8">SMCT Group of Companies · One connected workplace.</footer>
      </div>
    </div>
  );
}
