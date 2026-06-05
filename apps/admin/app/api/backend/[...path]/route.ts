const API_BASE = process.env.API_BASE_URL ?? "http://localhost:8000"

const ALLOWED_ORIGINS = new Set([
  "http://localhost:3000",
  "http://localhost:5173",
  "tauri://localhost",      // macOS / Linux Tauri production builds
  "http://tauri.localhost", // Windows Tauri production builds
])
const NGROK_RE = /^https:\/\/[a-z0-9-]+\.ngrok(-free)?\.(app|dev|io)$/

function corsHeaders(origin: string): Record<string, string> {
  if (!origin) {
    // Tauri production builds may omit Origin; approve unconditionally without credentials.
    return {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    }
  }
  const ok = ALLOWED_ORIGINS.has(origin) || NGROK_RE.test(origin)
  if (!ok) return {}
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Credentials": "true",
  }
}

export async function OPTIONS(request: Request) {
  const origin = request.headers.get("origin") ?? ""
  return new Response(null, { status: 200, headers: corsHeaders(origin) })
}

async function proxy(
  request: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  const origin = request.headers.get("origin") ?? ""
  const { path } = await context.params
  const { search } = new URL(request.url)
  const upstream = `${API_BASE}/${path.join("/")}${search}`

  const fwdHeaders = new Headers(request.headers)
  fwdHeaders.delete("host")

  const upstreamRes = await fetch(upstream, {
    method: request.method,
    headers: fwdHeaders,
    body: ["GET", "HEAD"].includes(request.method) ? null : request.body,
    // @ts-expect-error — duplex is required for streaming request bodies
    duplex: "half",
  })

  const resHeaders = new Headers(upstreamRes.headers)
  for (const [k, v] of Object.entries(corsHeaders(origin))) {
    resHeaders.set(k, v)
  }

  return new Response(upstreamRes.body, {
    status: upstreamRes.status,
    statusText: upstreamRes.statusText,
    headers: resHeaders,
  })
}

export const GET = proxy
export const POST = proxy
export const PUT = proxy
export const PATCH = proxy
export const DELETE = proxy
