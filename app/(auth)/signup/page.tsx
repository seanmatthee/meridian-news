import { SignupForm } from "@/components/auth/SignupForm";

export default function SignupPage() {
  return (
    <div>
      <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground mb-3">
        CREATE ACCOUNT
      </p>
      <h1 className="font-serif font-semibold text-3xl text-foreground mb-2">
        Join Meridian.
      </h1>
      <p className="font-serif italic text-[15px] text-muted-foreground mb-8">
        We&rsquo;ll send a 6-digit code to verify your email.
      </p>
      <SignupForm />
    </div>
  );
}
