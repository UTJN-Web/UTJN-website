import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
    const { token } = await params;
    const body = await request.json();
    
    console.log('📝 Frontend: Submitting public form via token:', token);
    
    const response = await fetch(`${backendUrl}/forms/public/${token}/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch {
        errorData = await response.text();
      }
      
      console.error('Backend public form submission failed:', errorData);
      
      // Handle specific error cases
      if (response.status === 409) {
        return NextResponse.json(
          { success: false, error: errorData.detail || 'You have already submitted this form', alreadySubmitted: true },
          { status: 409 }
        );
      }
      
      return NextResponse.json(
        { success: false, error: errorData.detail || 'Failed to submit form' },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('✅ Frontend: Public form submission successful');
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error submitting public form:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
} 