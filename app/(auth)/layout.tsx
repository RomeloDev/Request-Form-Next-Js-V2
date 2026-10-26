import type { ReactNode } from "react";
import AuthBrand from "@/components/auth/auth-brand";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-svh bg-white text-ink lg:grid lg:grid-cols-[minmax(20rem,0.86fr)_minmax(0,1.4fr)]">
      <a href="#auth-content" className="fixed top-3 left-3 z-20 -translate-y-[160%] rounded-lg bg-white px-4 py-3 text-base font-medium text-brand focus:translate-y-0 focus:outline-2 focus:outline-offset-2 focus:outline-brand">
        Skip to content
      </a>
      <AuthBrand />
      <div className="flex min-w-0 flex-col bg-white px-5 pt-8 pb-6 sm:px-8 sm:pt-10 lg:px-10 lg:pt-12 xl:px-16 xl:pt-16">
        <div id="auth-content" tabIndex={-1} className="flex flex-1 flex-col focus:outline-none">
          {children}
        </div>
        <footer className="mx-auto mt-auto flex w-full max-w-3xl flex-col gap-1 pt-12 text-sm leading-6 text-muted sm:flex-row sm:flex-wrap sm:justify-between sm:gap-3">
          <span>SMCT Request Form</span>
          <span>One team. One connected workplace.</span>
        </footer>
      </div>
    </main>
  );
}
