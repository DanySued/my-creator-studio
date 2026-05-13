/**
 * Catch-all proxy: /api/instagram/** → http://localhost:8000/instagram/**
 * Handles JSON bodies and multipart/form-data (file uploads) transparently.
 */

// API_URL is set server-side (Docker: http://api:8000). Falls back to localhost for local dev.
const API_BASE = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function handler(
  req: Request,
  { params }: { params: Promise<{ path: string[] }> }
): Promise<Response> {
  const { path } = await params;
  const upstream = `${API_BASE}/instagram/${path.join("/")}`;

  const url = new URL(req.url);
  const upstreamUrl = upstream + (url.search ?? "");

  // Forward headers except host
  const forwardHeaders = new Headers();
  req.headers.forEach((value, key) => {
    if (key.toLowerCase() !== "host") {
      forwardHeaders.set(key, value);
    }
  });

  const hasBody = req.method !== "GET" && req.method !== "HEAD";

  let body: BodyInit | null = null;
  if (hasBody) {
    const contentType = req.headers.get("content-type") ?? "";
    if (contentType.includes("multipart/form-data")) {
      // Stream the raw FormData so the boundary header is preserved
      body = await req.blob();
    } else {
      body = await req.text();
    }
  }

  try {
    const upstream_res = await fetch(upstreamUrl, {
      method: req.method,
      headers: forwardHeaders,
      body,
    });

    const resHeaders = new Headers();
    upstream_res.headers.forEach((value, key) => {
      // Skip transfer-encoding — Next.js handles it
      if (key.toLowerCase() !== "transfer-encoding") {
        resHeaders.set(key, value);
      }
    });

    return new Response(upstream_res.body, {
      status: upstream_res.status,
      headers: resHeaders,
    });
  } catch (err) {
    console.error("[instagram proxy] fetch error:", err);
    return Response.json({ detail: "API unavailable" }, { status: 502 });
  }
}

export const GET = handler;
export const POST = handler;
export const DELETE = handler;
export const PUT = handler;
export const PATCH = handler;
