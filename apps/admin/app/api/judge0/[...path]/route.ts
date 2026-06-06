const JUDGE0_ORIGIN =
  (process.env.JUDGE0_INTERNAL_URL ?? "http://localhost:2358").replace(/\/$/, "")

async function proxy(
  request: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params
  const { search } = new URL(request.url)
  const upstream = `${JUDGE0_ORIGIN}/${path.join("/")}${search}`

  // Read the body into a buffer first — streaming via request.body + duplex:"half"
  // is unreliable in Next.js App Router and causes Judge0 to receive an empty body
  // (which it rejects with 422 "source_code is required").
  const body = ["GET", "HEAD"].includes(request.method)
    ? undefined
    : await request.arrayBuffer()

  const fwdHeaders = new Headers()
  const contentType = request.headers.get("content-type")
  if (contentType) fwdHeaders.set("content-type", contentType)
  fwdHeaders.set("accept", "application/json")

  const upstreamRes = await fetch(upstream, {
    method: request.method,
    headers: fwdHeaders,
    body,
  })

  // Read the upstream response body and forward it wholesale.
  const responseBody = await upstreamRes.arrayBuffer()

  return new Response(responseBody, {
    status: upstreamRes.status,
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
