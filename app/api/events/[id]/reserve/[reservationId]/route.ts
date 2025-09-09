import { NextRequest, NextResponse } from 'next/server';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; reservationId: string }> }
) {
  try {
    const { id, reservationId } = await params;
    const { userId } = await request.json();

    console.log('Cancel reservation request:', {
      eventId: id,
      reservationId,
      userId
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

    // Cancel reservation via backend API
    const cancelResponse = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/events/${id}/reserve/${reservationId}?user_id=${numericUserId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (!cancelResponse.ok) {
      const errorData = await cancelResponse.text();
      console.error('Backend reservation cancellation failed:', {
        status: cancelResponse.status,
        statusText: cancelResponse.statusText,
        error: errorData,
        userId: numericUserId,
        eventId: id,
        reservationId
      });

      // Enhanced error handling based on backend response
      let errorMessage = 'Failed to cancel reservation. Please try again.';
      if (cancelResponse.status === 404) {
        errorMessage = 'Reservation not found or already expired.';
      } else if (cancelResponse.status === 500) {
        errorMessage = 'Server error during reservation cancellation. Please try again.';
      }

      return NextResponse.json(
        { success: false, error: errorMessage },
        { status: cancelResponse.status }
      );
    }

    const cancelData = await cancelResponse.json();

    console.log('Reservation cancellation successful:', {
      eventId: id,
      userId,
      reservationId,
      message: cancelData.message
    });

    return NextResponse.json({
      success: true,
      message: 'Reservation cancelled successfully',
      reservationId: reservationId
    });

  } catch (error) {
    console.error('Error in reservation cancellation:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error during reservation cancellation' },
      { status: 500 }
    );
  }
}
