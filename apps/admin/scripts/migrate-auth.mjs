#!/usr/bin/env node
/**
 * Runs Better Auth schema migrations against the local PostgreSQL database.
 * Usage: node scripts/migrate-auth.mjs
 */
import { getMigrations } from "better-auth/db/migration"
import { Pool } from "pg"
import { readFileSync } from "fs"
import { join, dirname } from "path"
import { fileURLToPath } from "url"

const __dirname = dirname(fileURLToPath(import.meta.url))

// Load .env.local manually
const envPath = join(__dirname, "../.env.local")
try {
  const lines = readFileSync(envPath, "utf8").split("\n")
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue
    const [key, ...rest] = trimmed.split("=")
    process.env[key.trim()] = rest.join("=").trim()
  }
} catch {
  // .env.local not found — rely on existing env vars
}

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  console.error("ERROR: DATABASE_URL is not set")
  process.exit(1)
}

console.log(`Connecting to: ${databaseUrl.replace(/:([^:@]+)@/, ":***@")}`)

const { betterAuth } = await import("better-auth")
const { admin } = await import("better-auth/plugins")

const auth = betterAuth({
  database: new Pool({ connectionString: databaseUrl }),

  emailAndPassword: { enabled: true, requireEmailVerification: false },

  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
    cookieCache: { enabled: true, maxAge: 60 * 5 },
  },

  plugins: [admin({ defaultRole: "candidate", adminRole: ["admin", "proctor"] })],

  user: {
    additionalFields: {
      role: { type: "string", defaultValue: "candidate", input: false },
      organizationId: { type: "string", required: false, input: false },
    },
  },
})

const { toBeCreated, toBeAdded, runMigrations } = await getMigrations(auth.options)

if (toBeCreated.length === 0 && toBeAdded.length === 0) {
  console.log("✓ Schema is already up to date — nothing to migrate.")
  process.exit(0)
}

if (toBeCreated.length > 0) {
  console.log("\nTables to create:")
  for (const t of toBeCreated) console.log(`  + ${t.table}`)
}
if (toBeAdded.length > 0) {
  console.log("\nColumns to add:")
  for (const t of toBeAdded) {
    const cols = Object.keys(t.fields).join(", ")
    console.log(`  ~ ${t.table}: ${cols}`)
  }
}

console.log("\nRunning migrations…")
await runMigrations()
console.log("✓ Done.")
process.exit(0)
