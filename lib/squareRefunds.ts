// lib/squareRefunds.ts - Square refund processing module
import { squareClient } from './square';

interface RefundRequest {
  paymentId: string;
  amount: number;
  currency: string;
  reason?: string;
}

interface RefundResult {
  success: boolean;
  refundId?: string;
  error?: string;
  details?: any;
}

export async function processSquareRefund(refundRequest: RefundRequest): Promise<RefundResult> {
  try {
    console.log('🔁 Processing Square refund:', refundRequest);

    // Generate unique idempotency key for refund
    const idempotencyKey = `refund_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const refundData = {
      idempotency_key: idempotencyKey,
      payment_id: refundRequest.paymentId,
      amount_money: {
        amount: Math.round(refundRequest.amount * 100), // Convert to cents
        currency: refundRequest.currency.toUpperCase()
      },
      reason: refundRequest.reason || 'Event cancellation refund'
    };

    console.log('Square refund request:', JSON.stringify(refundData, null, 2));

    // Process refund with Square API
    const { result } = await squareClient.refunds.create(refundData);

    if (result && result.refund) {
      console.log('✅ Square refund successful:', {
        refundId: result.refund.id,
        status: result.refund.status,
        amount: result.refund.amount_money
      });

      return {
        success: true,
        refundId: result.refund.id,
        details: result.refund
      };
    } else {
      console.error('❌ Square refund failed: No refund result returned');
      return {
        success: false,
        error: 'No refund result returned from Square'
      };
    }

  } catch (error: any) {
    console.error('❌ Square refund error:', error);
    console.error('Error details:', JSON.stringify(error, null, 2));

    // Handle specific Square API errors
    if (error.errors && Array.isArray(error.errors)) {
      const errorMessages = error.errors.map((err: any) => err.detail || err.code || err.category).join(', ');
      console.error('Square API refund errors:', errorMessages);
      return {
        success: false,
        error: `Square refund failed: ${errorMessages}`
      };
    }

    return {
      success: false,
      error: `Refund processing failed: ${error.message || 'Unknown error'}`
    };
  }
}

export async function getSquareRefundStatus(refundId: string): Promise<any> {
  try {
    console.log('📋 Getting Square refund status for:', refundId);
    
    const { result } = await squareClient.refunds.get(refundId);
    
    if (result && result.refund) {
      console.log('✅ Square refund status retrieved:', {
        id: result.refund.id,
        status: result.refund.status,
        amount: result.refund.amount_money
      });
      
      return result.refund;
    } else {
      throw new Error('No refund data returned');
    }

  } catch (error: any) {
    console.error('❌ Error getting Square refund status:', error);
    throw new Error(`Failed to get refund status: ${error.message || 'Unknown error'}`);
  }
} 