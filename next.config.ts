import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.join(__dirname),
  },
  // transformers.js is a heavy native-bindings package — don't bundle it
  // into route-handler chunks. Keep it as a runtime require on the server.
  serverExternalPackages: ["@xenova/transformers", "onnxruntime-node"],
};

export default nextConfig;
