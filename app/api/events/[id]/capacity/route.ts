import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    console.log('Checking capacity for event:', id);

    // Call backend to get event capacity
    const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/events/${id}/capacity`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('Backend capacity check failed:', response.status, response.statusText);
      return NextResponse.json(
        { success: false, error: 'Failed to check event capacity' },
        { status: 500 }
      );
    }

    const capacityData = await response.json();
    
    console.log('Event capacity data:', capacityData);

    return NextResponse.json({
      success: true,
      availableCapacity: capacityData.availableCapacity || 0,
      totalCapacity: capacityData.totalCapacity || 0
    });

  } catch (error) {
    console.error('Error checking event capacity:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
