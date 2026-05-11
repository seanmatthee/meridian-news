import type { Metadata } from "next";
import { Ticker } from "@/components/home/ui/Ticker";
import { Hero } from "@/components/home/sections/Hero";
import { Briefing } from "@/components/home/sections/Briefing";
import { NewsGrid } from "@/components/home/sections/NewsGrid";
import { Footer } from "@/components/home/sections/Footer";
import { StockBandRow } from "@/components/home/ui/StockBandRow";
import { getMarketData } from "@/lib/markets";

export const metadata: Metadata = {
  title: "MERIDIAN — Daily Intelligence Brief",
  description:
    "Five lanes of signal. Zero noise. AI-powered daily intelligence briefing covering AI, world news, business, finance, and South Africa.",
};

export default async function Home() {
  const marketData = await getMarketData();

  return (
    <>
      {/* Sticky Utility Bar / Ticker */}
      <Ticker items={marketData} />

      <main id="main-content" role="main" className="flex-1">
        {/* Hero + Globe */}
        <Hero />

        {/* Stock Bands */}
        <StockBandRow />

        {/* Daily Briefing */}
        <Briefing />

        {/* News Grid — five lanes */}
        <NewsGrid />
      </main>

      {/* Footer */}
      <Footer />
    </>
  );
}
