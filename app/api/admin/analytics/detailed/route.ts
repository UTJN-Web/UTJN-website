import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    console.log('📊 Fetching detailed analytics data...');

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

    // Fetch all required data
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

    // Process detailed analytics
    const detailedAnalytics = events.map((event: any) => {
      // Get registrations for this event
      const eventRegistrations = users.filter((user: any) => 
        user.registrations && user.registrations.some((reg: any) => reg.eventId === event.id)
      );

      // Get refunds for this event
      const eventRefunds = refunds.filter((refund: any) => 
        refund.eventId === event.id
      );

      // Analyze by ticket type and price
      const ticketAnalysis = analyzeTicketTypes(eventRegistrations, event);
      
      // Analyze by year level
      const yearLevelAnalysis = analyzeYearLevels(eventRegistrations);
      
      // Analyze refunds by price
      const refundAnalysis = analyzeRefunds(eventRefunds);
      
      // Analyze cancellations
      const cancellationAnalysis = analyzeCancellations(eventRegistrations, event);

      return {
        eventId: event.id,
        eventName: event.name,
        eventDate: event.date,
        totalCapacity: event.capacity,
        totalRegistrations: event.capacity - event.remainingSeats,
        ticketAnalysis,
        yearLevelAnalysis,
        refundAnalysis,
        cancellationAnalysis
      };
    });

    return NextResponse.json({
      success: true,
      detailedAnalytics
    });

  } catch (error) {
    console.error('Error fetching detailed analytics:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function analyzeTicketTypes(registrations: any[], event: any) {
  const ticketTypes = {
    regular: { count: 0, price: event.fee || 0 },
    earlyBird: { count: 0, price: event.earlyBirdFee || event.fee || 0 },
    walkIn: { count: 0, price: event.walkInFee || event.fee || 0 }
  };

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