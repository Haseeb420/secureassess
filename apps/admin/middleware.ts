import { NextRequest, NextResponse } from "next/server"

// Middleware runs on the Edge runtime — no Node.js APIs, no pg, no database access.
// Cookie-presence check only. Full session validation + role-based routing
// happens in the dashboard layout (server component, Node.js runtime).

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (pathname.startsWith("/api/auth")) return NextResponse.next()

  if (pathname.startsWith("/dashboard")) {
    const sessionCookie =
      request.cookies.get("better-auth.session_token") ??
      request.cookies.get("__Secure-better-auth.session_token")

    if (!sessionCookie) {
      return NextResponse.redirect(new URL("/login", request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/dashboard/:path*", "/api/auth/:path*"],
}
