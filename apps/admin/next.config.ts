import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep server-only packages out of the client bundle.
  // better-auth pulls in pg, kysely and Bun/D1 dialects that cannot run in the browser.
  serverExternalPackages: [
    "pg",
    "pg-native",
    "better-auth",
    "@better-auth/kysely-adapter",
    "kysely",
  ],

  // Allow ngrok tunnels to reach the HMR websocket during dev.
  // Admin ngrok URL is dynamic so we allow all ngrok-free subdomains.
  allowedDevOrigins: ["*.ngrok-free.app", "*.ngrok-free.dev", "*.ngrok.io"],

  // Proxy /api/backend/* to FastAPI server-side so the browser only ever
  // makes same-origin requests. Works from any machine (local or via ngrok)
  // because the proxy runs on the Next.js server alongside FastAPI.
  async rewrites() {
    const apiBase = process.env.API_BASE_URL ?? "http://localhost:8000";
    return [
      {
        source: "/api/backend/:path*",
        destination: `${apiBase}/:path*`,
      },
    ];
  },
};

export default nextConfig;
