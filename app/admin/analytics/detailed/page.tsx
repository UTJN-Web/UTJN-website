'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Calendar, 
  Users, 
  DollarSign,
  Ticket,
  GraduationCap,
  RefreshCw,
  X,
  BarChart3,
  PieChart,
  TrendingUp,
  Eye
} from 'lucide-react';

interface DetailedAnalytics {
  eventId: string;
  eventName: string;
  eventDate: string;
  totalCapacity: number;
  totalRegistrations: number;
  ticketAnalysis: { [tierName: string]: { count: number; price: number } } | Array<{ name: string; count: number; price: number }>;
  yearLevelAnalysis: { [key: string]: number };
  refundAnalysis: { [key: number]: { count: number; users: string[] } };
  cancellationAnalysis: {
    totalCancellations: number;
    cancellationsByPrice: { [key: number]: number };
  };
}

export default function DetailedAnalyticsPage() {
  const [analytics, setAnalytics] = useState<DetailedAnalytics[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<DetailedAnalytics | null>(null);
  const [showRefundDetails, setShowRefundDetails] = useState(false);

  useEffect(() => {
    fetchDetailedAnalytics();
  }, []);

  const fetchDetailedAnalytics = async () => {
    try {
      const response = await fetch('/api/admin/analytics/detailed');
      if (response.ok) {
        const data = await response.json();
        setAnalytics(data.detailedAnalytics || []);
      } else {
        console.error('Failed to fetch detailed analytics');
      }
    } catch (error) {
      console.error('Error fetching detailed analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const calculateFillRate = (registrations: number, capacity: number) => {
    return capacity > 0 ? Math.round((registrations / capacity) * 100) : 0;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-lg text-gray-600">Loading detailed analytics...</p>
        </div>
      </div>
    );
  }

  return (
                <div className="min-h-screen w-full py-8 px-4 sm:px-6 lg:px-8" style={{
        backgroundImage: "url('/UofT.jpg')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed'
      }}>
        <div className="w-full max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link 
            href="/admin/analytics"
            className="inline-flex items-center text-gray-700 hover:text-[#1c2a52] mb-4"
          >
            <ArrowLeft size={20} className="mr-2" />
            Back to Analytics
          </Link>
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-[#1c2a52]">Detailed Event Analytics</h1>
              <p className="text-gray-700 mt-2">Detailed attendee analytics by ticket tier, year, and refunds</p>
            </div>
            <button
              onClick={fetchDetailedAnalytics}
              className="inline-flex items-center px-4 py-2 bg-[#1c2a52] text-white rounded-lg hover:bg-[#2a3c6b]"
            >
              <RefreshCw size={16} className="mr-2" />
              Refresh
            </button>
          </div>
        </div>

        {/* Event List */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
          {analytics.map((event) => (
            <div 
              key={event.eventId}
              className="bg-white bg-opacity-95 rounded-lg p-6 shadow-lg border border-gray-200 backdrop-blur-sm cursor-pointer hover:shadow-xl transition-shadow"
              onClick={() => setSelectedEvent(event)}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 truncate">{event.eventName}</h3>
                <Eye size={20} className="text-blue-600" />
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center text-sm text-gray-600">
                  <Calendar size={16} className="mr-2" />
                  {formatDate(event.eventDate)}
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Registrations</span>
                  <span className="font-semibold text-gray-900">
                    {event.totalRegistrations} / {event.totalCapacity}
                  </span>
                </div>
                
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full"
                    style={{ width: `${calculateFillRate(event.totalRegistrations, event.totalCapacity)}%` }}
                  />
                </div>
                
                <div className="text-xs text-gray-500 text-center">
                  {calculateFillRate(event.totalRegistrations, event.totalCapacity)}% fill rate
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Event Detail Modal */}
        {selectedEvent && (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4 z-50">
            <div className="bg-white bg-opacity-95 rounded-lg max-w-5xl w-full max-h-[90vh] overflow-y-auto border border-gray-200 backdrop-blur-sm">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">{selectedEvent.eventName}</h2>
                  <button
                    onClick={() => setSelectedEvent(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X size={24} />
                  </button>
                </div>

                {/* Event Overview */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="flex items-center">
                      <Users className="w-8 h-8 text-blue-600 mr-3" />
                      <div>
                        <p className="text-sm text-blue-600">Total registrations</p>
                        <p className="text-2xl font-bold text-blue-900">{selectedEvent.totalRegistrations}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="flex items-center">
                      <Ticket className="w-8 h-8 text-green-600 mr-3" />
                      <div>
                        <p className="text-sm text-green-600">Fill rate</p>
                        <p className="text-2xl font-bold text-green-900">
                          {calculateFillRate(selectedEvent.totalRegistrations, selectedEvent.totalCapacity)}%
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-red-50 p-4 rounded-lg">
                    <div className="flex items-center">
                      <RefreshCw className="w-8 h-8 text-red-600 mr-3" />
                      <div>
                        <p className="text-sm text-red-600">Refunds</p>
                        <p className="text-2xl font-bold text-red-900">
                          {Object.values(selectedEvent.refundAnalysis).reduce((sum: number, refund: any) => sum + refund.count, 0)}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-orange-50 p-4 rounded-lg">
                    <div className="flex items-center">
                      <X className="w-8 h-8 text-orange-600 mr-3" />
                      <div>
                        <p className="text-sm text-orange-600">Cancellations</p>
                        <p className="text-2xl font-bold text-orange-900">{selectedEvent.cancellationAnalysis.totalCancellations}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Ticket Type Analysis */}
                  <div className="bg-white border rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <Ticket className="w-5 h-5 mr-2" />
                      By Ticket Type
                    </h3>
                    <div className="space-y-4">
                      {Object.entries((selectedEvent.ticketAnalysis as any)).map(([tierName, data]: any, idx) => (
                        <div key={tierName} className={`flex justify-between items-center p-3 rounded-lg ${idx % 3 === 0 ? 'bg-blue-50' : idx % 3 === 1 ? 'bg-green-50' : 'bg-purple-50'}`}>
                          <div>
                            <p className="font-medium text-gray-900">{tierName}</p>
                            <p className="text-sm text-gray-600">¥{Number(data.price).toLocaleString()}</p>
                          </div>
                          <span className="text-xl font-bold text-gray-900">{data.count} people</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Year Level Analysis */}
                  <div className="bg-white border rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <GraduationCap className="w-5 h-5 mr-2" />
                      By Year Level
                    </h3>
                    <div className="space-y-3">
                      {Object.entries(selectedEvent.yearLevelAnalysis)
                        .sort(([,a], [,b]) => b - a)
                        .map(([yearLevel, count]) => (
                          <div key={yearLevel} className="flex justify-between items-center">
                            <span className="text-gray-700">{yearLevel}</span>
                            <div className="flex items-center">
                              <div className="w-20 bg-gray-200 rounded-full h-2 mr-3">
                                <div 
                                  className="bg-blue-600 h-2 rounded-full"
                                  style={{ width: `${(count / selectedEvent.totalRegistrations) * 100}%` }}
                                />
                              </div>
                              <span className="font-medium text-gray-900">{count} people</span>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>

                {/* Refund Analysis */}
                <div className="mt-8 bg-white border rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <RefreshCw className="w-5 h-5 mr-2" />
                    Refund Analysis
                  </h3>
                  {Object.keys(selectedEvent.refundAnalysis).length > 0 ? (
                    <div className="space-y-4">
                      {Object.entries(selectedEvent.refundAnalysis)
                        .sort(([,a], [,b]) => b.count - a.count)
                        .map(([price, data]) => (
                          <div key={price} className="border rounded-lg p-4">
                            <div className="flex justify-between items-center mb-2">
                              <span className="font-medium text-gray-900">¥{parseInt(price).toLocaleString()}</span>
                              <span className="text-red-600 font-semibold">{data.count} people</span>
                            </div>
                            {showRefundDetails && data.users.length > 0 && (
                              <div className="mt-2">
                                <p className="text-sm text-gray-600 mb-1">Users:</p>
                                <div className="text-sm text-gray-700 space-y-1">
                                  {data.users.map((user: string, index: number) => (
                                    <div key={index} className="bg-gray-50 px-2 py-1 rounded">
                                      {user}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      <button
                        onClick={() => setShowRefundDetails(!showRefundDetails)}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        {showRefundDetails ? 'Hide details' : 'Show details'}
                      </button>
                    </div>
                  ) : (
                    <p className="text-gray-500">No refunds</p>
                  )}
                </div>

                {/* Cancellation Analysis */}
                <div className="mt-8 bg-white border rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <X className="w-5 h-5 mr-2" />
                    Cancellation Analysis
                  </h3>
                  {selectedEvent.cancellationAnalysis.totalCancellations > 0 ? (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-700">Total cancellations</span>
                        <span className="text-orange-600 font-semibold">{selectedEvent.cancellationAnalysis.totalCancellations} people</span>
                      </div>
                      {Object.entries(selectedEvent.cancellationAnalysis.cancellationsByPrice).map(([price, count]) => (
                        <div key={price} className="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
                          <span className="text-gray-700">¥{parseInt(price).toLocaleString()}</span>
                          <span className="text-orange-600 font-semibold">{count} people</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500">No cancellations</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 