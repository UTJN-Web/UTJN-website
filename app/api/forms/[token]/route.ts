import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
    const { token } = await params;
    
    console.log('📝 Frontend: Getting public form by token:', token);
    
    const response = await fetch(`${backendUrl}/forms/public/${token}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Backend public form fetch failed:', errorData);
      return NextResponse.json(
        { success: false, error: 'Form not found or not accessible' },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('✅ Frontend: Public form fetched successfully. Field sample:', data?.form?.fields?.[0]);
    console.log('🔍 Full form fields:', JSON.stringify(data?.form?.fields, null, 2));
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching public form:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
} 