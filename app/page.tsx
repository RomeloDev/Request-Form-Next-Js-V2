import type { Metadata } from "next";
import LandingBenefits from "@/components/landing/landing-benefits";
import LandingFaq from "@/components/landing/landing-faq";
import LandingFooter from "@/components/landing/landing-footer";
import LandingHeader from "@/components/landing/landing-header";
import LandingHero from "@/components/landing/landing-hero";
import LandingLifecycle from "@/components/landing/landing-lifecycle";
import LandingSection from "@/components/landing/landing-section";
import LandingThemeProvider from "@/components/landing/landing-theme";

export const metadata: Metadata = {
  title: "SMCT Request Form | Every request. A step forward.",
  description:
    "Submit, review, approve, and track workplace requests in one connected system built for SMCT Group of Companies.",
};

export default function Home() {
  return (
    <LandingThemeProvider>
      <a
        href="#main-content"
        className="fixed top-3 left-3 z-50 -translate-y-24 rounded-lg bg-landing-navy px-4 py-3 text-sm font-semibold text-white shadow-lg transition-transform focus:translate-y-0 focus:outline-2 focus:outline-offset-2 focus:outline-landing-blue"
      >
        Skip to content
      </a>

      <LandingHeader />

      <main
        id="main-content"
        tabIndex={-1}
        className="flex-1 focus:outline-none"
      >
        <LandingHero />

        <LandingSection
          id="how-it-works"
          eyebrow="How it works"
          title="One documented route for every request"
          description="Stock, purchase order, cash disbursement, and check issuance requests follow one visible path from submission to completion."
        >
          <LandingLifecycle />
        </LandingSection>

        <LandingSection
          id="benefits"
          eyebrow="Why choose Request Form Online"
          title="Built around SMCT’s approval workflow"
          description="Keep request details, routing, decisions, and status updates in one controlled record for requesters and approvers."
          tone="surface"
        >
          <LandingBenefits />
        </LandingSection>

        <LandingSection
          id="faq"
          eyebrow="FAQ"
          title="Quick answers before you begin"
          description="Find clear answers about access, approvals, and the kinds of workplace requests you can submit."
        >
          <LandingFaq />
        </LandingSection>
      </main>

      <LandingFooter />
    </LandingThemeProvider>
  );
}
