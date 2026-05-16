"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { NavbarAccount } from "./NavbarAccount";

const LINKS: { href: string; label: string }[] = [
  { href: "/", label: "Home" },
  { href: "/the-world", label: "The World" },
  { href: "/my-world", label: "My World" },
];

export function Navbar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="sticky top-8 z-40 bg-white border-b border-border">
      <div className="flex items-center justify-between h-10 px-4 md:px-10 max-w-7xl mx-auto">
        {/* Wordmark */}
        <Link
          href="/"
          className="font-mono text-[11px] font-semibold tracking-[0.12em] uppercase text-foreground"
        >
          MERIDIAN
        </Link>

        {/* Desktop links */}
        <nav className="hidden md:flex items-center gap-8">
          {LINKS.map((link) => {
            const active =
              link.href === "/"
                ? pathname === "/"
                : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "font-mono text-[11px] uppercase tracking-[0.08em] transition-colors",
                  active
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {link.label}
              </Link>
            );
          })}
          <span className="h-3 w-px bg-border" />
          <NavbarAccount />
          <a
            href="https://www.auto-ascent.us"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden lg:block font-mono text-[10px] uppercase tracking-[0.1em] text-[#00FF00] hover:underline ml-2"
          >
            Designed by Auto Ascent
          </a>
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
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="flex items-center h-12 px-6 font-mono text-[12px] uppercase tracking-[0.08em] text-muted-foreground hover:text-foreground hover:bg-muted/30 border-b border-border last:border-0 transition-colors"
            >
              {link.label}
            </Link>
          ))}
          <a
            href="https://www.auto-ascent.us"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center h-12 px-6 font-mono text-[10px] uppercase tracking-[0.1em] text-[#00FF00] hover:bg-muted/30 transition-colors"
          >
            Designed by Auto Ascent
          </a>
        </div>
      )}
    </div>
  );
}
