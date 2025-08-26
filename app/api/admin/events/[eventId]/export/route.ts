import { NextRequest } from 'next/server';

export async function GET(_request: NextRequest, context: { params: Promise<{ eventId: string }> }) {
  try {
    const backend = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
    const { eventId } = await context.params;

    const upstream = await fetch(`${backend}/events/${encodeURIComponent(eventId)}/export_csv`, {
      method: 'GET',
    });

    if (!upstream.ok) {
      const text = await upstream.text().catch(() => '');
      return new Response(text || 'Failed to export CSV', { status: upstream.status });
    }

    const body = upstream.body;
    const headers = new Headers();
    headers.set('Content-Type', 'text/csv');
    headers.set('Content-Disposition', `attachment; filename="event_${eventId}_participants.csv"`);

    if (body) {
      return new Response(body, { status: 200, headers });
    }

    const text = await upstream.text();
    return new Response(text, { status: 200, headers });
  } catch (err) {
    return new Response('Internal error', { status: 500 });
  }
} 