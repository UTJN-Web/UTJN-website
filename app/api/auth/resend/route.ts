import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
    console.log('API route: forwarding resend to backend at:', backendUrl);
    
    const response = await fetch(`${backendUrl}/auth/resend`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    console.log('API route: resend backend response status:', response.status);
    console.log('API route: resend backend response data:', data);

    if (response.ok) {
      return NextResponse.json(data);
    } else {
      return NextResponse.json(
        { detail: data.detail || 'Resend failed' },
        { status: response.status }
      );
    }
  } catch (error) {
    console.error('API route: resend error:', error);
    return NextResponse.json(
      { detail: 'Internal server error' },
      { status: 500 }
    );
  }
} 