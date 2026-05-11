/**
 * StockBand — a single, horizontally looping marquee band of stock quotes.
 * Used by: components/home/ui/StockBandRow.tsx
 */
"use client";

// 2. External libs
import { motion } from "framer-motion";

// 3. Internal
import { cn } from "@/lib/utils";

// 5. Types
import type { StockQuote } from "@/lib/markets";

// ─── TYPES ───────────────────────────────────────
interface StockBandProps {
  quotes: StockQuote[];
  direction: "left" | "right";
  className?: string;
}

// ─── SUB-COMPONENT ───────────────────────────────
function StockTile({ quote }: { quote: StockQuote }) {
  // ─── DERIVED ───────────────────────────────────
  if (!quote || quote.price == null) return null;

  const isUp = quote.changePct > 0;
  const isDown = quote.changePct < 0;
  const glyph = isUp ? "↗" : isDown ? "↘" : "→";
  const sign = isUp ? "+" : "";
  
  // Format price manually to match mock spec if it's not pre-formatted 
  // (In lib/markets.ts we fetch raw numbers)
  const priceDisplay = quote.price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // ─── RENDER ────────────────────────────────────
  return (
    <div className="flex items-center gap-3 px-5 border-r border-border h-full shrink-0">
      <span className="font-mono text-xs font-semibold text-foreground">
        {quote.display}
      </span>
      <span className="font-mono text-xs font-medium text-foreground/90">
        {priceDisplay}
      </span>
      <span className="font-mono text-[11px] font-medium text-foreground/60">
        {glyph} {sign}{quote.changePct.toFixed(2)}%
      </span>
    </div>
  );
}

// ─── COMPONENT ───────────────────────────────────
export function StockBand({ quotes, direction, className }: StockBandProps) {
  // ─── DERIVED ───────────────────────────────────
  // We duplicate the array to allow for a seamless loop
  const duplicated = [...quotes, ...quotes];
  
  // Animation settings
  const isLeft = direction === "left";
  const animateX = isLeft ? ["0%", "-50%"] : ["-50%", "0%"];
  const duration = quotes.length * 2.5; // Scaled duration based on content density

  // ─── RENDER ────────────────────────────────────
  return (
    <div 
      className={cn(
        "flex items-center w-full overflow-hidden",
        "h-10 md:h-11", // 40px mobile, 44px desktop
        className
      )}
      aria-hidden="true"
    >
      <motion.div 
        className="flex items-center h-full whitespace-nowrap will-change-transform"
        animate={{ x: animateX }}
        transition={{
          duration,
          ease: "linear",
          repeat: Infinity,
        }}
      >
        {duplicated.map((quote, idx) => (
          <StockTile key={`${quote.symbol}-${idx}`} quote={quote} />
        ))}
      </motion.div>
    </div>
  );
}
