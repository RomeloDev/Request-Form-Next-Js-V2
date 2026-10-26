import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    const apiServer = (process.env.API_SERVER_URL ?? "http://127.0.0.1:8000").replace(/\/$/, "");

    return [
      { source: "/api/v1/:path*", destination: `${apiServer}/api/v1/:path*` },
      { source: "/sanctum/csrf-cookie", destination: `${apiServer}/sanctum/csrf-cookie` },
    ];
  },
  /* config options here */
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
