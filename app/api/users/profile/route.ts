import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
    console.log('API route: forwarding user profile creation to backend at:', backendUrl);
    
    const response = await fetch(`${backendUrl}/users/profile`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    console.log('API route: user profile backend response status:', response.status);
    console.log('API route: user profile backend response data:', data);

    if (response.ok) {
      return NextResponse.json(data);
    } else {
      return NextResponse.json(
        { detail: data.detail || 'User profile creation failed' },
        { status: response.status }
      );
    }
  } catch (error) {
    console.error('API route: user profile creation error:', error);
    return NextResponse.json(
      { detail: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    
    if (!email) {
      return NextResponse.json(
        { detail: 'Email parameter is required' },
        { status: 400 }
      );
    }
    
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
    console.log('API route: forwarding user profile retrieval to backend at:', backendUrl);
    
    const response = await fetch(`${backendUrl}/users/profile/${email}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    console.log('API route: user profile retrieval backend response status:', response.status);
    console.log('API route: user profile retrieval backend response data:', data);

    if (response.ok) {
      return NextResponse.json(data);
    } else {
      return NextResponse.json(
        { detail: data.detail || 'User profile retrieval failed' },
        { status: response.status }
      );
    }
  } catch (error) {
    console.error('API route: user profile retrieval error:', error);
    return NextResponse.json(
      { detail: 'Internal server error' },
      { status: 500 }
    );
  }
} 