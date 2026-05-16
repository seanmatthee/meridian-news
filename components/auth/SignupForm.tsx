"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";

export function SignupForm() {
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
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        setBusy(false);
        return;
      }
      router.push(`/verify?email=${encodeURIComponent(email)}`);
    } catch (err) {
      console.error("[signup] failed:", err);
      setError("Couldn't reach the server. Try again.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <Field
        label="Email"
        type="email"
        autoComplete="email"
        required
        value={email}
        onChange={(v) => setEmail(v)}
      />
      <Field
        label="Password"
        type="password"
        autoComplete="new-password"
        minLength={8}
        required
        value={password}
        onChange={(v) => setPassword(v)}
        hint="At least 8 characters."
      />
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
        {busy ? "Sending code…" : "Send verification code"}
      </button>
      <p className="font-sans text-[13px] text-muted-foreground text-center mt-2">
        Already have an account?{" "}
        <Link href="/login" className="text-foreground hover:text-accent underline-offset-2 hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}

interface FieldProps {
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  minLength?: number;
  autoComplete?: string;
  hint?: string;
}

function Field({ label, type, value, onChange, required, minLength, autoComplete, hint }: FieldProps) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        minLength={minLength}
        autoComplete={autoComplete}
        className="h-11 rounded-md border border-border px-3 font-sans text-[15px] text-foreground focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
      />
      {hint && (
        <span className="font-sans text-[12px] text-muted-foreground">{hint}</span>
      )}
    </label>
  );
}
