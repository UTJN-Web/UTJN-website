import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { userId, paymentId, tierId, subEventIds, creditsUsed = 0, finalPrice, paymentEmail } = await request.json();

          console.log('Paid event registration request:', {
        eventId: id,
        userId,
        paymentId: paymentId ? `${paymentId.substring(0, 10)}...` : 'missing',
        creditsUsed,
        finalPrice
      });

      if (!userId) {
        return NextResponse.json(
          { success: false, error: 'User ID is required' },
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
          userId: parseInt(userId),
          paymentId: paymentId || null,
          tierId: tierId ? parseInt(tierId) : null,
          subEventIds: subEventIds || [],
          creditsUsed: creditsUsed,
          finalPrice: finalPrice, // Pass the calculated final price with credits applied
          paymentEmail: paymentEmail // Pass the payment email for refund notifications
        })
    });

    if (!registrationResponse.ok) {
      // If registration fails and we spent credits, we should ideally refund them
      // For now, we'll just log the issue
      if (creditTransaction) {
        console.error('⚠️ Registration failed but credits were already spent. Manual refund may be needed.');
      }
      
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