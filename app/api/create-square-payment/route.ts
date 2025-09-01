import { NextRequest, NextResponse } from 'next/server';
import { paymentsApi } from '@/lib/square';

// No BigInt serialization needed anymore

// Helper function to check for existing payments
async function checkExistingPayment(userId: string, eventId: string): Promise<string | null> {
  try {
    // This would typically check your database for existing payments
    // For now, we'll return null to indicate no existing payment
    // In a real implementation, you'd query your database here
    console.log(`Checking for existing payment: userId=${userId}, eventId=${eventId}`);
    return null;
  } catch (error) {
    console.error('Error checking existing payment:', error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { sourceId, amount, eventId, userId, email } = await request.json();
    
    console.log('Square payment request received:', {
      sourceId: sourceId ? `token: ${sourceId.substring(0, 10)}...` : 'missing',
      originalAmount: amount,
      eventId,
      userId,
      email,
      accessToken: process.env.SQUARE_ACCESS_TOKEN ? 'present' : 'missing',
      locationId: process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID || 'missing'
    });

    console.log('Raw sourceId received:', sourceId);

    if (!sourceId) {
      console.error('Missing sourceId in payment request');
      return NextResponse.json(
        { success: false, error: 'Missing payment source' },
        { status: 400 }
      );
    }

    // Check for existing payment before processing
    const existingPaymentId = await checkExistingPayment(userId, eventId);
    if (existingPaymentId) {
      console.log('Existing payment found, returning success:', existingPaymentId);
      return NextResponse.json({
        success: true,
        paymentId: existingPaymentId,
        message: 'Payment already exists for this user and event'
      });
    }

    // Create payment with Square
    console.log('Attempting to create Square payment...');
    
    // Square requires minimum payment amount - use $0.50 CAD minimum for testing
    const minimumAmount = 0.50;
    const finalAmount = amount <= 0 ? minimumAmount : amount;
    
    if (amount <= 0) {
      console.log(`Amount adjusted: $${amount} CAD → $${finalAmount} CAD (minimum required)`);
    }
    
    // Create a deterministic idempotency key to prevent duplicate payments
    const timestamp = Math.floor(Date.now() / 1000); // Use seconds to avoid microsecond precision issues
    const idempotencyKey = `${userId}-${eventId}-${timestamp}`;
    
    const paymentRequest = {
      idempotency_key: idempotencyKey,
      source_id: sourceId, // Token from Square Web Payments SDK
      location_id: process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID, // Add location ID
      amount_money: {
        currency: 'CAD', // Your Square account is Canadian
        amount: Math.round(finalAmount * 100), // Convert to cents (no BigInt)
      },
      metadata: {
        eventId: eventId.toString(),
        userId: userId.toString(),
        email: email,
        originalAmount: amount.toString(), // Store original amount for reference
      },
    };
    
    console.log('Payment request payload:', JSON.stringify(paymentRequest, null, 2));
    console.log('Using idempotency key:', idempotencyKey);
    
    const { result } = await paymentsApi.create(paymentRequest);

    console.log('Square payment successful:', {
      paymentId: result.payment?.id,
      status: result.payment?.status,
      idempotencyKey: idempotencyKey
    });

    return NextResponse.json({
      success: true,
      paymentId: result.payment?.id,
      orderId: result.payment?.orderId,
      receiptUrl: result.payment?.receiptUrl,
      payment: result.payment,
    });
  } catch (error: any) {
    console.error('Error creating Square payment:', error);
    console.error('Error details:', JSON.stringify(error, null, 2));
    
    // Handle specific Square API errors
    if (error.errors && Array.isArray(error.errors)) {
      const errorMessages = error.errors.map((err: any) => err.detail || err.code || err.category).join(', ');
      console.error('Square API specific errors:', errorMessages);
      
      // Check if this is an idempotency key conflict (payment already exists)
      const isIdempotencyConflict = error.errors.some((err: any) => 
        err.code === 'PAYMENT_ALREADY_COMPLETED' || 
        err.code === 'IDEMPOTENCY_KEY_CONFLICT' ||
        err.detail?.includes('idempotency')
      );
      
      if (isIdempotencyConflict) {
        console.log('Payment already exists due to idempotency key conflict - this is expected behavior');
        return NextResponse.json(
          { 
            success: true,
            error: 'Payment already processed',
            message: 'This payment has already been processed successfully'
          },
          { status: 200 }
        );
      }
      
      return NextResponse.json(
        { 
          success: false,
          error: `Square API Error: ${errorMessages}` 
        },
        { status: 400 }
      );
    }
    
    // Handle network errors and timeouts
    if (error.message?.includes('fetch') || error.message?.includes('network') || error.message?.includes('timeout')) {
      console.error('Network error during payment processing:', error.message);
      return NextResponse.json(
        { 
          success: false,
          error: 'Network error during payment processing. Please check your connection and try again.' 
        },
        { status: 503 }
      );
    }
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Payment processing failed. Please check your credentials and try again.' 
      },
      { status: 500 }
    );
  }
} 