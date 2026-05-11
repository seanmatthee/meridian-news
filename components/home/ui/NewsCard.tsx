/**
 * NewsCard — versatile story component supporting lead, mid, and dense variants.
 * Centralizes news presentation logic to ensure stylistic consistency.
 * Used by: components/home/ui/Lane.tsx
 */
import { timeAgo, cn } from "@/lib/utils";
import type { NewsItem } from "@/lib/feeds";

// ─── TYPES ───────────────────────────────────────
export type NewsCardVariant = "lead" | "mid" | "dense";

interface NewsCardProps {
  item: NewsItem;
  variant?: NewsCardVariant;
  className?: string;
}

// ─── COMPONENT ───────────────────────────────────
export function NewsCard({ item, variant = "mid", className }: NewsCardProps) {
  const isLead = variant === "lead";
  const isMid = variant === "mid";
  const isDense = variant === "dense";

  // ─── SUB-ELEMENTS ──────────────────────────────
  
  const TriangulationMark = () => (
    item.triangulationCount && item.triangulationCount > 1 ? (
      <span 
        className={cn(
          "inline-block bg-accent shrink-0",
          isLead ? "w-1.5 h-1.5 mr-2 mb-1" : "w-1.5 h-1.5 mr-1.5 mb-px"
        )} 
        aria-label={`Reported by ${item.triangulationCount} sources`}
        title={`Reported by ${item.triangulationCount} sources`}
      />
    ) : null
  );

  const SourceTime = () => (
    <div className={cn("flex items-center gap-2", isLead ? "mb-2" : isMid ? "mb-1.5" : "")}>
      <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
        {item.source} · <span suppressHydrationWarning>{timeAgo(item.publishedAt)}</span>
      </span>
    </div>
  );

  // ─── RENDER ────────────────────────────────────
  return (
    <article className={cn("group block border-b border-border transition-colors hover:border-foreground/40", className)}>
      <a
        href={item.url}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Read: ${item.title}`}
        className={cn(
          "block",
          isLead ? "pb-5" : isMid ? "py-4" : "flex justify-between gap-3 py-2.5"
        )}
      >
        {isLead && <div className="w-8 h-[3px] bg-accent mb-4" />}
        
        <div className="flex-1 min-w-0">
          {!isDense && <SourceTime />}
          
          <h3 className={cn(
            "text-foreground transition-colors group-hover:text-accent",
            isLead ? "font-serif font-semibold text-[19px] leading-tight line-clamp-4" : 
            isMid ? "font-sans font-semibold text-[15px] leading-snug line-clamp-3" :
            "font-sans font-medium text-[13px] leading-snug line-clamp-2"
          )}>
            <TriangulationMark />
            {item.title}
          </h3>

          {!isDense && item.description && (
            <p className={cn(
              "font-sans leading-relaxed text-muted-foreground mt-2",
              isLead ? "text-[13px] line-clamp-2" : "text-[12px] line-clamp-1 mt-1.5"
            )}>
              {item.description}
            </p>
          )}
        </div>

        {isDense && (
          <span className="font-mono text-[10px] tracking-[0.08em] text-muted-foreground shrink-0 text-right mt-0.5" suppressHydrationWarning>
            {timeAgo(item.publishedAt)}
          </span>
        )}
      </a>
    </article>
  );
}
