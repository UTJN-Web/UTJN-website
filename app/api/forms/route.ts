import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
    
    const response = await fetch(`${backendUrl}/forms/coupons`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Backend coupons fetch failed:', errorData);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch coupons from backend' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in forms API:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
    const body = await request.json();
    
    // Determine if this is a form or coupon creation based on the presence of certain fields
    const endpoint = body.code && body.discountType ? 'forms/coupons' : 'forms';
    
    const response = await fetch(`${backendUrl}/${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error(`Backend ${endpoint} creation failed:`, errorData);
      return NextResponse.json(
        { success: false, error: `Failed to create ${endpoint.includes('coupon') ? 'coupon' : 'form'}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error creating resource:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
} 