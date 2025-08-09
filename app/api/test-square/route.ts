import { NextRequest, NextResponse } from 'next/server';
import { squareClient } from '@/lib/square';

export async function GET(request: NextRequest) {
  try {
    console.log('Testing Square connection...');
    console.log('Environment check:', {
      accessToken: process.env.SQUARE_ACCESS_TOKEN ? 'present' : 'missing',
      nodeEnv: process.env.NODE_ENV
    });

    // Test Square connection by listing locations
    const locationsApi = squareClient.locations;
    const { result } = await locationsApi.list();

    console.log('Square connection successful:', {
      locationsCount: result.locations?.length || 0,
      environment: process.env.NODE_ENV === 'production' ? 'production' : 'sandbox'
    });

    return NextResponse.json({
      success: true,
      message: 'Square connection successful',
      locationsCount: result.locations?.length || 0,
      environment: process.env.NODE_ENV === 'production' ? 'production' : 'sandbox',
      locations: result.locations?.map((loc: any) => ({
        id: loc.id,
        name: loc.name,
        status: loc.status
      }))
    });
  } catch (error: any) {
    console.error('Square connection failed:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Square connection failed',
      details: error
    }, { status: 500 });
  }
} 