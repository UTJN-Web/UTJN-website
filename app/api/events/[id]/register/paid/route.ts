import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { userId, paymentId } = await request.json();

    console.log('Paid event registration request:', {
      eventId: id,
      userId,
      paymentId: paymentId ? `${paymentId.substring(0, 10)}...` : 'missing'
    });

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Register user for the paid event via backend API
    const registrationResponse = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/events/${id}/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: parseInt(userId),
        paymentId: paymentId || null,
        registrationType: 'paid',
        registrationTime: new Date().toISOString()
      })
    });

    if (!registrationResponse.ok) {
      const errorData = await registrationResponse.text();
      console.error('Backend paid registration failed:', errorData);
      return NextResponse.json(
        { success: false, error: 'Registration failed. Please try again.' },
        { status: 500 }
      );
    }

    const registrationData = await registrationResponse.json();

    console.log('Paid event registration successful:', {
      eventId: id,
      userId,
      paymentId,
      registrationId: registrationData.id || 'N/A'
    });

    return NextResponse.json({
      success: true,
      message: 'Successfully registered for paid event',
      registration: {
        eventId: id,
        userId: userId,
        paymentId: paymentId,
        registrationType: 'paid',
        registrationTime: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error in paid event registration:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error during registration' },
      { status: 500 }
    );
  }
} 