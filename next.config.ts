import type { NextConfig } from "next";
import path from "path";

// Browser-facing CSP. The site has no third-party scripts, fonts are
// self-hosted via next/font (baked at build time), and every browser fetch
// goes to /api/* on the same origin — so the only relaxations needed are
// 'unsafe-inline' / 'unsafe-eval' that the React/Next runtime requires.
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self'",
  "img-src 'self' data: blob: https:",
  "connect-src 'self'",
  "media-src 'none'",
  "frame-src 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const SECURITY_HEADERS = [
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  { key: "Content-Security-Policy", value: CSP },
];

const nextConfig: NextConfig = {
  turbopack: {
    root: path.join(__dirname),
  },
  // transformers.js is a heavy native-bindings package — don't bundle it
  // into route-handler chunks. Keep it as a runtime require on the server.
  serverExternalPackages: ["@xenova/transformers", "onnxruntime-node"],
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: SECURITY_HEADERS,
      },
    ];
  },
};

export default nextConfig;
