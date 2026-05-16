/**
 * StockBandRow — container for the two market ticker bands (S&P 500 and JSE).
 * Fetches quotes server-side and renders the bands with hairline dividers.
 * Placed directly under the Hero visually.
 * Used by: app/page.tsx
 */

// 3. Internal
import { getSpQuotes, getJseQuotes } from "@/lib/markets";

// 4. Relative
import { StockBand } from "./StockBand";
import { Hairline } from "@/components/shared/Hairline";

// ─── COMPONENT ───────────────────────────────────
export async function StockBandRow() {
  // ─── DATA ──────────────────────────────────────
  const [spQuotes, jseQuotes] = await Promise.all([
    getSpQuotes(),
    getJseQuotes(),
  ]);

  // ─── RENDER ────────────────────────────────────
  // If both fail to fetch any quotes, we might render empty bands, 
  // but lib/markets.ts ensures it returns whatever succeeded.
  return (
    <div className="w-full flex flex-col bg-white">
      <Hairline />
      <StockBand quotes={spQuotes} direction="left" />
      <Hairline />
      <StockBand quotes={jseQuotes} direction="right" />
    </div>
  );
}
