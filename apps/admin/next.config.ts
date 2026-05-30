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
};

export default nextConfig;
