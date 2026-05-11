/**
 * utils.ts — core utility functions for string manipulation, date formatting, and styling.
 * Enforces consistent data presentation across the platform.
 */
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// ─── STYLING ──────────────────────────────────────

/**
 * Merges Tailwind classes safely using clsx and tailwind-merge.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ─── STRING MANIPULATION ──────────────────────────

/**
 * Simple URL-based hash for deduplication.
 */
export function hashUrl(url: string): string {
  let hash = 0;
  for (let i = 0; i < url.length; i++) {
    const char = url.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return hash.toString(36);
}

/**
 * Deduplicate items by URL.
 */
export function dedupeByUrl<T extends { url: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const h = hashUrl(item.url);
    if (seen.has(h)) return false;
    seen.add(h);
    return true;
  });
}

/**
 * Safely extract text from XML values — handles fast-xml-parser's 
 * polymorphic object/string return values.
 */
export function toText(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    if ("#text" in obj) return String(obj["#text"] ?? "");
    if ("__cdata" in obj) return String(obj["__cdata"] ?? "");
  }
  return "";
}

/**
 * Decode common HTML entities from a string.
 */
export function decodeEntities(text: string): string {
  return text
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)))
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ");
}

/**
 * Strip HTML tags and decode entities from a raw input.
 */
export function cleanText(value: unknown): string {
  return decodeEntities(toText(value).replace(/<[^>]*>/g, "").trim());
}

// ─── DATE FORMATTING ──────────────────────────────

/**
 * Returns a human-readable time-ago string (e.g. "5m ago", "1h ago").
 */
export function timeAgo(date: Date | string): string {
  const now = new Date();
  const then = typeof date === "string" ? new Date(date) : date;
  const diffMs = now.getTime() - then.getTime();

  if (diffMs < 0) return "just now";

  const minutes = Math.floor(diffMs / 60_000);
  const hours = Math.floor(diffMs / 3_600_000);
  const days = Math.floor(diffMs / 86_400_000);

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return "1d ago";
  return `${days}d ago`;
}

/**
 * Format a date for the hero strip: THURSDAY · 8 MAY 2026
 */
export function formatHeroDate(date: Date = new Date()): string {
  const dayName = new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(date);
  const day = date.getDate();
  const month = new Intl.DateTimeFormat("en-US", { month: "long" }).format(date);
  const year = date.getFullYear();
  
  return `${dayName.toUpperCase()} · ${day} ${month.toUpperCase()} ${year}`;
}

/**
 * Format time as HH:MM SAST (South African Standard Time).
 */
export function formatSAST(date: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-ZA", {
    timeZone: "Africa/Johannesburg",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date) + " SAST";
}

/**
 * Format date for briefing eyebrow: 8 MAY 2026
 */
export function formatBriefingDate(date: Date = new Date()): string {
  const day = date.getDate();
  const month = new Intl.DateTimeFormat("en-US", { month: "long" }).format(date);
  const year = date.getFullYear();
  
  return `${day} ${month.toUpperCase()} ${year}`;
}
