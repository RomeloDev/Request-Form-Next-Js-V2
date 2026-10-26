import Image from "next/image";

export default function AuthBrand() {
  return (
    <aside
      aria-label="SMCT Request Form"
      className="relative flex flex-col overflow-hidden bg-auth-brand px-6 py-5 text-white sm:px-8 lg:sticky lg:top-0 lg:h-svh lg:min-h-[44rem] lg:px-8 lg:pt-10 lg:pb-8 xl:px-12"
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute top-[10%] -right-[27rem] size-[34rem] rounded-full border border-white/5 shadow-[0_0_0_70px_#ffffff03,0_0_0_140px_#ffffff03]"
      />

      <div className="relative flex items-center justify-between gap-4 lg:justify-start">
        <div className="w-24 shrink-0 rounded-xl bg-white p-2 shadow-lg shadow-black/10 lg:w-28">
          <Image
            src="/brand/smct-logo.png"
            alt="SMCT Group of Companies"
            width={504}
            height={228}
            className="block h-auto w-full"
            preload
          />
        </div>
        <span className="text-xs leading-relaxed font-semibold tracking-[0.18em] text-blue-100 lg:max-w-28">
          REQUEST FORM
        </span>
      </div>

      <div className="relative my-auto hidden py-12 lg:block">
        <p className="flex items-center gap-2.5 text-sm leading-6 text-blue-100">
          <span className="size-1.5 shrink-0 rounded-full bg-blue-200 ring-4 ring-blue-200/10" />
          Your workplace, connected
        </p>
        <h2 className="mt-6 text-[clamp(2.25rem,3.6vw,3.5rem)] leading-[1.14] font-medium tracking-[-0.055em]">
          Every request.
          <br />
          A step forward.
        </h2>
        <p className="mt-6 max-w-xs text-base leading-7 text-blue-100/90">
          Bring your requests, approvals, and team together in one familiar place.
        </p>

        <div
          aria-hidden="true"
          className="mt-9 max-w-sm rounded-2xl border border-white/15 bg-linear-to-br from-white/10 to-white/5 p-5 shadow-xl shadow-black/10"
        >
          <div className="flex items-center gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-white/10 text-blue-100">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="size-6 stroke-current stroke-[1.4] [stroke-linecap:round] [stroke-linejoin:round]"
              >
                <path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8l-5-5Z" />
                <path d="M14 3v5h5M8 12h8M8 16h5" />
              </svg>
            </span>
            <div className="min-w-0">
              <p className="mb-1 text-xs leading-5 text-blue-100/90">A simpler workday</p>
              <p className="text-sm leading-6 font-medium">From request to approval</p>
            </div>
            <span className="ml-auto text-sm tracking-widest text-blue-100">•••</span>
          </div>
          <div className="my-6 grid gap-2.5">
            <span className="h-1.5 rounded-full bg-white/10" />
            <span className="h-1.5 w-2/3 rounded-full bg-white/10" />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-3 text-xs leading-5 text-blue-100">
            {["Submit", "Review", "Approve"].map((label) => (
              <span key={label} className="flex items-center gap-1.5">
                <span className="grid size-5 place-items-center rounded-full bg-teal-100/15 text-teal-100">✓</span>
                {label}
              </span>
            ))}
          </div>
        </div>

        <p className="mt-7 max-w-xs text-sm leading-6 text-blue-100/90">
          Less paperwork. More room for the work that matters.
        </p>
      </div>

      <div className="relative hidden flex-col gap-1.5 text-sm leading-6 text-blue-100/90 lg:flex">
        <span>SMCT Group of Companies</span>
        <span>Built for our people.</span>
      </div>
    </aside>
  );
}
