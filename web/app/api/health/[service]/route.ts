import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.API_URL ?? "http://localhost:8000";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ service: string }> }
) {
  const { service } = await params;
  const allowed = ["gemini", "pexels"];
  if (!allowed.includes(service)) {
    return NextResponse.json({ error: "Unknown service" }, { status: 404 });
  }

  const body = await request.json();

  try {
    const res = await fetch(`${API_URL}/health/${service}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json(
      { error: "Backend is not reachable. Run: docker compose up" },
      { status: 503 }
    );
  }
}
