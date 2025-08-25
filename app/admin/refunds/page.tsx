'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { CheckCircle, XCircle, Clock, DollarSign, User, Calendar, FileText } from 'lucide-react';

interface RefundRequest {
  id: string;
  eventId: string;
  eventName: string;
  userId: number;
  email: string;
  amount: number;
  currency: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  requestDate: string;
  processedDate?: string;
  adminNotes?: string;
}

export default function AdminRefundsPage() {
  const [refunds, setRefunds] = useState<RefundRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [processing, setProcessing] = useState<string | null>(null);

  // Fetch real refund data from API
  useEffect(() => {
    fetchRefunds();
  }, []);

  const fetchRefunds = async () => {
    try {
      setLoading(true);
      console.log('📝 Fetching refund requests...');
      
      const response = await fetch('/api/admin/refunds');
      
      if (!response.ok) {
        throw new Error('Failed to fetch refund requests');
      }

      const data = await response.json();
      console.log('✅ Refund requests fetched:', data);
      
      // Transform the data to match our interface
      const transformedRefunds: RefundRequest[] = data.refunds.map((refund: any) => ({
        id: refund.id.toString(),
        eventId: refund.eventId.toString(),
        eventName: refund.eventName || 'Unknown Event',
        userId: refund.userId,
        email: refund.email,
        amount: refund.amount,
        currency: refund.currency || 'CAD',
        reason: refund.reason || 'No reason provided',
        status: refund.status as 'pending' | 'approved' | 'rejected',
        requestDate: refund.requestDate,
        processedDate: refund.processedDate,
        adminNotes: refund.adminNotes
      }));

      setRefunds(transformedRefunds);
    } catch (error) {
      console.error('Error fetching refunds:', error);
      // Fallback to empty array on error
      setRefunds([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredRefunds = refunds.filter(refund => {
    if (filter === 'all') return true;
    return refund.status === filter;
  });

  const handleRefundAction = async (refundId: string, action: 'approve' | 'reject', adminNotes?: string) => {
    setProcessing(refundId);
    
    try {
      console.log(`🔄 ${action === 'approve' ? 'Approving' : 'Rejecting'} refund ${refundId}`);
      
      const response = await fetch('/api/admin/refunds', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          refundId: parseInt(refundId),
          status: action === 'approve' ? 'approved' : 'rejected',
          adminNotes: adminNotes || `${action === 'approve' ? 'Approved' : 'Rejected'} by admin`,
          processedBy: 'Admin'
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update refund status');
      }

      const result = await response.json();
      console.log(`✅ Refund ${refundId} ${action}d successfully`);

      if (action === 'approve' && result.paymentProcessed) {
        console.log('💰 Square payment refund was processed automatically');
      } else if (action === 'approve' && !result.paymentProcessed) {
        console.log('⚠️ Manual refund required - no payment ID found');
      }

      // Update local state to reflect the change
      setRefunds(prev => prev.map(refund => 
        refund.id === refundId 
          ? { 
              ...refund, 
              status: action === 'approve' ? 'approved' : 'rejected',
              processedDate: new Date().toISOString(),
              adminNotes: adminNotes || `${action === 'approve' ? 'Approved' : 'Rejected'} by admin`
            }
          : refund
      ));

    } catch (error) {
      console.error(`Error ${action}ing refund:`, error);
      alert(`Failed to ${action} refund. Please try again.`);
    } finally {
      setProcessing(null);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-5 h-5 text-amber-600" />;
      case 'approved':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'rejected':
        return <XCircle className="w-5 h-5 text-red-600" />;
      default:
        return <Clock className="w-5 h-5 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'approved':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div
        className="relative min-h-screen w-full flex items-center justify-center"
        style={{
          backgroundImage: "url('/UofT.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      >
        {/* Dark faded overlay */}
        <div className="absolute inset-0 bg-black opacity-20 z-0" />

        {/* Loading content */}
        <div className="relative z-10 w-full max-w-md bg-white bg-opacity-95 p-8 rounded shadow-lg backdrop-blur-sm text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-[#1c2a52] border-t-transparent mx-auto mb-6"></div>
          <h2 className="text-2xl font-bold text-[#1c2a52] mb-2">Loading Refunds</h2>
          <p className="text-gray-600">Please wait while we fetch refund requests...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative min-h-screen w-full"
      style={{
        backgroundImage: "url('/UofT.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      {/* Dark faded overlay */}
      <div className="absolute inset-0 bg-black opacity-20 z-0" />

      {/* Content */}
      <div className="relative z-10 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-4">
              <Link 
                href="/admin"
                className="text-sm text-gray-700 hover:text-[#1c2a52] flex items-center gap-1 transition-colors"
              >
                ← Back to Admin Dashboard
              </Link>
            </div>
            <div className="text-center">
              <h1 className="text-4xl font-bold text-[#1c2a52] mb-2">Refund Management</h1>
              <p className="text-gray-700 text-lg">Manage user refund requests for paid events</p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white bg-opacity-95 rounded-lg p-6 shadow-lg border border-gray-200 backdrop-blur-sm">
              <div className="text-center">
                <p className="text-sm font-medium text-gray-600">Total Requests</p>
                <p className="text-2xl font-bold text-[#1c2a52]">{refunds.length}</p>
              </div>
            </div>
            <div className="bg-white bg-opacity-95 rounded-lg p-6 shadow-lg border border-gray-200 backdrop-blur-sm">
              <div className="text-center">
                <p className="text-sm font-medium text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-[#1c2a52]">
                  {refunds.filter(r => r.status === 'pending').length}
                </p>
              </div>
            </div>
            <div className="bg-white bg-opacity-95 rounded-lg p-6 shadow-lg border border-gray-200 backdrop-blur-sm">
              <div className="text-center">
                <p className="text-sm font-medium text-gray-600">Approved</p>
                <p className="text-2xl font-bold text-[#1c2a52]">
                  {refunds.filter(r => r.status === 'approved').length}
                </p>
              </div>
            </div>
            <div className="bg-white bg-opacity-95 rounded-lg p-6 shadow-lg border border-gray-200 backdrop-blur-sm">
              <div className="text-center">
                <p className="text-sm font-medium text-gray-600">Rejected</p>
                <p className="text-2xl font-bold text-[#1c2a52]">
                  {refunds.filter(r => r.status === 'rejected').length}
                </p>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-lg shadow-sm border mb-6">
            <div className="p-6">
              <div className="flex gap-4">
                {['all', 'pending', 'approved', 'rejected'].map((status) => (
                  <button
                    key={status}
                    onClick={() => setFilter(status as any)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      filter === status
                        ? 'bg-blue-100 text-blue-700 border border-blue-200'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                    {status !== 'all' && (
                      <span className="ml-2 px-2 py-0.5 rounded-full bg-gray-200 text-xs">
                        {refunds.filter(r => r.status === status).length}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Refund Requests */}
          <div className="space-y-6">
            {filteredRefunds.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm border p-12 text-center">
                <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No refund requests</h3>
                <p className="text-gray-500">No refund requests found for the selected filter.</p>
              </div>
            ) : (
              filteredRefunds.map((refund) => (
                <div key={refund.id} className="bg-white rounded-lg shadow-sm border p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-4">
                      <div className="p-2 bg-gray-100 rounded-lg">
                        <DollarSign className="w-6 h-6 text-gray-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">
                          {refund.eventName}
                        </h3>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <User className="w-4 h-4" />
                            {refund.email}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {new Date(refund.requestDate).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xl font-bold text-gray-900">
                        {refund.currency} ${refund.amount.toFixed(2)}
                      </span>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium border flex items-center gap-1 ${getStatusColor(refund.status)}`}>
                        {getStatusIcon(refund.status)}
                        {refund.status.charAt(0).toUpperCase() + refund.status.slice(1)}
                      </span>
                    </div>
                  </div>

                  {refund.reason && (
                    <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-start gap-2">
                        <FileText className="w-4 h-4 text-gray-500 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-gray-700 mb-1">Reason:</p>
                          <p className="text-sm text-gray-600">{refund.reason}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {refund.adminNotes && (
                    <div className="mb-4 p-4 bg-blue-50 rounded-lg">
                      <p className="text-sm font-medium text-blue-700 mb-1">Admin Notes:</p>
                      <p className="text-sm text-blue-600">{refund.adminNotes}</p>
                    </div>
                  )}

                  {refund.status === 'pending' && (
                    <div className="flex gap-3 pt-4 border-t">
                      <button
                        onClick={() => handleRefundAction(refund.id, 'approve', 'Approved by admin')}
                        disabled={processing === refund.id}
                        className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {processing === refund.id ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            Processing...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-4 h-4" />
                            Approve Refund
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => handleRefundAction(refund.id, 'reject', 'Rejected by admin')}
                        disabled={processing === refund.id}
                        className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        <XCircle className="w-4 h-4" />
                        Reject Refund
                      </button>
                    </div>
                  )}

                  {refund.processedDate && (
                    <div className="pt-4 border-t">
                      <p className="text-xs text-gray-500">
                        Processed on {new Date(refund.processedDate).toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 