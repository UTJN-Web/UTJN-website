import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { userId, email, reason, paymentAmount } = await request.json();

    console.log('Refund request received:', {
      eventId: id,
      userId,
      email,
      reason,
      paymentAmount
    });

    if (!userId || !email || !paymentAmount) {
      return NextResponse.json(
        { success: false, error: 'User ID, email, and payment amount are required' },
        { status: 400 }
      );
    }

    // First, get event details
    const eventResponse = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/events/${id}`);
    if (!eventResponse.ok) {
      return NextResponse.json(
        { success: false, error: 'Event not found' },
        { status: 404 }
      );
    }

    const event = await eventResponse.json();

    // Check if refund is allowed (before refund deadline)
    const now = new Date();
    const refundDeadline = event.refundDeadline ? new Date(event.refundDeadline) : new Date(event.date);
    
    if (now > refundDeadline) {
      console.log(`⚠️ Refund deadline passed: ${refundDeadline.toISOString()}`);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Refund period has expired',
          refundDeadline: refundDeadline.toISOString()
        },
        { status: 400 }
      );
    }

    console.log(`✅ Refund allowed until: ${refundDeadline.toISOString()}`);

    // FIRST: Get the payment ID before canceling the registration
    console.log('🔍 Getting payment ID before cancellation...');
    let paymentId = null;
    
    try {
      const paymentIdResponse = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/events/${id}/payment-id?userId=${userId}`);
      if (paymentIdResponse.ok) {
        const paymentData = await paymentIdResponse.json();
        paymentId = paymentData.paymentId;
        console.log('✅ Found payment ID for refund:', paymentId ? `${paymentId.substring(0, 10)}...` : 'none');
      }
    } catch (error) {
      console.warn('⚠️ Could not get payment ID:', error);
    }

    // SECOND: Cancel the registration
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
      return NextResponse.json(
        { success: false, error: 'Failed to cancel registration' },
        { status: 500 }
      );
    }

    // Get the payment email from the registration
    let paymentEmail = email; // fallback to provided email
    try {
      const paymentEmailResponse = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/events/${id}/payment-email?userId=${userId}`);
      if (paymentEmailResponse.ok) {
        const paymentEmailData = await paymentEmailResponse.json();
        if (paymentEmailData.paymentEmail) {
          paymentEmail = paymentEmailData.paymentEmail;
          console.log('✅ Found payment email for refund:', paymentEmail);
        }
      }
    } catch (error) {
      console.warn('⚠️ Could not get payment email, using provided email:', error);
    }

    // THIRD: Create refund request in the database WITH payment ID
    const refundResponse = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/refunds`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        eventId: parseInt(id),
        userId: parseInt(userId),
        email: paymentEmail, // Use the payment email instead of user's registered email
        amount: paymentAmount,
        reason: reason || 'Event cancellation',
        currency: 'CAD',
        paymentId: paymentId
      })
    });

    if (!refundResponse.ok) {
      const errorData = await refundResponse.text();
      console.error('Backend refund creation failed:', errorData);
      return NextResponse.json(
        { success: false, error: 'Failed to create refund request in database' },
        { status: 500 }
      );
    }

    const refundResult = await refundResponse.json();
    console.log('✅ Refund request created in database:', refundResult);

    return NextResponse.json({
      success: true,
      message: 'Refund request submitted successfully',
      refundRequest: {
        id: refundResult.refundRequest.id,
        eventName: event.name,
        amount: paymentAmount,
        currency: 'CAD',
        status: 'pending',
        requestDate: refundResult.refundRequest.requestDate
      }
    });

  } catch (error) {
    console.error('Error processing refund request:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error during refund request' },
      { status: 500 }
    );
  }
} 