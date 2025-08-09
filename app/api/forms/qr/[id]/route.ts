import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
    const { id: formId } = await params;
    
    console.log('📱 Frontend: Getting QR code data for form:', formId);
    
    const response = await fetch(`${backendUrl}/forms/${formId}/qr`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Backend QR code generation failed:', errorData);
      return NextResponse.json(
        { success: false, error: 'Failed to generate QR code data' },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('✅ Frontend: QR code data generated successfully');
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error generating QR code data:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
} 