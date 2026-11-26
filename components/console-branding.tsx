"use client";

import { useEffect } from "react";

const BRAND_STYLE = [
  "font-family: ui-monospace, SFMono-Regular, Menlo, monospace",
  "font-size: 40px",
  "font-weight: 900",
  "letter-spacing: 0.06em",
  "color: #2458d3",
  "text-shadow: 2px 2px 0 #dbeafe",
].join(";");

const TAGLINE_STYLE = [
  "font-family: ui-monospace, SFMono-Regular, Menlo, monospace",
  "font-size: 17px",
  "font-weight: 600",
  "letter-spacing: 0.04em",
  "color: #528dec",
  "text-shadow: 0.5px 0.5px 0 #f1f5f9",
].join(";");

let hasLoggedBrand = false;

export default function ConsoleBranding() {
  useEffect(() => {
    if (hasLoggedBrand) return;

    hasLoggedBrand = true;
    console.info("%cSMCT REQUEST FORM", BRAND_STYLE);
    console.info(
      "%cOfficial request routing and approval system.",
      TAGLINE_STYLE,
    );
    console.info("%cDeveloped by John Romel D. Lucot", TAGLINE_STYLE);
  }, []);

  return null;
}
