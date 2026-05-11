/**
 * Footer — the bottom navigation and metadata section.
 * Shows sources, about info, and the last updated timestamp.
 * Used by: app/page.tsx
 */

// 3. Internal
import { formatSAST } from "@/lib/utils";

// ─── CONSTANTS ───────────────────────────────────
const SOURCES = [
  { name: "TechCrunch", url: "https://techcrunch.com" },
  { name: "The Verge", url: "https://theverge.com" },
  { name: "Hacker News", url: "https://news.ycombinator.com" },
  { name: "BBC World", url: "https://bbc.com/news/world" },
  { name: "The Guardian", url: "https://theguardian.com" },
  { name: "Al Jazeera", url: "https://aljazeera.com" },
  { name: "Bloomberg", url: "https://bloomberg.com" },
  { name: "Moneyweb", url: "https://moneyweb.co.za" },
  { name: "MarketWatch", url: "https://marketwatch.com" },
  { name: "FT Markets", url: "https://ft.com/markets" },
  { name: "News24", url: "https://news24.com" },
  { name: "Daily Maverick", url: "https://dailymaverick.co.za" },
  { name: "MyBroadband", url: "https://mybroadband.co.za" },
];

// ─── COMPONENT ───────────────────────────────────
export function Footer() {
  // ─── DERIVED ───────────────────────────────────
  const now = new Date();
  const timestamp = formatSAST(now);
  const year = now.getFullYear();

  // ─── RENDER ────────────────────────────────────
  return (
    <footer
      id="site-footer"
      role="contentinfo"
      className="border-t border-border bg-white"
    >
      <div className="max-w-7xl mx-auto px-6 md:px-10 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-12">
          {/* Sources */}
          <div>
            <h3 className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground mb-4">
              Sources
            </h3>
            <div className="flex flex-wrap gap-x-4 gap-y-1.5">
              {SOURCES.map((source) => (
                <a
                  key={source.name}
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Visit ${source.name}`}
                  className="font-sans text-[13px] text-muted-foreground hover:text-foreground transition-colors"
                >
                  {source.name}
                </a>
              ))}
            </div>
          </div>

          {/* About */}
          <div>
            <h3 className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground mb-4">
              About
            </h3>
            <p className="font-sans text-[13px] leading-relaxed text-muted-foreground">
              Meridian is an AI-powered intelligence briefing that aggregates
              signal from trusted sources across five domains. Built for
              investors, founders, and operators who need clarity without noise.
              Designed by Sean Matthee
            </p>
          </div>

          {/* Updated */}
          <div>
            <h3 className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground mb-4">
              Last Updated
            </h3>
            <p className="font-mono text-[13px] text-muted-foreground">
              {timestamp}
            </p>
          </div>
        </div>

        {/* Masthead */}
        <div className="mt-12 pt-8 border-t border-border">
          <p className="font-serif font-bold text-2xl tracking-[0.04em] text-foreground">
            MERIDIAN
          </p>
          <p className="font-sans text-[13px] text-muted-foreground mt-1">
            Five lanes of signal. Zero noise. Made By Sean Matthee    &copy; {year}
          </p>
        </div>
      </div>
    </footer>
  );
}
