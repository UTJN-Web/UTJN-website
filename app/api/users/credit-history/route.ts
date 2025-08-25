import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
    
    const response = await fetch(`${backendUrl}/forms/users/${userId}/credits`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Backend credit history fetch failed:', errorData);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch credit history' },
        { status: response.status }
      );
    }

    const data = await response.json();
    // Extract just the history from the response
    return NextResponse.json({
      success: true,
      history: data.history || []
    });
  } catch (error) {
    console.error('Error fetching credit history:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
} 