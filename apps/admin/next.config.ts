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

  async rewrites() {
    // Desktop builds compiled with VITE_API_BASE_URL set to the bare ngrok URL
    // (no /api/backend suffix) send requests as /tokens/validate instead of
    // /api/backend/tokens/validate. Rewrite those bare FastAPI paths through the
    // existing proxy handler so both URL forms work without a rebuild.
    return [
      {
        source:
          "/:segment(auth|assessments|attempts|mock-attempts|questions|sessions|reports|sync|tokens)/:path*",
        destination: "/api/backend/:segment/:path*",
      },
      { source: "/health", destination: "/api/backend/health" },
    ];
  },
};

export default nextConfig;
