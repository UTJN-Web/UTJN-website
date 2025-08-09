import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
    const body = await request.json();
    
    console.log('📝 Frontend: Submitting form data:', { 
      formId: body.formId, 
      userId: body.userId, 
      responseCount: body.responses?.length 
    });
    
    const response = await fetch(`${backendUrl}/forms/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Backend form submission failed:', errorData);
      return NextResponse.json(
        { success: false, error: 'Failed to submit form' },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('✅ Frontend: Form submission successful');
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error submitting form:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
} 