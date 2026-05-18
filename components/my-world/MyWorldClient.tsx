/**
 * MyWorldClient — chat-style interface for Meridian AI.
 * Editorial styling, NOT generic chat-bot.
 *
 * - Requires a logged-in user (parent route enforces this).
 * - On mount, fetches the user's saved query history from the DB.
 * - Each ask hits /api/meridian-ai/ask which authenticates via session cookie.
 * - "Clear history" button with confirmation.
 */
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  ArticleInput,
  HistoryItem,
  IntentResult,
} from "@/lib/meridian-ai";
import { Eyebrow } from "@/components/shared/Eyebrow";
import { Hairline } from "@/components/shared/Hairline";
import { DailyBriefPanel } from "./DailyBriefPanel";

const EXAMPLE_QUERIES = [
  "Show me the latest from the JSE",
  "What's happening in AI this week?",
  "Catch me up on global politics",
];

interface MyWorldClientProps {
  initialFilter: string;
  email: string;
}

interface PendingExchange {
  rawText: string;
  loading: boolean;
  error: string | null;
}

interface AskResponse {
  queryId: number;
  intent: IntentResult;
  articles: ArticleInput[];
  summary: string | null;
  message?: string;
}

type ArticlesByQuery = Record<
  number,
  Array<{ title: string; url: string; source: string }>
>;

export function MyWorldClient({ initialFilter, email }: MyWorldClientProps) {
  const router = useRouter();
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [articlesByQuery, setArticlesByQuery] = useState<ArticlesByQuery>({});
  const [pending, setPending] = useState<PendingExchange | null>(null);
  const [input, setInput] = useState("");
  const [filterText, setFilterText] = useState(initialFilter);
  const [filterSavedAt, setFilterSavedAt] = useState<number | null>(null);
  const [filterSaving, setFilterSaving] = useState(false);
  const [historyLoading, setHistoryLoading] = useState<boolean>(true);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const filterDirty = filterText.trim() !== initialFilter.trim();

  const saveFilter = useCallback(async () => {
    setFilterSaving(true);
    try {
      const res = await fetch("/api/auth/filter", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ filter: filterText }),
      });
      if (res.ok) {
        setFilterSavedAt(Date.now());
        router.refresh();
      }
    } catch (err) {
      console.error("[my-world] filter save failed:", err);
    } finally {
      setFilterSaving(false);
    }
  }, [filterText, router]);

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }, [router]);

  // Fetch history once on mount — the API authenticates via session cookie.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/meridian-ai/history");
        if (!res.ok) return;
        const data = (await res.json()) as { items: HistoryItem[] };
        if (!cancelled) setHistory(data.items);
      } catch (err) {
        console.error("[my-world] history load failed:", err);
      } finally {
        if (!cancelled) setHistoryLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [history, pending]);

  const submit = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      setInput("");
      setPending({ rawText: trimmed, loading: true, error: null });
      try {
        const res = await fetch("/api/meridian-ai/ask", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            text: trimmed,
            mode: "extractive",
            length: "medium",
          }),
        });
        if (!res.ok) {
          const detail = await res.text();
          throw new Error(`HTTP ${res.status}: ${detail}`);
        }
        const data = (await res.json()) as AskResponse;
        const newItem: HistoryItem = {
          queryId: data.queryId,
          rawText: trimmed,
          intent: data.intent,
          summary:
            data.summary ??
            (data.message === "no-matching-articles"
              ? "No articles matched that query in the current feed window. Try a broader topic or a different timeframe."
              : null),
          mode: "extractive",
          createdAt: new Date().toISOString(),
        };
        setHistory((h) => [...h, newItem]);
        setArticlesByQuery((m) => ({
          ...m,
          [data.queryId]: data.articles ?? [],
        }));
        setPending(null);
        inputRef.current?.focus();
      } catch (err) {
        console.error("[my-world] ask failed:", err);
        setPending((p) =>
          p ? { ...p, loading: false, error: "Something went wrong. Try again." } : p,
        );
      }
    },
    [],
  );

  const clearHistory = useCallback(async () => {
    const ok = window.confirm(
      "Clear your My World history? This removes saved queries from your account.",
    );
    if (!ok) return;
    try {
      await fetch("/api/meridian-ai/history/clear", { method: "POST" });
    } catch (err) {
      console.error("[my-world] clear failed:", err);
    }
    setHistory([]);
    setArticlesByQuery({});
  }, []);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submit(input);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit(input);
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-4.5rem)]">
      {/* Left Sidebar — desktop only. Mobile shows Filter inline in main column,
          and History/Account at the bottom of the main column. */}
      <aside className="hidden md:flex w-full md:w-[320px] shrink-0 border-r border-border flex-col overflow-y-auto bg-secondary/30">
        <div className="p-6">
          <Eyebrow className="block mb-3">Daily AI Summary</Eyebrow>
          <p className="font-sans text-[13px] text-muted-foreground mb-3 leading-relaxed">
            Give Meridian a prompt in this textbox to generate a summary of what you want to read each morning. Saved to your account.
          </p>
          <textarea
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            placeholder="e.g. JSE updates, Global AI policy, Tech earnings..."
            rows={3}
            className="w-full resize-none rounded-md border border-border px-3 py-2 font-sans text-[13px] text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent mb-2"
          />
          <button
            type="button"
            onClick={saveFilter}
            disabled={filterSaving || !filterDirty}
            className="w-full h-9 rounded-md bg-foreground text-background font-mono text-[10px] uppercase tracking-[0.1em] hover:bg-foreground/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {filterSaving ? "Saving…" : filterDirty ? "Save Filter" : "Saved"}
          </button>
          {filterSavedAt && !filterDirty && !filterSaving && (
            <p className="font-mono text-[9px] uppercase tracking-[0.08em] text-muted-foreground mt-2">
              Saved to your account.
            </p>
          )}
        </div>

        <Hairline />

        <div className="p-6 flex-1">
          <div className="flex items-center justify-between mb-4">
            <Eyebrow className="block">Chat History</Eyebrow>
            {history.length > 0 && (
              <button
                type="button"
                onClick={clearHistory}
                className="font-mono text-[9px] uppercase tracking-[0.08em] text-muted-foreground hover:text-destructive transition-colors"
              >
                Clear
              </button>
            )}
          </div>
          {historyLoading ? (
            <p className="font-sans text-[13px] italic text-muted-foreground">Loading...</p>
          ) : history.length === 0 ? (
            <p className="font-sans text-[13px] italic text-muted-foreground">No recent chats.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {history.map((h) => (
                <li key={h.queryId}>
                  <button
                    type="button"
                    className="text-left w-full truncate font-sans text-[13px] text-foreground hover:text-accent transition-colors"
                  >
                    {h.rawText}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <Hairline />

        <div className="p-6">
          <Eyebrow className="block mb-2">Account</Eyebrow>
          <p className="font-sans text-[12px] text-foreground truncate mb-3" title={email}>
            {email}
          </p>
          <button
            type="button"
            onClick={logout}
            className="font-mono text-[9px] uppercase tracking-[0.08em] text-muted-foreground hover:text-destructive transition-colors"
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col relative bg-background overflow-hidden">
        <div className="flex-1 overflow-y-auto px-6 md:px-10 py-12 md:py-16">
          <div className="max-w-3xl mx-auto">
            <div className="mb-8 text-center">
              <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground mb-2">
                MY WORLD
              </p>
              <h1 className="font-serif font-semibold text-3xl md:text-4xl text-foreground leading-tight">
                Tell Meridian what you want to know.
              </h1>
              <p className="font-serif italic text-[15px] md:text-base text-muted-foreground mt-2">
                A self-hosted intelligence assistant. Your queries stay on your device and ours.
              </p>
            </div>

            <Hairline className="mb-10" />

            {/* Mobile-only Filter — sits between heading and chat per spec.
                Desktop shows this in the left sidebar. */}
            <div className="md:hidden mb-10">
              <Eyebrow className="block mb-3">Daily AI Summary</Eyebrow>
              <p className="font-sans text-[13px] text-muted-foreground mb-3 leading-relaxed">
                Give Meridian a prompt in this textbox to generate a summary of what you want to read each morning. Saved to your account.
              </p>
              <textarea
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                placeholder="e.g. JSE updates, Global AI policy, Tech earnings..."
                rows={3}
                className="w-full resize-none rounded-md border border-border px-3 py-2 font-sans text-[13px] text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent mb-2"
              />
              <button
                type="button"
                onClick={saveFilter}
                disabled={filterSaving || !filterDirty}
                className="w-full h-9 rounded-md bg-foreground text-background font-mono text-[10px] uppercase tracking-[0.1em] hover:bg-foreground/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {filterSaving ? "Saving…" : filterDirty ? "Save Filter" : "Saved"}
              </button>
              {filterSavedAt && !filterDirty && !filterSaving && (
                <p className="font-mono text-[9px] uppercase tracking-[0.08em] text-muted-foreground mt-2">
                  Saved to your account.
                </p>
              )}
            </div>

            <DailyBriefPanel />

            {!historyLoading && history.length === 0 && !pending && (
              <div className="py-10 text-center">
                <p className="font-sans text-[15px] text-foreground leading-relaxed mb-8 max-w-xl mx-auto">
                  Ask in plain language. Meridian routes your query to the right outlets
                  and topics, fetches today&rsquo;s coverage, and writes you a tight
                  summary built only from those sources.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  {EXAMPLE_QUERIES.map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => submit(q)}
                      className="group text-left flex flex-col justify-between gap-3 px-4 py-3 border border-border rounded-md hover:border-accent transition-colors w-full sm:w-64"
                    >
                      <span className="font-sans text-[14px] text-foreground group-hover:text-accent transition-colors">
                        {q}
                      </span>
                      <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground group-hover:text-accent transition-colors">
                        ASK →
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {history.length > 0 && (
              <div className="py-6 flex flex-col gap-10">
                {history.map((h) => (
                  <Exchange
                    key={h.queryId}
                    item={h}
                    articles={articlesByQuery[h.queryId]}
                  />
                ))}
              </div>
            )}

            {pending && (
              <div className="py-6 border-t border-border mt-6 pt-6">
                <div className="mb-3">
                  <Eyebrow className="block mb-1">YOU</Eyebrow>
                  <p className="font-serif text-[17px] text-foreground leading-snug">
                    {pending.rawText}
                  </p>
                </div>
                {pending.loading && (
                  <div className="mt-4">
                    <Eyebrow className="block mb-1">MERIDIAN AI</Eyebrow>
                    <p className="font-sans text-[14px] text-muted-foreground italic">
                      Routing your query… reading the feeds… composing.
                    </p>
                  </div>
                )}
                {pending.error && (
                  <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-destructive mt-3">
                    {pending.error}
                  </p>
                )}
              </div>
            )}

            {/* Mobile-only History + Account — pushed to the bottom of the
                column so the priority items (heading, filter, chat) sit up top.
                Desktop shows these in the left sidebar. */}
            <div className="md:hidden mt-12 pt-8 border-t border-border space-y-8">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <Eyebrow className="block">Chat History</Eyebrow>
                  {history.length > 0 && (
                    <button
                      type="button"
                      onClick={clearHistory}
                      className="font-mono text-[9px] uppercase tracking-[0.08em] text-muted-foreground hover:text-destructive transition-colors"
                    >
                      Clear
                    </button>
                  )}
                </div>
                {historyLoading ? (
                  <p className="font-sans text-[13px] italic text-muted-foreground">Loading...</p>
                ) : history.length === 0 ? (
                  <p className="font-sans text-[13px] italic text-muted-foreground">No recent chats.</p>
                ) : (
                  <ul className="flex flex-col gap-3">
                    {history.map((h) => (
                      <li key={h.queryId} className="font-sans text-[13px] text-foreground truncate">
                        {h.rawText}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <Eyebrow className="block mb-2">Account</Eyebrow>
                <p className="font-sans text-[12px] text-foreground truncate mb-3" title={email}>
                  {email}
                </p>
                <button
                  type="button"
                  onClick={logout}
                  className="font-mono text-[9px] uppercase tracking-[0.08em] text-muted-foreground hover:text-destructive transition-colors"
                >
                  Sign out
                </button>
              </div>
            </div>

            <div ref={bottomRef} className="h-24" />
          </div>
        </div>

        {/* Sticky Input */}
        <div className="absolute bottom-0 left-0 right-0 bg-background border-t border-border px-6 py-4">
          <div className="max-w-3xl mx-auto">
            <form onSubmit={onSubmit} className="relative">
              <div className="flex flex-col gap-2">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={onKeyDown}
                  placeholder="Ask Meridian…"
                  rows={2}
                  className="w-full resize-none rounded-md border border-border px-4 py-3 font-sans text-[15px] text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                />
                <div className="flex items-center justify-between">
                  <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
                    Enter to send · Shift+Enter for newline
                  </p>
                  <button
                    type="submit"
                    disabled={!input.trim() || pending?.loading}
                    className="h-10 px-6 rounded-md bg-foreground text-background font-mono text-[11px] uppercase tracking-[0.1em] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-foreground/90 transition-colors"
                  >
                    Ask
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}

interface ExchangeProps {
  item: HistoryItem;
  articles?: Array<{ title: string; url: string; source: string }>;
}

function Exchange({ item, articles }: ExchangeProps) {
  return (
    <article className="grid gap-4">
      <div>
        <Eyebrow className="block mb-1">YOU</Eyebrow>
        <p className="font-serif text-[17px] text-foreground leading-snug">
          {item.rawText}
        </p>
      </div>

      <div>
        <Eyebrow className="block mb-2">MERIDIAN AI</Eyebrow>
        {item.summary ? (
          <p className="font-sans text-[15px] leading-[1.7] text-foreground">
            {item.summary}
          </p>
        ) : (
          <p className="font-sans text-[14px] italic text-muted-foreground">
            No summary available.
          </p>
        )}

        {item.intent &&
          (item.intent.outlets.length > 0 || item.intent.topics.length > 0) && (
            <div className="mt-4 flex flex-wrap gap-2">
              {item.intent.topics.slice(0, 3).map((t) => (
                <span
                  key={`t-${t.slug}`}
                  className="font-mono text-[10px] uppercase tracking-[0.08em] text-accent border border-accent/30 rounded-full px-2 py-0.5"
                >
                  {t.name}
                </span>
              ))}
              {item.intent.outlets.slice(0, 3).map((o) => (
                <span
                  key={`o-${o.slug}`}
                  className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground border border-border rounded-full px-2 py-0.5"
                >
                  {o.name}
                </span>
              ))}
            </div>
          )}

        {articles && articles.length > 0 && (
          <div className="mt-4 border-t border-border pt-3">
            <Eyebrow className="block mb-2">SOURCES</Eyebrow>
            <ul className="flex flex-col gap-1.5">
              {articles.map((a) => (
                <li key={a.url}>
                  <a
                    href={a.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-sans text-[13px] text-foreground hover:text-accent transition-colors"
                  >
                    <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground mr-2">
                      {a.source}
                    </span>
                    {a.title}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </article>
  );
}
