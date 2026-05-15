"use client";

import { useEffect, useState } from "react";
import { formatBriefingDate } from "@/lib/utils";

/**
 * LiveDate component that displays the current date and updates at midnight.
 * Uses suppressHydrationWarning to handle potential mismatch between server and client time.
 */
export function LiveDate() {
  // Initialize with null to detect client-side mount
  const [dateStr, setDateStr] = useState<string | null>(null);

  useEffect(() => {
    // Set initial date on mount
    const now = new Date();
    setDateStr(formatBriefingDate(now));

    // Function to calculate ms until next midnight
    const getMsUntilMidnight = () => {
      const d = new Date();
      const nextMidnight = new Date(
        d.getFullYear(),
        d.getMonth(),
        d.getDate() + 1,
        0,
        0,
        0,
        0
      );
      return nextMidnight.getTime() - d.getTime();
    };

    let timeoutId: NodeJS.Timeout;

    const scheduleUpdate = () => {
      const ms = getMsUntilMidnight();
      timeoutId = setTimeout(() => {
        setDateStr(formatBriefingDate(new Date()));
        scheduleUpdate(); // Re-schedule for the next midnight
      }, ms);
    };

    scheduleUpdate();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  return (
    <span suppressHydrationWarning>
      {dateStr || formatBriefingDate(new Date())}
    </span>
  );
}
