import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
    console.log('API route: forwarding major options request to backend at:', backendUrl);
    
    const response = await fetch(`${backendUrl}/users/majors`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    console.log('API route: major options backend response status:', response.status);
    console.log('API route: major options backend response data:', data);

    if (response.ok) {
      return NextResponse.json(data);
    } else {
      return NextResponse.json(
        { detail: data.detail || 'Failed to get major options' },
        { status: response.status }
      );
    }
  } catch (error) {
    console.error('API route: major options error:', error);
    return NextResponse.json(
      { detail: 'Internal server error' },
      { status: 500 }
    );
  }
} 