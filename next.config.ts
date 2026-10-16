import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
