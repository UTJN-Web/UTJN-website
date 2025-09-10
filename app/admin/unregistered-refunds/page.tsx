'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { CheckCircle, XCircle, Clock, DollarSign, User, Calendar, FileText, Mail, AlertTriangle } from 'lucide-react';
import Toast from '@/app/components/Toast';

interface UnregisteredPayment {
  id: string;
  paymentId: string;
  email: string;
  amount: number;
  currency: string;
  customerId: string;
  orderId: string;
  createdAt: string;
  status: 'pending' | 'refunded' | 'failed';
  refundId?: string;
  refundDate?: string;
  adminNotes?: string;
}

export default function AdminUnregisteredRefundsPage() {
  const [unregisteredPayments, setUnregisteredPayments] = useState<UnregisteredPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'refunded' | 'failed'>('all');
  const [processing, setProcessing] = useState<string | null>(null);
  const [searchLoading, setSearchLoading] = useState(false); // 検索中のローディング状態
  
  // Toast state
  const [toast, setToast] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'success' | 'error' | 'warning';
  }>({ isOpen: false, title: '', message: '', type: 'success' });

  // Search state
  const [searchEmail, setSearchEmail] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Fetch unregistered payments data from API
  useEffect(() => {
    // 初期表示時は空の状態で表示（全ユーザー検索は実行しない）
    setLoading(false);
    setUnregisteredPayments([]);
  }, []);

  const fetchUnregisteredPayments = async () => {
    try {
      setLoading(true);
      console.log('🔍 Fetching unregistered payments...');
      
      // Build query parameters for date range
      const params = new URLSearchParams();
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
      
      const url = params.toString() ? `/api/admin/unregistered-refunds?${params.toString()}` : '/api/admin/unregistered-refunds';
      console.log(`🔗 Search All Users URL: ${url}`);
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('Failed to fetch unregistered payments');
      }

      const data = await response.json();
      // Transform the data to match our interface
      const transformedPayments: UnregisteredPayment[] = (data.unregisteredRefunds || []).map((payment: any) => ({
        id: payment.id.toString(),
        paymentId: payment.paymentId,
        email: payment.email,
        amount: payment.amount,
        currency: payment.currency || 'CAD',
        customerId: payment.customerId,
        orderId: payment.orderId,
        createdAt: payment.createdAt,
        status: payment.status as 'pending' | 'refunded' | 'failed',
        refundId: payment.refundId,
        refundDate: payment.refundDate,
        adminNotes: payment.adminNotes
      }));

      console.log(`✅ Set ${transformedPayments.length} unregistered payments to state`);
      setUnregisteredPayments(transformedPayments);
    } catch (error) {
      console.error('Error fetching unregistered payments:', error);
      // Fallback to empty array on error
      setUnregisteredPayments([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setSearchLoading(true); // 検索開始時にLoading開始
    
    // Build query parameters
    const params = new URLSearchParams();
    if (searchEmail) params.append('email', searchEmail);
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    
    const url = params.toString() ? `/api/admin/unregistered-refunds?${params.toString()}` : '/api/admin/unregistered-refunds';
    console.log(`🔗 Searching with URL: ${url}`);
    
    // Fetch with search parameters
    fetch(url)
      .then(response => response.json())
      .then(data => {
        const transformedPayments: UnregisteredPayment[] = data.unregisteredRefunds.map((payment: any) => ({
          id: payment.id.toString(),
          paymentId: payment.paymentId,
          email: payment.email,
          amount: payment.amount,
          currency: payment.currency || 'CAD',
          customerId: payment.customerId,
          orderId: payment.orderId,
          createdAt: payment.createdAt,
          status: payment.status as 'pending' | 'refunded' | 'failed',
          refundId: payment.refundId,
          refundDate: payment.refundDate,
          adminNotes: payment.adminNotes
        }));
        
        // Check if any payments are already refunded and update their status
        const updatedPayments = transformedPayments.map(payment => {
          // If payment has refundId, it should be marked as refunded
          if (payment.refundId && payment.status === 'pending') {
            return { ...payment, status: 'refunded' as const };
          }
          return payment;
        });
        
        setUnregisteredPayments(updatedPayments);
      })
      .catch(error => {
        console.error('Error searching unregistered payments:', error);
        showToast('Search Failed', 'Failed to search unregistered payments', 'error');
      })
      .finally(() => {
        setSearchLoading(false); // 検索完了時にLoading終了
      });
  };

  const handleClearSearch = () => {
    setSearchEmail('');
    setStartDate('');
    setEndDate('');
    fetchUnregisteredPayments();
  };

  const filteredPayments = unregisteredPayments.filter(payment => {
    if (filter === 'all') return true;
    return payment.status === filter;
  });

  const showToast = (title: string, message: string, type: 'success' | 'error' | 'warning') => {
    setToast({ isOpen: true, title, message, type });
  };

  const closeToast = () => {
    setToast(prev => ({ ...prev, isOpen: false }));
  };

  const handleRefundAction = async (paymentId: string, adminNotes?: string) => {
    setProcessing(paymentId);
    
    try {
      console.log(`💰 Processing refund for unregistered payment ${paymentId}`);
      
      // Get the payment details
      const payment = unregisteredPayments.find(p => p.paymentId === paymentId);
      if (!payment) {
        throw new Error('Payment not found');
      }
      
      const response = await fetch('/api/admin/unregistered-refunds', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentId: payment.paymentId,
          amount: payment.amount,
          currency: payment.currency,
          customerId: payment.customerId,
          orderId: payment.orderId,
          createdAt: payment.createdAt,
          email: payment.email
        })
      });

      if (!response.ok) {
        throw new Error('Failed to process refund');
      }

      const result = await response.json();
      console.log(`✅ Unregistered payment refund ${paymentId} processed successfully`);

      // Try to send email notification
      let emailSent = false;
      let emailError = null;
      
      try {
        const emailResponse = await fetch('/api/refund-email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: payment.email,
            event_name: 'Failed Registration',
            amount: payment.amount,
            currency: payment.currency,
            status: 'approved',
            adminNotes: adminNotes || 'Refund processed for failed registration'
          })
        });

        if (emailResponse.ok) {
          emailSent = true;
          console.log('📧 Unregistered payment refund notification email sent successfully');
        } else {
          const emailData = await emailResponse.json().catch(() => ({}));
          emailError = emailData.detail || 'Failed to send email';
          console.error('📧 Email sending failed:', emailError);
        }
      } catch (emailErr: any) {
        console.error('📧 Email error:', emailErr);
        emailError = emailErr.message || 'Failed to send email';
      }

      // Update local state to reflect the change
      setUnregisteredPayments(prev => prev.map(payment => 
        payment.paymentId === paymentId 
          ? { 
              ...payment, 
              status: 'refunded',
              refundDate: new Date().toISOString(),
              refundId: result.refundId,
              adminNotes: adminNotes || 'Refund processed for failed registration'
            }
          : payment
      ));

      // Show success toast with email status
      if (emailSent) {
        showToast(
          'Refund Processed Successfully',
          `Refund processed and notification email sent to ${payment.email}`,
          'success'
        );
      } else {
        showToast(
          'Refund Processed Successfully',
          `Refund processed but email notification failed: ${emailError}`,
          'warning'
        );
      }

    } catch (error) {
      console.error(`Error processing refund:`, error);
      showToast(
        'Refund Processing Failed',
        `Failed to process refund. Please try again.`,
        'error'
      );
    } finally {
      setProcessing(null);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-5 h-5 text-amber-600" />;
      case 'refunded':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-600" />;
      default:
        return <AlertTriangle className="w-5 h-5 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'refunded':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'failed':
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
          <h2 className="text-2xl font-bold text-[#1c2a52] mb-2">Loading Unregistered Payments</h2>
          <p className="text-gray-600">Please wait while we fetch unregistered payments...</p>
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
              <h1 className="text-4xl font-bold text-[#1c2a52] mb-2">Unregistered Refunds</h1>
              <p className="text-gray-700 text-lg">Handle payments that succeeded but registration failed</p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white bg-opacity-95 rounded-lg p-6 shadow-lg border border-gray-200 backdrop-blur-sm">
              <div className="text-center">
                <p className="text-sm font-medium text-gray-600">Total Payments</p>
                <p className="text-2xl font-bold text-[#1c2a52]">{unregisteredPayments.length}</p>
              </div>
            </div>
            <div className="bg-white bg-opacity-95 rounded-lg p-6 shadow-lg border border-gray-200 backdrop-blur-sm">
              <div className="text-center">
                <p className="text-sm font-medium text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-[#1c2a52]">
                  {unregisteredPayments.filter(p => p.status === 'pending').length}
                </p>
              </div>
            </div>
            <div className="bg-white bg-opacity-95 rounded-lg p-6 shadow-lg border border-gray-200 backdrop-blur-sm">
              <div className="text-center">
                <p className="text-sm font-medium text-gray-600">Refunded</p>
                <p className="text-2xl font-bold text-[#1c2a52]">
                  {unregisteredPayments.filter(p => p.status === 'refunded').length}
                </p>
              </div>
            </div>
            <div className="bg-white bg-opacity-95 rounded-lg p-6 shadow-lg border border-gray-200 backdrop-blur-sm">
              <div className="text-center">
                <p className="text-sm font-medium text-gray-600">Failed</p>
                <p className="text-2xl font-bold text-[#1c2a52]">
                  {unregisteredPayments.filter(p => p.status === 'failed').length}
                </p>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-lg shadow-sm border mb-6">
            <div className="p-6">
              <div className="flex gap-4">
                {['all', 'pending', 'refunded', 'failed'].map((status) => (
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
                        {unregisteredPayments.filter(p => p.status === status).length}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Search Section */}
          <div className="bg-white rounded-lg shadow-sm border mb-6">
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Search Unregistered Payments</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={searchEmail}
                    onChange={(e) => setSearchEmail(e.target.value)}
                    placeholder="Enter email to search"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-2">
                    Start Date
                  </label>
                  <input
                    type="date"
                    id="startDate"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-2">
                    End Date
                  </label>
                  <input
                    type="date"
                    id="endDate"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div className="flex items-end gap-2">
                  <button
                    onClick={handleSearch}
                    disabled={searchLoading} // 検索中は無効化
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
                  >
                    {searchLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Searching...
                      </>
                    ) : (
                      'Search'
                    )}
                  </button>
                  <button
                    onClick={handleClearSearch}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                  >
                    Clear
                  </button>
                </div>
              </div>
              {/* Search All Users Button */}
              <div className="flex justify-center mt-4">
                <button
                  onClick={fetchUnregisteredPayments}
                  className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                  title="⚠️ 重い処理です。特定のメールアドレスでの検索を推奨します。"
                >
                  🔍 Search All Users (Heavy Operation)
                </button>
              </div>
              
              {/* Warning Message */}
              <div className="mt-2 text-center">
                <p className="text-sm text-orange-600">
                  ⚠️ 全ユーザー検索は重い処理です。期間を指定して検索範囲を絞ることを推奨します。
                  <br />
                  詳細な情報が必要な場合は、特定のメールアドレスで検索してください。
                </p>
              </div>
              <div className="mt-3 text-sm text-gray-500">
                💡 <strong>Tip:</strong> Enter a specific email for fast search, or use "Search All Users" to find all unregistered payments.
                {startDate && endDate && (
                  <div className="mt-2 text-blue-600">
                    📅 Search period: {startDate} to {endDate}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Unregistered Payments */}
          <div className="space-y-6">
            {filteredPayments.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm border p-12 text-center">
                <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No unregistered payments</h3>
                <p className="text-gray-500">No unregistered payments found for the selected filter.</p>
              </div>
            ) : (
              filteredPayments.map((payment) => (
                <div key={payment.id} className="bg-white rounded-lg shadow-sm border p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-4">
                      <div className="p-2 bg-gray-100 rounded-lg">
                        <AlertTriangle className="w-6 h-6 text-gray-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">
                          Failed Registration Payment
                        </h3>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <Mail className="w-4 h-4" />
                            {payment.email}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {new Date(payment.createdAt).toLocaleDateString()}
                          </span>
                          <span className="flex items-center gap-1">
                            <FileText className="w-4 h-4" />
                            {payment.paymentId}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xl font-bold text-gray-900">
                        {payment.currency} ${payment.amount.toFixed(2)}
                      </span>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium border flex items-center gap-1 ${getStatusColor(payment.status)}`}>
                        {getStatusIcon(payment.status)}
                        {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                      </span>
                    </div>
                  </div>

                  <div className="mb-4 p-4 bg-red-50 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-red-700 mb-1">Issue:</p>
                        <p className="text-sm text-red-600">Payment succeeded but registration failed. User paid but cannot attend the event.</p>
                      </div>
                    </div>
                  </div>

                  {payment.adminNotes && (
                    <div className="mb-4 p-4 bg-blue-50 rounded-lg">
                      <p className="text-sm font-medium text-blue-700 mb-1">Admin Notes:</p>
                      <p className="text-sm text-blue-600">{payment.adminNotes}</p>
                    </div>
                  )}

                  {payment.status === 'pending' && (
                    <div className="flex gap-3 pt-4 border-t">
                      <button
                        onClick={() => handleRefundAction(payment.paymentId, 'Refund processed for failed registration')}
                        disabled={processing === payment.paymentId}
                        className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {processing === payment.paymentId ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            Processing...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-4 h-4" />
                            Process Refund
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {payment.status === 'refunded' && (
                    <div className="pt-4 border-t">
                      <div className="flex items-center gap-2 text-green-600">
                        <CheckCircle className="w-5 h-5" />
                        <span className="font-medium">Refund Processed Successfully</span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        This payment has been refunded and no further action is required.
                      </p>
                      {payment.refundDate && (
                        <p className="text-xs text-gray-500 mt-2">
                          Refunded on {new Date(payment.refundDate).toLocaleString()}
                          {payment.refundId && ` (Refund ID: ${payment.refundId})`}
                        </p>
                      )}
                    </div>
                  )}

                  {payment.refundDate && payment.status !== 'refunded' && (
                    <div className="pt-4 border-t">
                      <p className="text-xs text-gray-500">
                        Refunded on {new Date(payment.refundDate).toLocaleString()}
                        {payment.refundId && ` (Refund ID: ${payment.refundId})`}
                      </p>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      <Toast
        isOpen={toast.isOpen}
        onClose={closeToast}
        title={toast.title}
        message={toast.message}
        type={toast.type}
      />
    </div>
  );
}
