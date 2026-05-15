import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ jobId: string; index: string }> }
) {
  try {
    const { jobId, index } = await params;
    const apiUrl = process.env.API_URL || 'http://localhost:8000';
    const response = await fetch(`${apiUrl}/reels/clips/${jobId}/${index}`);
    if (!response.ok) {
      return NextResponse.json({ error: 'Clip not found' }, { status: response.status });
    }
    return new NextResponse(response.body, {
      status: 200,
      headers: { 'Content-Type': 'video/mp4' },
    });
  } catch (error) {
    return NextResponse.json({ error: `Failed to stream clip: ${error}` }, { status: 500 });
  }
}
