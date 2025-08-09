import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
    const body = await request.json();
    
    console.log('🎟️ Frontend: Validating coupon:', body.couponCode);
    
    const response = await fetch(`${backendUrl}/forms/coupons/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Backend coupon validation failed:', errorData);
      return NextResponse.json(
        { success: false, error: 'Failed to validate coupon' },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('✅ Frontend: Coupon validation result:', data.valid);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error validating coupon:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
} 