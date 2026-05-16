import type { Metadata } from "next";
import { Hero } from "@/components/home/Hero";

export const metadata: Metadata = {
  title: "MERIDIAN — Daily Intelligence Brief",
  description:
    "Five lanes of signal. Zero noise. Self-hosted intelligence briefing covering AI, world news, business, finance, and South Africa.",
};

export default function Home() {
  return <Hero />;
}
