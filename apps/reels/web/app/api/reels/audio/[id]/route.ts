import { NextRequest, NextResponse } from 'next/server';

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const apiUrl = process.env.API_URL || 'http://localhost:8000';
    const response = await fetch(`${apiUrl}/reels/audio/${id}`, { method: 'DELETE' });
    if (response.status === 404) {
      return NextResponse.json({ error: 'Audio not found' }, { status: 404 });
    }
    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to delete audio' }, { status: response.status });
    }
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return NextResponse.json({ error: `Delete failed: ${error}` }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const apiUrl = process.env.API_URL || 'http://localhost:8000';

    const upstreamHeaders: HeadersInit = {};
    const range = request.headers.get('range');
    if (range) upstreamHeaders['Range'] = range;

    const response = await fetch(`${apiUrl}/reels/audio/${id}`, {
      method: 'GET',
      headers: upstreamHeaders,
    });

    if (!response.ok && response.status !== 206) {
      return NextResponse.json({ error: 'Audio not found' }, { status: response.status });
    }

    const responseHeaders: Record<string, string> = {
      'Content-Type': response.headers.get('content-type') || 'audio/mpeg',
    };
    for (const h of ['content-range', 'accept-ranges', 'content-length']) {
      const v = response.headers.get(h);
      if (v) responseHeaders[h] = v;
    }

    return new NextResponse(response.body, {
      status: response.status,
      headers: responseHeaders,
    });
  } catch (error) {
    return NextResponse.json({ error: `Failed to stream audio: ${error}` }, { status: 500 });
  }
}
