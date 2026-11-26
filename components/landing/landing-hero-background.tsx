export default function LandingHeroBackground() {
  return (
    <div
      aria-hidden="true"
      className="landing-hero-backdrop pointer-events-none absolute inset-0 z-0 overflow-hidden"
    >
      <div className="landing-hero-ambient absolute inset-0" />
      <div className="landing-hero-grid absolute inset-0" />
    </div>
  );
}
