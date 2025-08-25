import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userEmail = searchParams.get('user_email');
    
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
    console.log('API route: forwarding events fetch to backend at:', backendUrl);
    
    // Build URL with user email if provided
    let url = `${backendUrl}/events`;
    if (userEmail) {
      url += `?user_email=${encodeURIComponent(userEmail)}`;
      console.log('API route: fetching events for user:', userEmail);
    }
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    console.log('API route: events backend response status:', response.status);
    console.log('API route: events data length:', data.length);
    console.log('API route: events data sample:', data.slice(0, 2).map((e: any) => ({
      id: e.id,
      name: e.name,
      enableAdvancedTicketing: e.enableAdvancedTicketing,
      enableSubEvents: e.enableSubEvents,
      ticketTiersCount: e.ticketTiers?.length || 0,
      subEventsCount: e.subEvents?.length || 0
    })));

    if (response.ok) {
      console.log('API route: returning events data to frontend');
      return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store, no-cache, max-age=0, must-revalidate' } });
    } else {
      return NextResponse.json(
        { detail: data.detail || 'Failed to fetch events' },
        { status: response.status }
      );
    }
  } catch (error) {
    console.error('API route: events fetch error:', error);
    return NextResponse.json(
      { detail: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
    console.log('API route: forwarding event creation to backend at:', backendUrl);
    
    const response = await fetch(`${backendUrl}/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    console.log('API route: event creation backend response status:', response.status);

    if (response.ok) {
      return NextResponse.json(data, { status: 201 });
    } else {
      return NextResponse.json(
        { detail: data.detail || 'Failed to create event' },
        { status: response.status }
      );
    }
  } catch (error) {
    console.error('API route: event creation error:', error);
    return NextResponse.json(
      { detail: 'Internal server error' },
      { status: 500 }
    );
  }
} 