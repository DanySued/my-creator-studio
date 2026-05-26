import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const apiUrl = process.env.API_URL || 'http://localhost:8000';

    const response = await fetch(`${apiUrl}/carousel/render-png`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        slides: body.slides,
        theme: body.theme || 'thread',
        handle: body.handle || '',
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json(
        { error: `Backend error: ${error}` },
        { status: response.status }
      );
    }

    const data = await response.arrayBuffer();
    return new NextResponse(data, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': 'attachment; filename="carousel.zip"',
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: `Failed to render: ${error}` },
      { status: 500 }
    );
  }
}
