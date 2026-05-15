import type { Metadata } from "next";
import { MyWorldClient } from "@/components/my-world/MyWorldClient";

export const metadata: Metadata = {
  title: "My World — MERIDIAN",
  description:
    "Tell Meridian what you want to know. A self-hosted intelligence assistant that routes your query to the right outlets and writes you a tight summary.",
};

export default function MyWorldPage() {
  return <MyWorldClient />;
}
