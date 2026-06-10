#!/usr/bin/env node
/**
 * Create an admin user in the local Better Auth PostgreSQL database.
 * Usage: node scripts/create-admin-user.mjs --email admin@example.com --password Secret123!
 */
import { readFileSync } from "fs"
import { join, dirname } from "path"
import { fileURLToPath } from "url"

const __dirname = dirname(fileURLToPath(import.meta.url))

// Load .env.local
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
  // rely on existing env vars
}

// Parse CLI args
const args = process.argv.slice(2)
function getArg(name) {
  const idx = args.indexOf(`--${name}`)
  return idx !== -1 ? args[idx + 1] : null
}

const email = getArg("email")
const password = getArg("password")

if (!email || !password) {
  console.error("Usage: node scripts/create-admin-user.mjs --email <email> --password <password>")
  process.exit(1)
}

if (password.length < 8) {
  console.error("Error: password must be at least 8 characters")
  process.exit(1)
}

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  console.error("Error: DATABASE_URL is not set in .env.local")
  process.exit(1)
}

const { Pool } = await import("pg")
const { betterAuth } = await import("better-auth")
const { admin } = await import("better-auth/plugins")

const pool = new Pool({ connectionString: databaseUrl })

const auth = betterAuth({
  database: pool,
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

// Check if user already exists
const existing = await pool.query(`SELECT id, email FROM "user" WHERE email = $1`, [email])
if (existing.rows.length > 0) {
  console.error(`Error: user with email "${email}" already exists (id: ${existing.rows[0].id})`)
  await pool.end()
  process.exit(1)
}

console.log(`Creating admin user: ${email}`)

// Use Better Auth's sign-up handler directly (no HTTP server needed)
const response = await auth.api.signUpEmail({
  body: { email, password, name: email.split("@")[0] },
})

if (!response) {
  console.error("Error: sign-up returned no response")
  await pool.end()
  process.exit(1)
}

// Promote to admin role
await pool.query(`UPDATE "user" SET role = 'admin' WHERE email = $1`, [email])

// Fetch the created user to confirm
const row = await pool.query(`SELECT id, email, role, "createdAt" FROM "user" WHERE email = $1`, [email])
const user = row.rows[0]

await pool.end()

console.log("✓ Admin user created successfully")
console.log(`  id:    ${user.id}`)
console.log(`  email: ${user.email}`)
console.log(`  role:  ${user.role}`)
console.log(`\nLog in at: ${process.env.BETTER_AUTH_URL ?? "http://localhost:3000"}/login`)
