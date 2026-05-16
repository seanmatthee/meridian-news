"use client";

import { useCallback, useEffect, useState } from "react";
import { Eyebrow } from "@/components/shared/Eyebrow";
import { Hairline } from "@/components/shared/Hairline";

interface BriefData {
  date: string;
  filterText: string;
  summary: string;
  createdAt: string;
}

interface ApiResponse {
  brief: BriefData | null;
  hasFilter: boolean;
}

export function DailyBriefPanel() {
  const [brief, setBrief] = useState<BriefData | null>(null);
  const [hasFilter, setHasFilter] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/daily-brief");
      if (!res.ok) return;
      const data = (await res.json()) as ApiResponse;
      setBrief(data.brief);
      setHasFilter(data.hasFilter);
    } catch (err) {
      console.error("[daily-brief] load failed:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    try {
      const res = await fetch("/api/daily-brief", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.detail ?? "Could not generate brief.");
      } else {
        setBrief(data.brief);
      }
    } catch (err) {
      console.error("[daily-brief] refresh failed:", err);
      setError("Could not reach the server.");
    } finally {
      setRefreshing(false);
    }
  }, []);

  if (loading) return null;

  // No filter set → guide the user to set one. Subtle, not a popup.
  if (!hasFilter && !brief) {
    return (
      <div className="mb-10 p-5 border border-dashed border-border rounded-md">
        <Eyebrow className="block mb-2">Daily Brief</Eyebrow>
        <p className="font-sans text-[14px] text-muted-foreground leading-relaxed">
          Set a filter in the sidebar (e.g. <em>&ldquo;JSE updates, Global AI policy&rdquo;</em>) and a
          personalized brief will appear here every morning.
        </p>
      </div>
    );
  }

  // Filter is set but no brief yet for today (e.g. cron hasn't run, or first day).
  if (hasFilter && !brief) {
    return (
      <div className="mb-10 p-5 border border-border rounded-md flex items-start justify-between gap-4">
        <div>
          <Eyebrow className="block mb-2">Daily Brief</Eyebrow>
          <p className="font-sans text-[14px] text-foreground leading-relaxed">
            Your morning brief will appear here from tomorrow. Want one now?
          </p>
          {error && (
            <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-destructive mt-2">
              {error}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={refresh}
          disabled={refreshing}
          className="shrink-0 h-9 px-4 rounded-md bg-foreground text-background font-mono text-[10px] uppercase tracking-[0.1em] hover:bg-foreground/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {refreshing ? "Generating…" : "Generate now"}
        </button>
      </div>
    );
  }

  // Brief exists — render it.
  if (!brief) return null;
  return (
    <article className="mb-10">
      <div className="flex items-baseline justify-between mb-3">
        <Eyebrow className="block">Today&rsquo;s Brief</Eyebrow>
        <button
          type="button"
          onClick={refresh}
          disabled={refreshing}
          className="font-mono text-[9px] uppercase tracking-[0.08em] text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
        >
          {refreshing ? "Refreshing…" : "Refresh"}
        </button>
      </div>
      <p className="font-serif italic text-[13px] text-muted-foreground mb-4">
        Based on your filter: &ldquo;{brief.filterText}&rdquo;
      </p>
      <div className="space-y-3">
        {brief.summary
          .split("\n")
          .filter((l) => l.trim())
          .map((para, i) => (
            <p
              key={i}
              className="font-sans text-[15px] leading-[1.7] text-foreground"
              dangerouslySetInnerHTML={{
                __html: para.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold">$1</strong>'),
              }}
            />
          ))}
      </div>
      {error && (
        <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-destructive mt-3">
          {error}
        </p>
      )}
      <Hairline className="mt-8" />
    </article>
  );
}
