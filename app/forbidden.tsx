import Link from "next/link";

export default function Forbidden() {
  return (
    <main className="grid min-h-svh place-items-center bg-background p-6 text-ink">
      <section className="w-full max-w-xl rounded-2xl border border-line bg-white p-8 text-center shadow-sm">
        <p className="text-sm font-semibold tracking-widest text-brand">ACCESS RESTRICTED</p>
        <h1 className="mt-3 text-3xl font-semibold">You’re not allowed to open this page</h1>
        <p className="mt-4 text-base leading-7 text-muted">
          Your account is signed in, but it does not have the role required for this section.
        </p>
        <Link
          href="/dashboard"
          className="mt-6 inline-flex min-h-12 items-center justify-center rounded-xl bg-brand px-5 py-3 font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand"
        >
          Return to dashboard
        </Link>
      </section>
    </main>
  );
}

