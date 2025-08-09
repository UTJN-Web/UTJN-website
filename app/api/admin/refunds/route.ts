import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    console.log('📝 Admin fetching refund requests...');

    // Get refund requests from backend
    const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/refunds`);
    
    if (!response.ok) {
      const errorData = await response.text();
      console.error('Backend refund fetch failed:', errorData);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch refund requests from database' },
        { status: 500 }
      );
    }

    const data = await response.json();
    console.log(`✅ Retrieved ${data.count} refund requests from backend`);

    return NextResponse.json({
      success: true,
      refunds: data.refunds,
      count: data.count
    });

  } catch (error) {
    console.error('Error fetching refund requests:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error during refund fetch' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { refundId, status, adminNotes, processedBy } = await request.json();

    console.log(`🔄 Admin updating refund ${refundId} to ${status}`);

    if (!refundId || !status) {
      return NextResponse.json(
        { success: false, error: 'Refund ID and status are required' },
        { status: 400 }
      );
    }

    if (!['approved', 'rejected'].includes(status)) {
      return NextResponse.json(
        { success: false, error: 'Status must be approved or rejected' },
        { status: 400 }
      );
    }

    // Update refund status in backend
    const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/refunds/${refundId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        status: status,
        adminNotes: adminNotes || `${status === 'approved' ? 'Approved' : 'Rejected'} by admin`,
        processedBy: processedBy || 'Admin'
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Backend refund update failed:', errorData);
      return NextResponse.json(
        { success: false, error: 'Failed to update refund status' },
        { status: 500 }
      );
    }

    const result = await response.json();
    console.log(`✅ Refund ${refundId} status updated to ${status}`);

    return NextResponse.json({
      success: true,
      message: result.message,
      refundId: refundId,
      status: status
    });

  } catch (error) {
    console.error('Error updating refund status:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error during refund update' },
      { status: 500 }
    );
  }
} 