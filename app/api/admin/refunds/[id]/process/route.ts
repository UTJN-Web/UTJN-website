import { NextRequest, NextResponse } from 'next/server';
import { processSquareRefund } from '@/lib/squareRefunds';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { paymentId, amount, currency, reason } = await request.json();

    console.log(`💰 Processing Square refund for refund request ${id}`);

    if (!paymentId || !amount || !currency) {
      return NextResponse.json(
        { success: false, error: 'Payment ID, amount, and currency are required' },
        { status: 400 }
      );
    }

    // Process the refund with Square
    const refundResult = await processSquareRefund({
      paymentId: paymentId,
      amount: amount,
      currency: currency,
      reason: reason || 'Event cancellation refund'
    });

    if (refundResult.success) {
      console.log(`✅ Square refund processed successfully: ${refundResult.refundId}`);
      
      return NextResponse.json({
        success: true,
        message: 'Refund processed successfully',
        refundId: refundResult.refundId,
        squareRefundDetails: refundResult.details
      });
    } else {
      console.error(`❌ Square refund failed: ${refundResult.error}`);
      
      return NextResponse.json(
        { 
          success: false, 
          error: refundResult.error || 'Refund processing failed'
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Error processing Square refund:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error during refund processing' },
      { status: 500 }
    );
  }
} 