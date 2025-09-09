import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    console.log('📊 Fetching detailed analytics data...');

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

    // Fetch base datasets
    const [eventsRes, usersRes, refundsRes] = await Promise.all([
      fetch(`${backendUrl}/events`),
      fetch(`${backendUrl}/users`),
      fetch(`${backendUrl}/refunds`)
    ]);

    if (!eventsRes.ok || !usersRes.ok || !refundsRes.ok) {
      console.error('Failed to fetch data from backend');
      return NextResponse.json(
        { success: false, error: 'Failed to fetch data from backend' },
        { status: 500 }
      );
    }

    const events = await eventsRes.json();
    const users = await usersRes.json();
    const refundsData = await refundsRes.json();
    const refunds = refundsData.refunds || [];

    // Fetch event details (with ticket tiers) to compute accurate ticket-type counts
    const eventDetails = await Promise.all(
      events.map(async (ev: any) => {
        try {
          console.log(`🔍 Fetching ticket options for event ${ev.id}: ${ev.name}`);
          // Use the ticket tiers endpoint that includes registration counts
          const r = await fetch(`${backendUrl}/events/${ev.id}/ticket-options`);
          if (!r.ok) {
            console.log(`⚠️ Ticket options failed for event ${ev.id}, falling back to regular endpoint`);
            // Fallback to regular event endpoint
            const fallbackR = await fetch(`${backendUrl}/events/${ev.id}`);
            if (!fallbackR.ok) return null;
            return await fallbackR.json();
          }
          const data = await r.json();
          console.log(`🔍 Ticket options response for event ${ev.id}:`, data);
          
          // If ticket-options failed due to restrictions, try to get ticket tiers directly
          if (!data.success && data.message && data.message.includes('restricted')) {
            console.log(`🔍 Event ${ev.id} is restricted, trying to get ticket tiers directly`);
            // Try to get the event with tiers directly (without user restrictions)
            const directR = await fetch(`${backendUrl}/events/${ev.id}/ticket-tiers-analytics`);
            if (directR.ok) {
              const directData = await directR.json();
              console.log(`🔍 Direct event data for ${ev.id}:`, directData);
              return directData;
            }
          }
          
          return data;
        } catch (error) {
          console.error(`❌ Error fetching event ${ev.id}:`, error);
          return null;
        }
      })
    );

    // Process detailed analytics
    const detailedAnalytics = events.map((event: any, idx: number) => {
      const eventDetail = eventDetails[idx];

      // Get registrations for this event (best-effort, may be empty)
      const eventRegistrations = users.filter((user: any) => 
        user.registrations && user.registrations.some((reg: any) => reg.eventId === event.id)
      );

      // Get refunds for this event
      const eventRefunds = refunds.filter((refund: any) => refund.eventId === event.id);

      // Analyze by ticket type using tiers when available
      console.log(`🔍 Analyzing ticket types for event ${event.id}: ${event.name}`);
      console.log(`🔍 Event detail:`, eventDetail);
      
      const ticketAnalysis = analyzeTicketTypesFromTiers(eventDetail) ?? analyzeTicketTypesFallback(eventRegistrations, event);
      
      console.log(`🔍 Final ticket analysis for event ${event.id}:`, ticketAnalysis);
      
      // Analyze by year level (unchanged)
      const yearLevelAnalysis = analyzeYearLevels(eventRegistrations);
      
      // Analyze refunds by price
      const refundAnalysis = analyzeRefunds(eventRefunds);
      
      // Analyze cancellations (unchanged best-effort)
      const cancellationAnalysis = analyzeCancellations(eventRegistrations, event);

      // Calculate total registrations by directly counting actual registrations from users data
      let totalCapacity = event.capacity;
      let totalRegistrations = 0;
      
      // Count actual registrations from the users data (this is the source of truth)
      const actualRegistrations = users.filter((user: any) => 
        user.registrations && user.registrations.some((reg: any) => 
          reg.eventId === event.id && reg.paymentStatus === 'completed'
        )
      );
      
      totalRegistrations = actualRegistrations.length;
      
      // For advanced ticketing events, also calculate total capacity from tiers if available
      if (eventDetail && eventDetail.ticketTiers && Array.isArray(eventDetail.ticketTiers)) {
        const tierCapacity = eventDetail.ticketTiers.reduce((sum: number, tier: any) => sum + (Number(tier.capacity) || 0), 0);
        if (tierCapacity > 0) {
          totalCapacity = tierCapacity;
        }
      }
      
      console.log(`🔍 Event ${event.id} (${event.name}) ACTUAL registration calculation:`, {
        eventCapacity: event.capacity,
        eventRemainingSeats: event.remainingSeats,
        oldCalculation: event.capacity - event.remainingSeats,
        actualRegistrationsCount: totalRegistrations,
        actualRegistrations: actualRegistrations.map(u => ({ id: u.id, email: u.email })),
        totalCapacity,
        ticketTiers: eventDetail?.ticketTiers?.map((t: any) => ({
          name: t.name,
          capacity: t.capacity,
          registered_count: t.registered_count
        })) || 'No tiers'
      });

      return {
        eventId: event.id,
        eventName: event.name,
        eventDate: event.date,
        totalCapacity,
        totalRegistrations,
        ticketAnalysis,
        yearLevelAnalysis,
        refundAnalysis,
        cancellationAnalysis
      };
    });

    return NextResponse.json({ success: true, detailedAnalytics });

  } catch (error) {
    console.error('Error fetching detailed analytics:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function analyzeTicketTypesFromTiers(eventDetail: any) {
  // Handle both direct event structure and ticket-options response structure
  let ticketTiers = eventDetail.ticketTiers;
  
  // If it's a ticket-options response, extract the tiers from the nested structure
  if (eventDetail.success && eventDetail.ticketTiers) {
    ticketTiers = eventDetail.ticketTiers;
  }
  
  if (!ticketTiers || !Array.isArray(ticketTiers) || ticketTiers.length === 0) {
    console.log('🔍 No ticket tiers found in eventDetail:', eventDetail);
    return null;
  }
  
  console.log('🔍 Ticket tiers data:', ticketTiers);
  
  const byTier: Record<string, { count: number; price: number }> = {};
  for (const t of ticketTiers) {
    // Use registered_count directly instead of calculating from capacity - remaining_capacity
    const count = Number(t.registered_count) || 0;
    console.log(`🔍 Tier ${t.name}: registered_count=${t.registered_count}, count=${count}`);
    byTier[t.name] = { count, price: Number(t.price) || 0 };
  }
  
  console.log('🔍 Final ticket analysis:', byTier);
  return byTier;
}

function analyzeTicketTypesFallback(registrations: any[], event: any) {
  // Legacy fallback (no tiers available)
  const ticketTypes = {
    regular: { count: 0, price: event.fee || 0 },
    earlyBird: { count: 0, price: event.earlyBirdFee || event.fee || 0 },
    walkIn: { count: 0, price: event.walkInFee || event.fee || 0 }
  } as Record<string, { count: number; price: number }>;

  registrations.forEach((user: any) => {
    const registration = user.registrations.find((reg: any) => reg.eventId === event.id);
    if (registration) {
      if (registration.ticketType === 'early_bird') {
        ticketTypes.earlyBird.count++;
      } else if (registration.ticketType === 'walk_in') {
        ticketTypes.walkIn.count++;
      } else {
        ticketTypes.regular.count++;
      }
    }
  });

  return ticketTypes;
}

function analyzeYearLevels(registrations: any[]) {
  const yearLevels: { [key: string]: number } = {};
  registrations.forEach((user: any) => {
    const yearLevel = user.yearLevel || 'Unknown';
    yearLevels[yearLevel] = (yearLevels[yearLevel] || 0) + 1;
  });
  return yearLevels;
}

function analyzeRefunds(refunds: any[]) {
  const refundByPrice: { [key: number]: { count: number, users: string[] } } = {};
  refunds.forEach((refund: any) => {
    const price = refund.amount || 0;
    if (!refundByPrice[price]) {
      refundByPrice[price] = { count: 0, users: [] };
    }
    refundByPrice[price].count++;
    if (refund.userEmail) {
      refundByPrice[price].users.push(refund.userEmail);
    }
  });
  return refundByPrice;
}

function analyzeCancellations(registrations: any[], event: any) {
  const cancellations = registrations.filter((user: any) => {
    const registration = user.registrations.find((reg: any) => reg.eventId === event.id);
    return registration && registration.status === 'cancelled';
  });
  return {
    totalCancellations: cancellations.length,
    cancellationsByPrice: cancellations.reduce((acc: any, user: any) => {
      const registration = user.registrations.find((reg: any) => reg.eventId === event.id);
      const price = registration?.amount || event.fee || 0;
      acc[price] = (acc[price] || 0) + 1;
      return acc;
    }, {})
  };
} 