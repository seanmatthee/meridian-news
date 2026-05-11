/**
 * Hairline — a 1px rule using the border token. Reusable across the app.
 * Used by: section dividers, card separators, lane headers.
 */

// ─── TYPES ───────────────────────────────────────
interface HairlineProps {
  className?: string;
}

// ─── COMPONENT ───────────────────────────────────
export function Hairline({ className }: HairlineProps) {
  return (
    <div
      role="separator"
      className={`h-px w-full bg-border ${className ?? ""}`}
    />
  );
}
