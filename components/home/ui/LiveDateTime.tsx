"use client";

import { useState, useEffect } from "react";
import { formatHeroDate, formatSAST } from "@/lib/utils";

export function LiveDateTime() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  if (!now) return null;

  return (
    <>
      <span>{formatHeroDate(now)}</span>
      <span className="hidden sm:inline text-border">|</span>
      <span className="hidden sm:inline">{formatSAST(now)}</span>
    </>
  );
}
