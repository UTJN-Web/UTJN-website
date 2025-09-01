import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
    
    // Get events with registration details
    const eventsResponse = await fetch(`${backendUrl}/events`);
    if (!eventsResponse.ok) {
      return NextResponse.json(
        { success: false, error: 'Failed to fetch events' },
        { status: 500 }
      );
    }
    
    const events = await eventsResponse.json();
    
    // Calculate revenue by summing actual finalPrice values from registrations
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    
    let totalRevenue = 0;
    let thisMonthRevenue = 0;
    let lastMonthRevenue = 0;
    let eventRevenues: any[] = [];
    
    for (const event of events) {
      // Get registrations for this event with finalPrice
      const registrationsResponse = await fetch(`${backendUrl}/events/${event.id}/registrations`);
      if (registrationsResponse.ok) {
        const registrations = await registrationsResponse.json();
        
        // Sum up actual finalPrice values
        let eventRevenue = 0;
        let eventThisMonthRevenue = 0;
        let eventLastMonthRevenue = 0;
        
        for (const registration of registrations) {
          const finalPrice = registration.finalPrice || 0;
          eventRevenue += finalPrice;
          
          // Check registration date for monthly breakdown
          if (registration.registeredAt) {
            const regDate = new Date(registration.registeredAt);
            if (regDate.getMonth() === currentMonth && regDate.getFullYear() === currentYear) {
              eventThisMonthRevenue += finalPrice;
            } else if (regDate.getMonth() === (currentMonth - 1 + 12) % 12 && 
                      regDate.getFullYear() === (currentMonth === 0 ? currentYear - 1 : currentYear)) {
              eventLastMonthRevenue += finalPrice;
            }
          }
        }
        
        totalRevenue += eventRevenue;
        thisMonthRevenue += eventThisMonthRevenue;
        lastMonthRevenue += eventLastMonthRevenue;
        
        eventRevenues.push({
          eventId: event.id,
          eventName: event.name,
          registrations: registrations.length,
          revenue: eventRevenue,
          thisMonthRevenue: eventThisMonthRevenue,
          lastMonthRevenue: eventLastMonthRevenue
        });
      }
    }
    
    // Calculate growth percentage
    const growth = lastMonthRevenue > 0 ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 : 0;
    
    return NextResponse.json({
      success: true,
      revenue: {
        total: totalRevenue,
        thisMonth: thisMonthRevenue,
        lastMonth: lastMonthRevenue,
        growth
      },
      eventRevenues,
      events
    });
    
  } catch (error) {
    console.error('Error calculating revenue:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
} 