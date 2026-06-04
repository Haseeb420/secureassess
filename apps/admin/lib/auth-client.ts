"use client"

import { createAuthClient } from "better-auth/react"
import { adminClient } from "better-auth/client/plugins"

// Use the current page origin when running in the browser so requests route
// through whatever host the user accessed (localhost or ngrok tunnel).
const baseURL =
  typeof window !== "undefined"
    ? window.location.origin
    : (process.env.NEXT_PUBLIC_BETTER_AUTH_URL ?? "http://localhost:3000")

export const authClient = createAuthClient({
  baseURL,
  plugins: [adminClient()],
})

export const {
  signIn,
  signOut,
  useSession,
  getSession,
} = authClient
