import { NextRequest, NextResponse } from 'next/server';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { userId, email } = await request.json();

    console.log('Event cancellation request:', {
      eventId: id,
      userId,
      email
    });

    if (!userId || !email) {
      return NextResponse.json(
        { success: false, error: 'User ID and email are required' },
        { status: 400 }
      );
    }

    // Cancel the registration via backend API
    const cancellationResponse = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/events/${id}/register`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: parseInt(userId)
      })
    });

    if (!cancellationResponse.ok) {
      const errorData = await cancellationResponse.text();
      console.error('Backend cancellation failed:', errorData);
      
      // Try to parse error response
      let errorMessage = 'Cancellation failed. Please try again.';
      try {
        const errorJson = JSON.parse(errorData);
        errorMessage = errorJson.detail || errorMessage;
      } catch (e) {
        // Use default message if parsing fails
      }

      return NextResponse.json(
        { success: false, error: errorMessage },
        { status: 500 }
      );
    }

    const cancellationData = await cancellationResponse.json();

    console.log('Event cancellation successful:', {
      eventId: id,
      userId,
      cancellationId: cancellationData.id || 'N/A'
    });

    return NextResponse.json({
      success: true,
      message: 'Successfully cancelled event registration',
      cancellation: {
        eventId: id,
        userId: userId,
        email: email,
        cancellationTime: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error in event cancellation:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error during cancellation' },
      { status: 500 }
    );
  }
} 