/**
 * Eyebrow — mono uppercase label used for section markers and metadata lines.
 * Standardises the 10–11px mono tracking-wide pattern across the app.
 * Used by: lane headers, briefing date, section labels.
 */

// ─── TYPES ───────────────────────────────────────
interface EyebrowProps {
  children: React.ReactNode;
  className?: string;
}

// ─── COMPONENT ───────────────────────────────────
export function Eyebrow({ children, className }: EyebrowProps) {
  return (
    <span
      className={`
        font-mono text-[11px] uppercase tracking-[0.08em]
        text-muted-foreground
        ${className ?? ""}
      `}
    >
      {children}
    </span>
  );
}
