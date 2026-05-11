/**
 * Ticker — sticky utility bar at the top of the page.
 * Shows date/time on the left, market data on the right.
 * Desktop: static row. Mobile: CSS-only infinite marquee.
 * Used by: app/page.tsx
 */

// 2. External libs
import { TrendingUp, TrendingDown } from "lucide-react";

// 3. Internal
import { formatSAST, formatHeroDate } from "@/lib/utils";

// ─── TYPES ───────────────────────────────────────
export interface TickerItem {
  symbol: string;
  label: string;
  value: string;
  change: number;
  changePercent: string;
}

interface TickerProps {
  items?: TickerItem[];
}

// ─── CONSTANTS ───────────────────────────────────
const FALLBACK_TICKERS: TickerItem[] = [
  { symbol: "JSE", label: "JSE All Share", value: "85,421.30", change: 0.45, changePercent: "+0.45%" },
  { symbol: "USDZAR", label: "USD/ZAR", value: "17.8432", change: -0.12, changePercent: "-0.12%" },
  { symbol: "SPX", label: "S&P 500", value: "5,831.20", change: 0.78, changePercent: "+0.78%" },
  { symbol: "BTC", label: "Bitcoin", value: "$99,840", change: 1.23, changePercent: "+1.23%" },
];

// ─── SUB-COMPONENT ───────────────────────────────
function TickerValue({ item }: { item: TickerItem }) {
  const isUp = item.change >= 0;

  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <span className="text-muted-foreground">{item.label}</span>
      <span className="font-medium text-foreground">{item.value}</span>
      <span className="inline-flex items-center gap-0.5 text-foreground/70">
        {isUp ? (
          <TrendingUp className="h-2.5 w-2.5" />
        ) : (
          <TrendingDown className="h-2.5 w-2.5" />
        )}
        <span>{item.changePercent}</span>
      </span>
    </span>
  );
}

// ─── COMPONENT ───────────────────────────────────
export function Ticker({ items }: TickerProps) {
  const now = new Date();
  const dateStr = formatHeroDate(now);
  const timeStr = formatSAST(now);
  const tickers = items ?? FALLBACK_TICKERS;

  // ─── RENDER ────────────────────────────────────
  return (
    <div
      id="utility-bar"
      className="sticky top-0 z-50 h-8 border-b border-border bg-white"
    >
      <div className="flex h-full items-center max-w-[100vw] overflow-hidden">
        {/* Date + Time — always visible */}
        <div
          className="
            shrink-0 flex items-center gap-3
            px-4 md:px-6 h-full
            font-mono text-[11px] tracking-[0.08em] text-muted-foreground uppercase
            border-r border-border
          "
        >
          <span>{dateStr}</span>
          <span className="hidden sm:inline text-border">|</span>
          <span className="hidden sm:inline">{timeStr}</span>
        </div>

        {/* Desktop: static row */}
        <div className="hidden md:flex items-center gap-6 px-6 h-full font-mono text-[11px] tracking-[0.04em]">
          {tickers.map((item) => (
            <TickerValue key={item.symbol} item={item} />
          ))}
        </div>

        {/* Mobile: CSS marquee */}
        <div className="flex md:hidden items-center h-full overflow-hidden flex-1">
          <div className="animate-marquee flex items-center gap-8 font-mono text-[11px] tracking-[0.04em] whitespace-nowrap">
            {/* Duplicate for seamless loop */}
            {[...tickers, ...tickers].map((item, i) => (
              <TickerValue key={`${item.symbol}-${i}`} item={item} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
