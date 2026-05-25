import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const apiUrl = process.env.API_URL || 'http://localhost:8000';

    const response = await fetch(`${apiUrl}/carousel/from-text`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        raw_text: body.rawText,
        theme: body.theme || 'midnight',
        handle: body.handle || '',
        slide_count: body.slideCount || null,
        tone: body.tone || 'casual',
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json(
        { error: `Backend error: ${error}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json({
      carouselId: data.carousel_id,
      slides: data.slides,
    });
  } catch (error) {
    return NextResponse.json(
      { error: `Failed to generate: ${error}` },
      { status: 500 }
    );
  }
}
