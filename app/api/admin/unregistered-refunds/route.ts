import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Admin fetching unregistered payments...');

    // Get query parameters from the request
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    console.log(`🔍 Query params: email=${email}, start_date=${startDate}, end_date=${endDate}`);

    // Build backend URL with query parameters
    let backendUrl = `${process.env.NEXT_PUBLIC_BACKEND_URL}/unregistered-payments`;
    const params = new URLSearchParams();
    
    if (email) params.append('email', email);
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    
    if (params.toString()) {
      backendUrl += `?${params.toString()}`;
    }

    console.log(`🔗 Backend URL: ${backendUrl}`);

    // Get unregistered payments from backend
    const response = await fetch(backendUrl);
    
    if (!response.ok) {
      const errorData = await response.text();
      console.error('Backend unregistered payments fetch failed:', errorData);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch unregistered payments from database' },
        { status: 500 }
      );
    }

    const data = await response.json();
    console.log(`✅ Retrieved ${data.count} unregistered payments from backend`);

    return NextResponse.json({
      success: true,
      unregisteredRefunds: data.unregisteredPayments,
      count: data.count,
      email: email,
      dateRange: data.dateRange
    });

  } catch (error) {
    console.error('Error fetching unregistered payments:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error during unregistered payments fetch' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { paymentId, amount, currency, customerId, orderId, createdAt, email } = await request.json();

    console.log(`💰 Admin processing unregistered payment refund: ${paymentId}`);

    if (!paymentId || !amount || !currency) {
      return NextResponse.json(
        { success: false, error: 'Payment ID, amount, and currency are required' },
        { status: 400 }
      );
    }

    // Process refund for unregistered payment in backend
    const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/unregistered-payments/refund`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        paymentId,
        amount,
        currency,
        customerId,
        orderId,
        createdAt,
        email,
        reason: 'Refund for failed registration - payment succeeded but registration failed'
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Backend unregistered payment refund failed:', errorData);
      return NextResponse.json(
        { success: false, error: 'Failed to process unregistered payment refund' },
        { status: 500 }
      );
    }

    const result = await response.json();
    console.log(`✅ Unregistered payment refund ${paymentId} processed successfully`);

    return NextResponse.json({
      success: true,
      message: result.message,
      paymentId: paymentId,
      refundId: result.refundId
    });

  } catch (error) {
    console.error('Error processing unregistered payment refund:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error during unregistered payment refund' },
      { status: 500 }
    );
  }
}
