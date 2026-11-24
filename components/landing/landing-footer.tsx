import Image from "next/image";
import Link from "next/link";

export default function LandingFooter() {
  return (
    <footer className="border-t border-white/10 bg-landing-navy text-white">
      <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:px-8 lg:py-12">
        <div>
          <div className="w-24 rounded-lg bg-white p-2 shadow-lg shadow-black/10 sm:w-28">
            <Image
              src="/brand/smct-logo.png"
              alt="SMCT Group of Companies"
              width={504}
              height={228}
              className="block h-auto w-full"
            />
          </div>
          <p className="mt-5 max-w-sm text-sm leading-6 text-white/75">
            The internal Request Form System for SMCT Group of Companies.
            Submit, review, and approve workplace requests in one connected
            place.
          </p>
        </div>

        <nav aria-label="Footer" className="md:justify-self-end">
          <p className="text-xs font-semibold tracking-[0.18em] text-white/50 uppercase">
            Get started
          </p>
          <ul className="mt-4 flex flex-col gap-3 text-sm font-medium text-white/80">
            <li>
              <Link
                href="/login"
                className="rounded-sm transition-colors hover:text-white focus:outline-2 focus:outline-offset-4 focus:outline-white"
              >
                Sign in
              </Link>
            </li>
            <li>
              <Link
                href="/registration"
                className="rounded-sm transition-colors hover:text-white focus:outline-2 focus:outline-offset-4 focus:outline-white"
              >
                Create an account
              </Link>
            </li>
            <li>
              <a
                href="#feedback"
                className="rounded-sm transition-colors hover:text-white focus:outline-2 focus:outline-offset-4 focus:outline-white"
              >
                Share feedback
              </a>
            </li>
          </ul>
        </nav>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-1 px-4 py-5 text-xs leading-5 text-white/55 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p>SMCT Group of Companies. Internal Request Form System.</p>
          <p>One team. One connected workplace.</p>
        </div>
      </div>
    </footer>
  );
}
