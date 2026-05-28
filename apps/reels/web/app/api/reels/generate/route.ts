import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const apiUrl = process.env.API_URL || 'http://localhost:8000';
    const response = await fetch(`${apiUrl}/reels/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        keywords: body.keywords,
        audio_file_id: body.audioFileId,
        duration: body.duration || 15,
        title: body.title || 'Generated Reel',
        song_start_time: body.songStartTime ?? 0,
        overlays: body.overlays ?? [],
        subtitles_enabled: body.subtitlesEnabled ?? false,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(
        { error: error.detail || 'Generation failed' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: `Failed to generate reel: ${error}` },
      { status: 500 }
    );
  }
}
