import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async rewrites() {
    // `next dev` does not run the Python function in `api/`. Set ARENA_ENGINE_URL
    // to a local `scripts/serve-arena-local.py` to play against real models while
    // developing; in production Vercel routes /api/engine to api/engine.py.
    const engineUrl = process.env.ARENA_ENGINE_URL;
    if (!engineUrl) return [];
    return [{ source: "/api/engine", destination: engineUrl }];
  }
};

export default nextConfig;
