import type { Metadata } from "next";
import { StockBandRow } from "@/components/home/ui/StockBandRow";
import { Briefing } from "@/components/home/sections/Briefing";
import { NewsGrid } from "@/components/home/sections/NewsGrid";

export const revalidate = 600; // news freshness — 10 min; briefing is independently cached for 12h

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
