import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Debug: Checking registration data...');

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

    // Get all events
    const eventsRes = await fetch(`${backendUrl}/events`);
    if (!eventsRes.ok) {
      return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 });
    }
    const events = await eventsRes.json();

    // For each event, check ticket tiers and registrations
    const debugData = await Promise.all(events.map(async (event: any) => {
      console.log(`🔍 Debugging event: ${event.name} (ID: ${event.id})`);
      
      // Get ticket options for this event
      const ticketOptionsRes = await fetch(`${backendUrl}/events/${event.id}/ticket-options`);
      let ticketOptions = null;
      if (ticketOptionsRes.ok) {
        ticketOptions = await ticketOptionsRes.json();
      }

      // Get detailed registrations for this event
      const registrationsRes = await fetch(`${backendUrl}/events/${event.id}/export_csv`);
      let registrations: string[] = [];
      if (registrationsRes.ok) {
        const csvText = await registrationsRes.text();
        const lines = csvText.split('\n');
        registrations = lines.slice(1).filter(line => line.trim().length > 0);
      }

      return {
        eventId: event.id,
        eventName: event.name,
        enableAdvancedTicketing: event.enableAdvancedTicketing,
        ticketOptions: ticketOptions,
        registrationCount: registrations.length,
        registrations: registrations
      };
    }));

    return NextResponse.json({ 
      success: true, 
      debugData,
      summary: {
        totalEvents: events.length,
        eventsWithAdvancedTicketing: events.filter((e: any) => e.enableAdvancedTicketing).length,
        totalRegistrations: debugData.reduce((sum: number, data: any) => sum + data.registrationCount, 0)
      }
    });

  } catch (error) {
    console.error('Error in debug endpoint:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
} 