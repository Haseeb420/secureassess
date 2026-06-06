// Proxy all Judge0 API calls through the Next.js / ngrok tunnel so the
// desktop app can reach Judge0 from any machine (Windows, macOS, Linux)
// without requiring a local Judge0 installation.
//
// Desktop VITE_JUDGE0_URL = https://<ngrok-domain>/api/judge0
// Requests arrive here as: GET|POST /api/judge0/<path...>?<qs>
// and are forwarded to the Judge0 server at JUDGE0_INTERNAL_URL.
const JUDGE0_ORIGIN =
  (process.env.JUDGE0_INTERNAL_URL ?? "http://localhost:2358").replace(/\/$/, "")

async function proxy(
  request: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params
  const { search } = new URL(request.url)
  const upstream = `${JUDGE0_ORIGIN}/${path.join("/")}${search}`

  const fwdHeaders = new Headers()
  const contentType = request.headers.get("content-type")
  if (contentType) fwdHeaders.set("content-type", contentType)
  fwdHeaders.set("accept", "application/json")

  const upstreamRes = await fetch(upstream, {
    method: request.method,
    headers: fwdHeaders,
    body: ["GET", "HEAD"].includes(request.method) ? null : request.body,
    // @ts-expect-error — duplex required for streaming request bodies
    duplex: "half",
  })

  return new Response(upstreamRes.body, {
    status: upstreamRes.status,
    statusText: upstreamRes.statusText,
    headers: {
      "content-type":
        upstreamRes.headers.get("content-type") ?? "application/json",
    },
  })
}

export const GET = proxy
export const POST = proxy
export const PUT = proxy
export const DELETE = proxy
