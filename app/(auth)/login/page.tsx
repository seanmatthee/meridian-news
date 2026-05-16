import { LoginForm } from "@/components/auth/LoginForm";

export default function LoginPage() {
  return (
    <div>
      <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground mb-3">
        SIGN IN
      </p>
      <h1 className="font-serif font-semibold text-3xl text-foreground mb-2">
        Welcome back.
      </h1>
      <p className="font-serif italic text-[15px] text-muted-foreground mb-8">
        Sign in to access your saved daily filter and chat history.
      </p>
      <LoginForm />
    </div>
  );
}
