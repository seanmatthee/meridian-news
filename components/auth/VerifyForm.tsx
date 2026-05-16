"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export function VerifyForm() {
  const router = useRouter();
  const params = useSearchParams();
  const email = params.get("email") ?? "";
  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Verification failed.");
        setBusy(false);
        return;
      }
      router.push("/my-world");
      router.refresh();
    } catch (err) {
      console.error("[verify] failed:", err);
      setError("Couldn't reach the server. Try again.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <p className="font-sans text-[14px] text-foreground">
        We sent a code to{" "}
        <span className="font-mono text-[13px]">{email || "your email"}</span>
      </p>
      <label className="flex flex-col gap-1.5">
        <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
          Verification code
        </span>
        <input
          type="text"
          inputMode="numeric"
          pattern="\d{6}"
          maxLength={6}
          value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
          required
          autoComplete="one-time-code"
          autoFocus
          className="h-14 rounded-md border border-border px-4 font-mono text-[24px] tracking-[0.3em] text-center text-foreground focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
          placeholder="000000"
        />
      </label>
      {error && (
        <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-destructive">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={busy || otp.length !== 6}
        className="h-11 rounded-md bg-foreground text-background font-mono text-[11px] uppercase tracking-[0.1em] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-foreground/90 transition-colors"
      >
        {busy ? "Verifying…" : "Verify and continue"}
      </button>
    </form>
  );
}
