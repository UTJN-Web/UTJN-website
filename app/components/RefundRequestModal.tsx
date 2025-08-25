'use client';

import { useState } from 'react';
import { X, DollarSign, AlertCircle } from 'lucide-react';

interface RefundRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => void;
  eventName: string;
  amount: number;
  currency?: string;
  loading?: boolean;
}

export default function RefundRequestModal({
  isOpen,
  onClose,
  onSubmit,
  eventName,
  amount,
  currency = 'CAD',
  loading = false
}: RefundRequestModalProps) {
  const [reason, setReason] = useState('');

  if (!isOpen) return null;

  const handleSubmit = () => {
    onSubmit(reason.trim() || 'Event cancellation');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full transform transition-all">
          {/* Close button */}
          <button
            onClick={onClose}
            disabled={loading}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Content */}
          <div className="p-6">
            {/* Icon */}
            <div className="w-16 h-16 mx-auto mb-4 bg-orange-50 border border-orange-200 rounded-full flex items-center justify-center">
              <DollarSign className="w-8 h-8 text-orange-600" />
            </div>

            {/* Title */}
            <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">
              Refund Request
            </h3>

            {/* Event Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <div className="text-center">
                <p className="text-sm font-medium text-blue-900 mb-1">Event:</p>
                <p className="text-sm text-blue-800 mb-2">{eventName}</p>
                <p className="text-lg font-bold text-blue-900">
                  {currency} ${amount.toFixed(2)}
                </p>
              </div>
            </div>

            {/* Info Message */}
            <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
              <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-amber-800">
                <p className="font-medium mb-1">Refund Policy</p>
                <p>Your refund request will be reviewed by our admin team. Processing may take 3-5 business days.</p>
              </div>
            </div>

            {/* Reason Input */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason for cancellation (optional)
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Please provide a reason for your cancellation..."
                disabled={loading}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 resize-none disabled:opacity-50"
                rows={3}
                maxLength={500}
              />
              <p className="text-xs text-gray-500 mt-1">{reason.length}/500 characters</p>
            </div>

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                onClick={onClose}
                disabled={loading}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Submitting...
                  </>
                ) : (
                  'Submit Refund Request'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 