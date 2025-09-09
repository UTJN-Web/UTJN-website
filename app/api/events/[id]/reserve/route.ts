import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { userId, tierId, subEventIds, creditsUsed = 0, finalPrice, paymentEmail } = await request.json();

    console.log('Reserve registration request:', {
      eventId: id,
      userId,
      tierId,
      subEventIds,
      creditsUsed,
      finalPrice
    });

    // Enhanced userId validation
    if (!userId || userId === 'undefined' || userId === 'null') {
      console.error('Invalid userId received:', { userId, type: typeof userId });
      return NextResponse.json(
        { success: false, error: 'User ID is required and must be valid' },
        { status: 400 }
      );
    }

    // Validate userId is a valid number
    const numericUserId = parseInt(userId);
    if (isNaN(numericUserId) || numericUserId <= 0) {
      console.error('Invalid numeric userId:', { userId, numericUserId });
      return NextResponse.json(
        { success: false, error: 'User ID must be a valid positive number' },
        { status: 400 }
      );
    }

    // Reserve registration (without payment) via backend API
    const reservationResponse = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/events/${id}/reserve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: numericUserId,
        tierId: tierId ? parseInt(tierId) : null,
        subEventIds: subEventIds || [],
        creditsUsed: creditsUsed,
        finalPrice: finalPrice,
        paymentEmail: paymentEmail
      })
    });

    if (!reservationResponse.ok) {
      const errorData = await reservationResponse.text();
      console.error('Backend reservation failed:', {
        status: reservationResponse.status,
        statusText: reservationResponse.statusText,
        error: errorData,
        userId: numericUserId,
        eventId: id
      });

      // Enhanced error handling based on backend response
      let errorMessage = 'Reservation failed. Please try again.';
      if (reservationResponse.status === 400) {
        if (errorData.includes('User ID is required') || errorData.includes('User not found')) {
          errorMessage = 'User session expired. Please log in again to complete registration.';
        } else if (errorData.includes('Event not found')) {
          errorMessage = 'Event not found. Please contact support.';
        } else if (errorData.includes('no longer available') || errorData.includes('full')) {
          errorMessage = 'Event is now full. Please try another event.';
        } else {
          errorMessage = `Reservation failed: ${errorData}`;
        }
      } else if (reservationResponse.status === 500) {
        errorMessage = 'Server error during reservation. Please try again.';
      }

      return NextResponse.json(
        { success: false, error: errorMessage },
        { status: reservationResponse.status }
      );
    }

    const reservationData = await reservationResponse.json();

    console.log('Reservation successful:', {
      eventId: id,
      userId,
      reservationId: reservationData.reservationId || 'N/A'
    });

    return NextResponse.json({
      success: true,
      message: 'Registration spot reserved successfully',
      reservationId: reservationData.reservationId,
      expiresAt: reservationData.expiresAt
    });

  } catch (error) {
    console.error('Error in reservation:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error during reservation' },
      { status: 500 }
    );
  }
}
