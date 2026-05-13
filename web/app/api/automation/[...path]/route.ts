/**
 * Catch-all proxy: /api/automation/** → http://localhost:8000/automation/**
 * Mirrors the same pattern as the instagram proxy.
 */

const API_BASE = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function handler(
  req: Request,
  { params }: { params: Promise<{ path: string[] }> }
): Promise<Response> {
  const { path } = await params;
  const upstream = `${API_BASE}/automation/${path.join("/")}`;

  const url = new URL(req.url);
  const upstreamUrl = upstream + (url.search ?? "");

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
      if (key.toLowerCase() !== "transfer-encoding") {
        resHeaders.set(key, value);
      }
    });

    return new Response(upstream_res.body, {
      status: upstream_res.status,
      headers: resHeaders,
    });
  } catch (err) {
    console.error("[automation proxy] fetch error:", err);
    return Response.json({ detail: "API unavailable" }, { status: 502 });
  }
}

export const GET = handler;
export const POST = handler;
export const DELETE = handler;
export const PUT = handler;
export const PATCH = handler;
