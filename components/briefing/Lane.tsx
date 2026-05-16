/**
 * Lane — a vertical column in the news grid representing one category.
 * Shows a sticky header and a list of NewsCards.
 * Collapsible on mobile.
 * Used by: components/home/sections/NewsGrid.tsx
 */
"use client";

// 1. React & Next
import { useState, useMemo } from "react";

// 2. External libs
import { ChevronDown } from "lucide-react";

// 4. Relative
import { NewsCard } from "./NewsCard";
import { Hairline } from "@/components/shared/Hairline";
import { Eyebrow } from "@/components/shared/Eyebrow";

// 5. Types
import type { NewsItem, LaneCategory } from "@/lib/feeds";
import { timeAgo } from "@/lib/utils";

// ─── CONSTANTS ───────────────────────────────────
const LANE_LABELS: Record<LaneCategory, string> = {
  ai: "AI",
  world: "WORLD",
  business: "BUSINESS",
  finance: "FINANCE",
  "south-africa": "SOUTH AFRICA",
};

const LANE_DEKS: Record<LaneCategory, string> = {
  ai: "Frontier models, infra, and policy.",
  world: "Power, conflict, and the global news cycle.",
  business: "Companies, deals, and the macro picture.",
  finance: "Markets, rates, and capital flows.",
  "south-africa": "Local signal, from the JSE to the Cape.",
};

const MOBILE_INITIAL_COUNT = 5;

// ─── TYPES ───────────────────────────────────────
interface LaneProps {
  category: LaneCategory;
  items: NewsItem[];
  /** If true, renders in collapsible mode (mobile) */
  collapsible?: boolean;
}

// ─── COMPONENT ───────────────────────────────────
export function Lane({ category, items, collapsible = false }: LaneProps) {
  // ─── HOOKS ─────────────────────────────────────
  const [expanded, setExpanded] = useState(false);

  // ─── DERIVED ───────────────────────────────────
  const label = LANE_LABELS[category];
  const dek = LANE_DEKS[category];

  // "LAST HOUR" grouping
  const { recent, earlier } = useMemo(() => {
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    const r: NewsItem[] = [];
    const e: NewsItem[] = [];

    items.forEach((item) => {
      const age = now - new Date(item.publishedAt).getTime();
      if (age <= oneHour && age >= 0) r.push(item);
      else e.push(item);
    });

    if (r.length >= 3) {
      return { recent: r, earlier: e };
    } else {
      return { recent: [], earlier: items };
    }
  }, [items]);

  const hasGrouping = recent.length >= 3;
  const orderedItems = hasGrouping ? [...recent, ...earlier] : items;

  const visibleItems =
    collapsible && !expanded ? orderedItems.slice(0, MOBILE_INITIAL_COUNT) : orderedItems;
  const hasMore = collapsible && orderedItems.length > MOBILE_INITIAL_COUNT;

  const updatedText = items.length > 0 ? `UPDATED ${timeAgo(items[0].publishedAt).toUpperCase()}` : "UPDATING...";

  // ─── RENDER ────────────────────────────────────
  return (
    <div className="flex flex-col min-w-0">
      {/* Lane header */}
      <div className="sticky top-8 z-20 bg-white px-4 pt-5 pb-3">
        <h2 className="font-serif font-bold text-[22px] text-foreground leading-none mb-1">
          {label}
        </h2>
        <p className="font-serif italic text-[13px] text-muted-foreground mb-3">
          {dek}
        </p>
        <Hairline className="mb-3" />
        <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground" suppressHydrationWarning>
          {items.length} STORIES · {updatedText}
        </span>
      </div>

      {/* Cards container */}
      <div className="flex flex-col px-4 pb-4">
        {items.length === 0 ? (
          <div className="py-6">
            <p className="font-serif italic text-[14px] text-muted-foreground">
              Sources temporarily unavailable. Refreshing in the background.
            </p>
          </div>
        ) : (
          <>
            {visibleItems.map((item, index) => {
              // Grouping headers
              let header = null;
              if (hasGrouping && index === 0) {
                header = <Eyebrow className="mb-2 mt-2">LAST HOUR</Eyebrow>;
              } else if (hasGrouping && index === recent.length) {
                header = <Eyebrow className="mb-2 mt-4">EARLIER</Eyebrow>;
              } else if (index === 4) {
                header = <Eyebrow className="mb-1 mt-4 border-t border-border pt-3">MORE FROM {label}</Eyebrow>;
              }

              // Card component variant selection
              const variant = index === 0 ? "lead" : index <= 3 ? "mid" : "dense";

              return (
                <div key={item.url}>
                  {header}
                  <NewsCard item={item} variant={variant} />
                </div>
              );
            })}
          </>
        )}
      </div>

      {/* Show more / less button (mobile only) */}
      {hasMore && items.length > 0 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="
            flex items-center justify-center gap-1.5
            py-4 px-4 mx-4 mb-4
            font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground
            border border-border rounded-md
            transition-colors hover:text-foreground hover:bg-muted/30
          "
          aria-expanded={expanded}
        >
          {expanded ? "Show less" : `Show ${orderedItems.length - MOBILE_INITIAL_COUNT} more`}
          <ChevronDown
            className={`h-3 w-3 transition-transform ${expanded ? "rotate-180" : ""}`}
          />
        </button>
      )}
    </div>
  );
}
