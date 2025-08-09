import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { userId, email } = await request.json();

    console.log('Free event registration request:', {
      eventId: id,
      userId,
      email
    });

    // First, fetch the event to verify it's free
    const eventResponse = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/events/${id}`);
    if (!eventResponse.ok) {
      return NextResponse.json(
        { success: false, error: 'Event not found' },
        { status: 404 }
      );
    }

    const event = await eventResponse.json();
    
    // Check if event is actually free
    if (event.fee > 0) {
      return NextResponse.json(
        { success: false, error: 'This event requires payment. Please use the payment flow.' },
        { status: 400 }
      );
    }

    // Register user for the free event via backend API
    const registrationResponse = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/events/${id}/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: parseInt(userId),
        email: email,
        registrationType: 'free',
        registrationTime: new Date().toISOString()
      })
    });

    if (!registrationResponse.ok) {
      const errorData = await registrationResponse.text();
      console.error('Backend registration failed:', errorData);
      return NextResponse.json(
        { success: false, error: 'Registration failed. Please try again.' },
        { status: 500 }
      );
    }

    const registrationData = await registrationResponse.json();

    console.log('Free event registration successful:', {
      eventId: id,
      userId,
      registrationId: registrationData.id || 'N/A'
    });

    return NextResponse.json({
      success: true,
      message: 'Successfully registered for free event',
      registration: {
        eventId: id,
        eventName: event.name,
        userId: userId,
        email: email,
        registrationType: 'free',
        registrationTime: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error in free event registration:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error during registration' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const eventId = id;
    const body = await request.json();
    
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
    console.log('API route: forwarding event registration cancellation to backend at:', backendUrl);
    
    const response = await fetch(`${backendUrl}/events/${eventId}/register`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    console.log('API route: event registration cancellation backend response status:', response.status);

    if (response.ok) {
      return NextResponse.json(data);
    } else {
      return NextResponse.json(
        { detail: data.detail || 'Failed to cancel registration' },
        { status: response.status }
      );
    }
  } catch (error) {
    console.error('API route: event registration cancellation error:', error);
    return NextResponse.json(
      { detail: 'Internal server error' },
      { status: 500 }
    );
  }
} 