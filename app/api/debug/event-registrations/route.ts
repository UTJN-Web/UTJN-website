import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('eventId');
    
    if (!eventId) {
      return NextResponse.json({ error: 'Event ID is required' }, { status: 400 });
    }

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

    // Get event details
    const eventRes = await fetch(`${backendUrl}/events/${eventId}`);
    if (!eventRes.ok) {
      return NextResponse.json({ error: 'Failed to fetch event' }, { status: 500 });
    }
    const event = await eventRes.json();

    // Get ticket tiers with registration counts
    const tiersRes = await fetch(`${backendUrl}/events/${eventId}/ticket-options`);
    if (!tiersRes.ok) {
      return NextResponse.json({ error: 'Failed to fetch ticket tiers' }, { status: 500 });
    }
    const tiersData = await tiersRes.json();

    // Get CSV export to see actual registrations
    const csvRes = await fetch(`${backendUrl}/events/${eventId}/export_csv`);
    let csvData = '';
    if (csvRes.ok) {
      csvData = await csvRes.text();
    }

    return NextResponse.json({
      success: true,
      event: {
        id: event.id,
        name: event.name,
        capacity: event.capacity,
        remainingSeats: event.remainingSeats
      },
      ticketTiers: tiersData.ticketTiers || [],
      csvData: csvData.split('\n').slice(0, 10), // First 10 lines for debugging
      totalRegistrations: csvData.split('\n').length - 1 // Subtract header
    });

  } catch (error) {
    console.error('Debug error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
