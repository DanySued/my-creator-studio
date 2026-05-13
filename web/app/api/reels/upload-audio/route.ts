import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file is audio
    const audioMimeTypes = ['audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/ogg'];
    if (!audioMimeTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Unsupported audio format. Use MP3, WAV, M4A, or OGG' },
        { status: 400 }
      );
    }

    // Forward to backend
    const apiUrl = process.env.API_URL || 'http://localhost:8000';
    const backendFormData = new FormData();
    backendFormData.append('file', file);

    const response = await fetch(`${apiUrl}/reels/upload-audio`, {
      method: 'POST',
      body: backendFormData,
    });

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(
        { error: error.detail || 'Upload failed' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: `Upload failed: ${error}` },
      { status: 500 }
    );
  }
}
