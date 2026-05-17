import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const apiUrl = process.env.API_URL || 'http://localhost:8000';
    const response = await fetch(`${apiUrl}/carousel/export`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        carousel_id: body.carouselId,
        theme: body.theme || 'midnight',
        slides: body.slides,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json(
        { error: `Export failed: ${error}` },
        { status: response.status }
      );
    }

    // Stream the ZIP file back
    const buffer = await response.arrayBuffer();
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="carousel.zip"`,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: `Export failed: ${error}` },
      { status: 500 }
    );
  }
}
