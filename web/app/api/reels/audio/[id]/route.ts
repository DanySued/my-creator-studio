import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const apiUrl = process.env.API_URL || 'http://localhost:8000';

    const response = await fetch(`${apiUrl}/reels/audio/${id}`, { method: 'GET' });

    if (!response.ok) {
      return NextResponse.json({ error: 'Audio not found' }, { status: response.status });
    }

    const contentType = response.headers.get('content-type') || 'audio/mpeg';
    return new NextResponse(response.body, {
      status: 200,
      headers: { 'Content-Type': contentType },
    });
  } catch (error) {
    return NextResponse.json({ error: `Failed to stream audio: ${error}` }, { status: 500 });
  }
}
