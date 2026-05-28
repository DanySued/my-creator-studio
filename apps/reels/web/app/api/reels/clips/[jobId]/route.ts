import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params;
    const apiUrl = process.env.API_URL || 'http://localhost:8000';
    const response = await fetch(`${apiUrl}/reels/clips/${jobId}`);
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      return NextResponse.json({ error: error.detail || 'Failed to get clips' }, { status: response.status });
    }
    return NextResponse.json(await response.json());
  } catch (error) {
    return NextResponse.json({ error: `Failed to get clips: ${error}` }, { status: 500 });
  }
}
