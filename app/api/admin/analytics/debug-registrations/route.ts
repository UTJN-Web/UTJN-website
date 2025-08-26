import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Debug: Checking EventRegistration data...');

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

    // Get all events
    const eventsRes = await fetch(`${backendUrl}/events`);
    if (!eventsRes.ok) {
      return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 });
    }
    const events = await eventsRes.json();

    // For each event, check the actual registration data
    const debugData = await Promise.all(events.map(async (event: any) => {
      console.log(`🔍 Debugging registrations for event: ${event.name} (ID: ${event.id})`);
      
      // Get detailed registrations for this event
      const registrationsRes = await fetch(`${backendUrl}/events/${event.id}/export_csv`);
      let registrations: string[] = [];
      if (registrationsRes.ok) {
        const csvText = await registrationsRes.text();
        const lines = csvText.split('\n');
        registrations = lines.slice(1).filter(line => line.trim().length > 0);
      }

      // Get ticket tiers for this event
      let ticketTiers = [];
      try {
        const tiersRes = await fetch(`${backendUrl}/events/${event.id}/ticket-tiers-analytics`);
        if (tiersRes.ok) {
          const tiersData = await tiersRes.json();
          if (tiersData.success && tiersData.ticketTiers) {
            ticketTiers = tiersData.ticketTiers;
          }
        }
      } catch (error) {
        console.error(`Error fetching ticket tiers for event ${event.id}:`, error);
      }

      return {
        eventId: event.id,
        eventName: event.name,
        enableAdvancedTicketing: event.enableAdvancedTicketing,
        registrationCount: registrations.length,
        registrations: registrations,
        ticketTiers: ticketTiers,
        // Check if registrations have ticketTierId
        hasTicketTierData: ticketTiers.length > 0,
        registrationDetails: registrations.map((reg: string) => {
          const parts = reg.split(',');
          return {
            firstName: parts[0] || '',
            lastName: parts[1] || '',
            email: parts[2] || '',
            major: parts[3] || '',
            year: parts[4] || '',
            yearLevel: parts[5] || '',
            university: parts[6] || ''
          };
        })
      };
    }));

    return NextResponse.json({
      success: true,
      debugData: debugData,
      summary: {
        totalEvents: events.length,
        eventsWithRegistrations: debugData.filter((d: any) => d.registrationCount > 0).length,
        totalRegistrations: debugData.reduce((sum: number, d: any) => sum + d.registrationCount, 0)
      }
    });

  } catch (error) {
    console.error('Error in debug registrations:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 