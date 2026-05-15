import type { Metadata } from "next";
import { StockBandRow } from "@/components/home/ui/StockBandRow";
import { Briefing } from "@/components/home/sections/Briefing";
import { NewsGrid } from "@/components/home/sections/NewsGrid";

// Dynamic: this page reads from Postgres (UserSummary cache) and runs
// transformers.js at request time. Static prerendering would happen before
// migrations run on first deploy. The Briefing itself is cached via
// unstable_cache for 12h; news feeds are cached for 10m.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "The World — MERIDIAN",
  description:
    "The day's intelligence briefing across AI, world news, business, finance, and South Africa.",
};

export default function BriefingPage() {
  return (
    <>
      <StockBandRow />
      <Briefing />
      <NewsGrid />
    </>
  );
}
