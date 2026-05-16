"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Sign-in failed.");
        setBusy(false);
        return;
      }
      router.push("/my-world");
      router.refresh();
    } catch (err) {
      console.error("[login] failed:", err);
      setError("Couldn't reach the server. Try again.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5">
        <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
          Email
        </span>
        <input
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="h-11 rounded-md border border-border px-3 font-sans text-[15px] text-foreground focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
        />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
          Password
        </span>
        <input
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="h-11 rounded-md border border-border px-3 font-sans text-[15px] text-foreground focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
        />
      </label>
      {error && (
        <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-destructive">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={busy}
        className="h-11 rounded-md bg-foreground text-background font-mono text-[11px] uppercase tracking-[0.1em] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-foreground/90 transition-colors"
      >
        {busy ? "Signing in…" : "Sign in"}
      </button>
      <p className="font-sans text-[13px] text-muted-foreground text-center mt-2">
        New to Meridian?{" "}
        <Link href="/signup" className="text-foreground hover:text-accent underline-offset-2 hover:underline">
          Create an account
        </Link>
      </p>
    </form>
  );
}
