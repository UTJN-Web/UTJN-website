import { NextRequest, NextResponse } from 'next/server';

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

    const upstream = await fetch(`${backendUrl}/forms/${encodeURIComponent(id)}/submissions`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!upstream.ok) {
      const text = await upstream.text().catch(() => '');
      return NextResponse.json({ success: false, error: text || 'Failed to fetch submissions' }, { status: upstream.status });
    }

    const data = await upstream.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('API route: submissions fetch error', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
} 