import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Account — MERIDIAN",
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-[calc(100vh-4.5rem)] bg-background flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">{children}</div>
    </main>
  );
}
