"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface MeResponse {
  user: { id: string; email: string } | null;
}

export function NavbarAccount() {
  const [email, setEmail] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/auth/me");
        if (!res.ok) return;
        const data = (await res.json()) as MeResponse;
        if (!cancelled) setEmail(data.user?.email ?? null);
      } catch {
        // network error — treat as logged out
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!loaded) return <span className="w-16" aria-hidden="true" />;

  if (email) {
    return (
      <Link
        href="/my-world"
        className="font-mono text-[11px] uppercase tracking-[0.08em] text-foreground hover:text-accent transition-colors max-w-[160px] truncate"
        title={email}
      >
        {email}
      </Link>
    );
  }

  return (
    <Link
      href="/login"
      className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground hover:text-foreground transition-colors"
    >
      Sign in
    </Link>
  );
}
