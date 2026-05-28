import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: reelId } = await params;
    const apiUrl = process.env.API_URL || 'http://localhost:8000';

    const response = await fetch(`${apiUrl}/reels/download/${reelId}/srt`, {
      method: 'GET',
    });

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json({ error: 'Subtitle file not found' }, { status: 404 });
      }
      const error = await response.json().catch(() => ({}));
      return NextResponse.json(
        { error: error.detail || 'Failed to download subtitles' },
        { status: response.status }
      );
    }

    const contentDisposition =
      response.headers.get('content-disposition') || `attachment; filename="subtitles-${reelId}.srt"`;

    return new NextResponse(response.body, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': contentDisposition,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: `Failed to download subtitles: ${error}` },
      { status: 500 }
    );
  }
}
