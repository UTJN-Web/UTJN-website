import { NextResponse } from 'next/server';

export async function POST() {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
    console.log('API route: forwarding events seeding to backend at:', backendUrl);
    
    const response = await fetch(`${backendUrl}/events/seed`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    console.log('API route: events seeding backend response status:', response.status);

    if (response.ok) {
      return NextResponse.json(data);
    } else {
      return NextResponse.json(
        { detail: data.detail || 'Failed to seed events' },
        { status: response.status }
      );
    }
  } catch (error) {
    console.error('API route: events seeding error:', error);
    return NextResponse.json(
      { detail: 'Internal server error' },
      { status: 500 }
    );
  }
} 