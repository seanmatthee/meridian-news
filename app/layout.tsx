import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Fraunces } from "next/font/google";
import "./globals.css";

import { Ticker } from "@/components/home/ui/Ticker";
import { Navbar } from "@/components/home/ui/Navbar";
import { Footer } from "@/components/home/sections/Footer";
import { getMarketData } from "@/lib/markets";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
  axes: ["opsz"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
  weight: ["500"],
});

export const metadata: Metadata = {
  title: "MERIDIAN — Daily Intelligence Brief",
  description:
    "Five lanes of signal. Zero noise. Self-hosted intelligence briefing covering AI, world news, business, finance, and South Africa.",
  openGraph: {
    title: "MERIDIAN — Daily Intelligence Brief",
    description:
      "Five lanes of signal. Zero noise. Self-hosted intelligence briefing.",
    type: "website",
    locale: "en_ZA",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const marketData = await getMarketData();

  return (
    <html
      lang="en"
      className={`${inter.variable} ${fraunces.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-white text-foreground">
        <Ticker items={marketData} />
        <Navbar />
        <main id="main-content" role="main" className="flex-1">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
