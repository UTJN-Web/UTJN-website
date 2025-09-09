import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { userId, paymentId, tierId, subEventIds, creditsUsed = 0, finalPrice, paymentEmail, reservationId } = await request.json();

          console.log('Paid event registration request:', {
        eventId: id,
        userId,
        paymentId: paymentId ? `${paymentId.substring(0, 10)}...` : 'missing',
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

      // Credits are already deducted on the frontend before payment
      // The finalPrice already reflects the credit discount
      let creditTransaction = null;
      if (creditsUsed > 0) {
        console.log(`ℹ️ Credits (${creditsUsed}) were already applied on frontend. Final price: ${finalPrice}`);
      }

    // Register user for the paid event via backend API
    const registrationResponse = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/events/${id}/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
              body: JSON.stringify({
          userId: numericUserId, // Use the validated numeric userId
          paymentId: paymentId || null,
          tierId: tierId ? parseInt(tierId) : null,
          subEventIds: subEventIds || [],
          creditsUsed: creditsUsed,
          finalPrice: finalPrice, // Pass the calculated final price with credits applied
          paymentEmail: paymentEmail, // Pass the payment email for refund notifications
          reservationId: reservationId // Pass the reservation ID for conversion
        })
    });

    if (!registrationResponse.ok) {
      // If registration fails and we spent credits, we should ideally refund them
      // For now, we'll just log the issue
      if (creditTransaction) {
        console.error('⚠️ Registration failed but credits were already spent. Manual refund may be needed.');
      }
      
      const errorData = await registrationResponse.text();
      console.error('Backend paid registration failed:', {
        status: registrationResponse.status,
        statusText: registrationResponse.statusText,
        error: errorData,
        userId: numericUserId,
        eventId: id,
        paymentId
      });

      // Enhanced error handling based on backend response
      let errorMessage = 'Registration failed. Please try again.';
      if (registrationResponse.status === 400) {
        if (errorData.includes('User ID is required') || errorData.includes('User not found')) {
          errorMessage = 'User session expired. Please log in again to complete registration.';
        } else if (errorData.includes('Event not found')) {
          errorMessage = 'Event not found. Please contact support.';
        } else if (errorData.includes('no longer available') || errorData.includes('full')) {
          errorMessage = 'Event or ticket tier is no longer available. Please contact support for a refund.';
        } else {
          errorMessage = `Registration failed: ${errorData}`;
        }
      } else if (registrationResponse.status === 500) {
        errorMessage = 'Server error during registration. Please contact support if payment was processed.';
      }

      return NextResponse.json(
        { success: false, error: errorMessage },
        { status: registrationResponse.status }
      );
    }

    const registrationData = await registrationResponse.json();

    console.log('Paid event registration successful:', {
      eventId: id,
      userId,
      paymentId,
      creditsUsed: creditsUsed,
      finalPrice: finalPrice,
      registrationId: registrationData.id || 'N/A'
    });

    return NextResponse.json({
      success: true,
      message: creditsUsed > 0 
        ? `Successfully registered with $${creditsUsed} credit discount applied!`
        : 'Successfully registered for paid event',
      registration: {
        eventId: id,
        userId: userId,
        paymentId: paymentId,
        creditsUsed: creditsUsed,
        finalPrice: finalPrice,
        creditTransaction: creditTransaction,
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