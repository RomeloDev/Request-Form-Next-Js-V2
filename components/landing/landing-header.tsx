import Image from "next/image";
import Link from "next/link";
import LandingMobileNav from "./landing-mobile-nav";
// import LandingThemeControl from "./landing-theme-control";

const sectionLinks = [
  { href: "#how-it-works", label: "How it works" },
  { href: "#benefits", label: "Benefits" },
  { href: "#faq", label: "FAQ" },
  { href: "#feedback", label: "Feedback" },
];

export default function LandingHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#102b5c] text-white shadow-[0_4px_18px_rgba(6,24,52,0.16)]">
      <div className="mx-auto flex min-h-16 w-full max-w-7xl items-center justify-between gap-3 px-4 py-2 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="flex min-h-11 min-w-0 items-center gap-3 rounded-md focus:outline-2 focus:outline-offset-4 focus:outline-white"
        >
          <span className="w-16 shrink-0 rounded-md bg-white p-1.5 shadow-sm sm:w-20">
            <Image
              src="/brand/smct-logo.png"
              alt="SMCT Group of Companies"
              width={504}
              height={228}
              className="block h-auto w-full"
              preload
            />
          </span>
          <span className="min-w-0 leading-tight font-semibold tracking-tight">
            <span className="hidden text-[0.65rem] tracking-[0.12em] text-blue-100/75 uppercase sm:block">
              SMCT Group of Companies
            </span>
            <span className="block text-sm text-white sm:mt-1 sm:text-base">
              Request Form Online
            </span>
          </span>
        </Link>

        <nav
          aria-label="Primary"
          className="hidden items-center gap-1 lg:flex"
        >
          {sectionLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="inline-flex min-h-10 items-center rounded-md px-3 text-sm font-medium text-blue-100/80 transition-colors hover:bg-white/10 hover:text-white focus:outline-2 focus:outline-offset-2 focus:outline-white"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          {/* <LandingThemeControl id="landing-theme-desktop" /> */}
          <Link
            href="/login"
            className="inline-flex min-h-10 items-center rounded-md border border-white/25 px-4 text-sm font-semibold text-white transition-colors hover:bg-white/10 focus:outline-2 focus:outline-offset-2 focus:outline-white"
          >
            Sign in
          </Link>
          <Link
            href="/registration"
            className="inline-flex min-h-10 items-center rounded-md bg-white px-4 text-sm font-semibold text-[#102b5c] transition-colors hover:bg-blue-50 focus:outline-2 focus:outline-offset-2 focus:outline-white"
          >
            Create account
          </Link>
        </div>

        <LandingMobileNav links={sectionLinks} />
      </div>
    </header>
  );
}
