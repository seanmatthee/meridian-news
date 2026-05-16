import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { MyWorldClient } from "@/components/my-world/MyWorldClient";
import { getCurrentUser } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "My World — MERIDIAN",
  description:
    "Tell Meridian what you want to know. A self-hosted intelligence assistant that routes your query to the right outlets and writes you a tight summary.",
};

export const dynamic = "force-dynamic";

export default async function MyWorldPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?next=/my-world");
  }
  return <MyWorldClient initialFilter={user.filter ?? ""} email={user.email} />;
}
