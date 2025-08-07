import { NextRequest, NextResponse } from 'next/server';
import { paymentsApi } from '@/lib/square';
import { randomUUID } from 'crypto';

// No BigInt serialization needed anymore

export async function POST(request: NextRequest) {
  try {
    const { sourceId, amount, eventId, userId, email } = await request.json();
    
    console.log('Square payment request received:', {
      sourceId: sourceId ? `token: ${sourceId.substring(0, 10)}...` : 'missing',
      originalAmount: amount,
      eventId,
      userId,
      email,
      accessToken: process.env.SQUARE_ACCESS_TOKEN ? 'present' : 'missing'
    });

    console.log('Raw sourceId received:', sourceId);

    if (!sourceId) {
      console.error('Missing sourceId in payment request');
      return NextResponse.json(
        { success: false, error: 'Missing payment source' },
        { status: 400 }
      );
    }

    // Create payment with Square
    console.log('Attempting to create Square payment...');
    
    // Square requires minimum payment amount - use $0.50 CAD minimum for testing
    const minimumAmount = 0.50;
    const finalAmount = amount <= 0 ? minimumAmount : amount;
    
    if (amount <= 0) {
      console.log(`Amount adjusted: $${amount} CAD → $${finalAmount} CAD (minimum required)`);
    }
    
    const paymentRequest = {
      idempotency_key: randomUUID(),
      source_id: sourceId, // Token from Square Web Payments SDK
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
    const { result } = await paymentsApi.create(paymentRequest);

    console.log('Square payment successful:', {
      paymentId: result.payment?.id,
      status: result.payment?.status
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
      return NextResponse.json(
        { 
          success: false,
          error: `Square API Error: ${errorMessages}` 
        },
        { status: 400 }
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