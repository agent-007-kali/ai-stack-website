import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The paid PDF lives in /private (never /public) so it has no public URL.
  // Trace it into the serverless bundle for the paid download route only.
  outputFileTracingIncludes: {
    "/api/guide/download": ["./private/**/*"],
  },
  async rewrites() {
    return [
      {
        source: "/",
        destination: "/bowbot/index.html",
      },
    ];
  },
};

export default nextConfig;
