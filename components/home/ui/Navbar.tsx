"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";

const LINKS = [
  { href: "#daily-briefing", label: "AI Summary" },
  { href: "#news-grid", label: "News Articles" },
];

export function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <div className="sticky top-8 z-40 bg-white border-b border-border">
      <div className="flex items-center justify-between h-10 px-4 md:px-10 max-w-7xl mx-auto">
        {/* Wordmark */}
        <span className="font-mono text-[11px] font-semibold tracking-[0.12em] uppercase text-foreground">
          MERIDIAN
        </span>

        {/* Desktop links */}
        <nav className="hidden md:flex items-center gap-8">
          {LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground hover:text-foreground transition-colors"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Mobile burger */}
        <button
          className="md:hidden flex items-center justify-center w-8 h-8 text-foreground"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Close menu" : "Open menu"}
        >
          {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </button>
      </div>

      {/* Mobile dropdown */}
      {open && (
        <div className="md:hidden absolute left-0 right-0 top-full bg-white border-b border-border z-50">
          {LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="flex items-center h-12 px-6 font-mono text-[12px] uppercase tracking-[0.08em] text-muted-foreground hover:text-foreground hover:bg-muted/30 border-b border-border last:border-0 transition-colors"
            >
              {link.label}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
