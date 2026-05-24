import { NextResponse } from 'next/server';

const API_URL = process.env.API_URL || 'http://localhost:8000';

export async function GET(_req: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const res = await fetch(`${API_URL}/svg-templates/${name}`);
  if (!res.ok) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const svg = await res.text();
  return new Response(svg, { headers: { 'Content-Type': 'image/svg+xml' } });
}

export async function PUT(req: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const body = await req.json();
  const res = await fetch(`${API_URL}/svg-templates/${name}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return NextResponse.json(data);
}
