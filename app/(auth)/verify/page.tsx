import { Suspense } from "react";
import { VerifyForm } from "@/components/auth/VerifyForm";

export default function VerifyPage() {
  return (
    <div>
      <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground mb-3">
        VERIFY EMAIL
      </p>
      <h1 className="font-serif font-semibold text-3xl text-foreground mb-2">
        Enter your code.
      </h1>
      <p className="font-serif italic text-[15px] text-muted-foreground mb-8">
        Check your inbox for the 6-digit code we just sent.
      </p>
      <Suspense fallback={<p className="font-sans text-sm text-muted-foreground">Loading…</p>}>
        <VerifyForm />
      </Suspense>
    </div>
  );
}
