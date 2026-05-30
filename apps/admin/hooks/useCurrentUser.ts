"use client"

import { useSession } from "@/lib/auth-client"

export function useCurrentUser() {
  const { data: session, isPending, error } = useSession()

  const user = session?.user as (typeof session.user & { role?: string; organizationId?: string }) | null | undefined

  return {
    user:            user ?? null,
    name:            user?.name ?? user?.email?.split("@")[0] ?? "User",
    email:           user?.email ?? "",
    role:            user?.role ?? "candidate",
    isAdmin:         user?.role === "admin",
    isProctor:       user?.role === "proctor",
    isLoading:       isPending,
    isAuthenticated: !!session,
    error,
  }
}
