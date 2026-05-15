/**
 * MyWorldClient — chat-style interface for Meridian AI.
 * Editorial styling, NOT generic chat-bot.
 *
 * - Session ID persisted in localStorage; loaded lazily on first render.
 * - On mount, fetches history for this session from the DB.
 * - Each ask hits /api/meridian-ai/ask which interprets, picks articles, summarizes, persists.
 * - "Clear history" button with confirmation.
 */
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  ArticleInput,
  HistoryItem,
  IntentResult,
} from "@/lib/meridian-ai";
import { Eyebrow } from "@/components/shared/Eyebrow";
import { Hairline } from "@/components/shared/Hairline";

const STORAGE_KEY = "meridian:my-world:session";
const EXAMPLE_QUERIES = [
  "Show me the latest from the JSE",
  "What's happening in AI this week?",
  "Catch me up on global politics",
];

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

function makeSessionId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function readOrCreateSessionId(): string {
  if (typeof window === "undefined") return "";
  let id = window.localStorage.getItem(STORAGE_KEY);
  if (!id) {
    id = makeSessionId();
    window.localStorage.setItem(STORAGE_KEY, id);
  }
  return id;
}

export function MyWorldClient() {
  // Lazy initializer — runs once at first render, no effect needed.
  const [sessionId, setSessionId] = useState<string>(() =>
    readOrCreateSessionId(),
  );
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [articlesByQuery, setArticlesByQuery] = useState<ArticlesByQuery>({});
  const [pending, setPending] = useState<PendingExchange | null>(null);
  const [input, setInput] = useState("");
  // If we couldn't get a session id (SSR fallback), there's nothing to load.
  const [historyLoading, setHistoryLoading] = useState<boolean>(() =>
    Boolean(sessionId),
  );
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Fetch history for the current session. The setState calls live inside
  // an async callback, so they don't trigger the cascading-render rule.
  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/meridian-ai/history?sessionId=${encodeURIComponent(sessionId)}`,
        );
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
  }, [sessionId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [history, pending]);

  const submit = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || !sessionId) return;
      setInput("");
      setPending({ rawText: trimmed, loading: true, error: null });
      try {
        const res = await fetch("/api/meridian-ai/ask", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            sessionId,
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
    [sessionId],
  );

  const clearHistory = useCallback(async () => {
    if (!sessionId) return;
    const ok = window.confirm(
      "Clear your My World history? This removes saved queries on this device.",
    );
    if (!ok) return;
    try {
      await fetch("/api/meridian-ai/history/clear", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
    } catch (err) {
      console.error("[my-world] clear failed:", err);
    }
    setHistory([]);
    setArticlesByQuery({});
    const fresh = makeSessionId();
    window.localStorage.setItem(STORAGE_KEY, fresh);
    setSessionId(fresh);
  }, [sessionId]);

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
    <div className="max-w-3xl mx-auto px-6 md:px-10 py-12 md:py-16">
      <div className="mb-8">
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

      <Hairline />

      {!historyLoading && history.length === 0 && !pending && (
        <div className="py-10">
          <p className="font-sans text-[15px] text-foreground leading-relaxed mb-5">
            Ask in plain language. Meridian routes your query to the right outlets
            and topics, fetches today&rsquo;s coverage, and writes you a tight
            summary built only from those sources.
          </p>
          <Eyebrow className="block mb-3">Try one</Eyebrow>
          <div className="flex flex-col gap-2">
            {EXAMPLE_QUERIES.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => submit(q)}
                className="group text-left flex items-center justify-between gap-3 px-4 py-3 border border-border rounded-md hover:border-accent transition-colors"
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
        <div className="py-6">
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

      <div ref={bottomRef} />

      <form
        onSubmit={onSubmit}
        className="sticky bottom-0 bg-white border-t border-border pt-4 mt-8"
      >
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Ask Meridian…"
            rows={2}
            className="flex-1 resize-none rounded-md border border-border px-4 py-3 font-sans text-[15px] text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
          />
          <button
            type="submit"
            disabled={!input.trim() || !sessionId || pending?.loading}
            className="h-12 px-4 rounded-md bg-accent text-accent-foreground font-mono text-[11px] uppercase tracking-[0.1em] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-accent/90 transition-colors"
          >
            Ask
          </button>
        </div>
        <div className="flex items-center justify-between mt-2">
          <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
            Enter to send · Shift+Enter for newline
          </p>
          {history.length > 0 && (
            <button
              type="button"
              onClick={clearHistory}
              className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground hover:text-destructive transition-colors"
            >
              Clear history
            </button>
          )}
        </div>
      </form>
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
