import "server-only"
import { betterAuth } from "better-auth"
import { Pool } from "pg"
import { admin } from "better-auth/plugins"

export const auth = betterAuth({
  database: new Pool({ connectionString: process.env.DATABASE_URL }),

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },

  session: {
    expiresIn: 60 * 60 * 24 * 7,   // 7 days
    updateAge: 60 * 60 * 24,        // refresh if older than 1 day
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5,               // cache session cookie for 5 min
    },
  },

  plugins: [
    admin({
      defaultRole: "candidate",
      adminRole: ["admin", "proctor"],
    }),
  ],

  trustedOrigins: [
    "http://localhost:3000",
    "http://localhost:5173",
    "tauri://localhost",
    "*.ngrok-free.app",
    "*.ngrok-free.dev",
    "*.ngrok.io",
    process.env.NEXT_PUBLIC_APP_URL ?? "",
  ].filter(Boolean),

  user: {
    additionalFields: {
      role: {
        type: "string",
        defaultValue: "candidate",
        input: false,
      },
      organizationId: {
        type: "string",
        required: false,
        input: false,
      },
    },
  },
})

export type Session = typeof auth.$Infer.Session
export type User    = typeof auth.$Infer.Session.user
