"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ApiError } from "@/lib/api";
import { getProfile, signOut, type AuthenticatedUser } from "@/lib/auth";

type Session = { user: AuthenticatedUser; logout: () => Promise<void> };
const SessionContext = createContext<Session | null>(null);

export function useSession() {
  const session = useContext(SessionContext);
  if (!session) throw new Error("useSession requires SessionProvider.");
  return session;
}

export default function SessionProvider({
  children,
  initialUser,
}: {
  children: ReactNode;
  initialUser: AuthenticatedUser;
}) {
  const router = useRouter();
  const [user, setUser] = useState<AuthenticatedUser | null>(initialUser);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    getProfile(controller.signal).then((profile) => {
      if (!controller.signal.aborted) setUser(profile);
    }).catch((error) => {
      if (controller.signal.aborted) return;
      if (error instanceof ApiError && error.status === 401) router.replace("/login");
      else setFailed(true);
    });
    return () => controller.abort();
  }, [attempt, router]);

  async function logout() {
    await signOut();
    setUser(null);
    router.replace("/login");
  }

  if (!user) {
    return (
      <main className="grid min-h-svh place-items-center bg-background p-6 text-ink">
        <div className="max-w-md text-center">
          <p className="mb-4 text-sm font-semibold tracking-widest text-brand">SMCT REQUEST FORM</p>
          <h1 className="text-2xl font-semibold">{failed ? "We couldn’t open your workspace" : "Checking your session…"}</h1>
          <p role="status" className="mt-3 text-base leading-7 text-muted">{failed ? "Please check your connection and try again." : "Please wait while we securely load your account."}</p>
          {failed && <button type="button" onClick={() => { setFailed(false); setAttempt((value) => value + 1); }} className="mt-6 min-h-12 rounded-xl bg-brand px-6 py-3 font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand">Try again</button>}
        </div>
      </main>
    );
  }
  return <SessionContext.Provider value={{ user, logout }}>{children}</SessionContext.Provider>;
}
