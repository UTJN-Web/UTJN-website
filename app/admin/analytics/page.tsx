'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, 
  TrendingUp, 
  TrendingDown,
  Calendar, 
  Users, 
  DollarSign,
  Eye,
  UserCheck,
  Target,
  Activity,
  BarChart3,
  PieChart,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';

interface AnalyticsData {
  events: any[];
  users: any[];
  registrations: any[];
  revenue: {
    total: number;
    thisMonth: number;
    lastMonth: number;
    growth: number;
  };
  topEvents: Array<{
    name: string;
    registrations: number;
    revenue: number;
    capacity: number;
  }>;
  userGrowth: Array<{
    month: string;
    users: number;
  }>;
  eventTypes: {
    social: number;
    career: number;
  };
}

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30d');

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  const fetchAnalytics = async () => {
    try {
      const [eventsRes, usersRes] = await Promise.all([
        fetch('/api/events'),
        fetch('/api/users')
      ]);

      const events = eventsRes.ok ? await eventsRes.json() : [];
      const users = usersRes.ok ? await usersRes.json() : [];

      // Calculate analytics with proper monthly breakdown
      const currentDate = new Date();
      const currentMonth = currentDate.getMonth();
      const currentYear = currentDate.getFullYear();
      
      // Calculate total revenue and monthly breakdown
      let totalRevenue = 0;
      let thisMonthRevenue = 0;
      let lastMonthRevenue = 0;
      
      events.forEach((e: any) => {
        const registrations = e.capacity - e.remainingSeats;
        const eventRevenue = e.fee * registrations;
        totalRevenue += eventRevenue;
        
        // Check if event is in current month
        if (e.date) {
          const eventDate = new Date(e.date);
          if (eventDate.getMonth() === currentMonth && eventDate.getFullYear() === currentYear) {
            thisMonthRevenue += eventRevenue;
          }
          // Check if event is in last month
          else if (eventDate.getMonth() === (currentMonth - 1 + 12) % 12 && 
                   eventDate.getFullYear() === (currentMonth === 0 ? currentYear - 1 : currentYear)) {
            lastMonthRevenue += eventRevenue;
          }
        }
      });
      
      // Calculate growth percentage
      const growth = lastMonthRevenue > 0 ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 : 0;

      const topEvents = events
        .map((e: any) => ({
          name: e.name,
          registrations: e.capacity - e.remainingSeats,
          revenue: e.fee * (e.capacity - e.remainingSeats),
          capacity: e.capacity
        }))
        .sort((a: any, b: any) => b.registrations - a.registrations)
        .slice(0, 5);

      // Generate user growth data (last 6 months)
      const userGrowth = [];
      for (let i = 5; i >= 0; i--) {
        const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
        const monthUsers = users.filter((u: any) => {
          const joinDate = new Date(u.joinedAt);
          return joinDate.getFullYear() === date.getFullYear() && 
                 joinDate.getMonth() === date.getMonth();
        }).length;
        
        userGrowth.push({
          month: date.toLocaleDateString('en-US', { month: 'short' }),
          users: monthUsers
        });
      }

      const eventTypes = {
        social: events.filter((e: any) => e.type === 'social').length,
        career: events.filter((e: any) => e.type === 'career').length
      };

      setAnalytics({
        events,
        users,
        registrations: [], // Would be fetched separately
        revenue: {
          total: totalRevenue,
          thisMonth: thisMonthRevenue,
          lastMonth: lastMonthRevenue,
          growth
        },
        topEvents,
        userGrowth,
        eventTypes
      });
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
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
          <h2 className="text-2xl font-bold text-[#1c2a52] mb-2">Loading Analytics</h2>
          <p className="text-gray-600">Please wait while we fetch analytics data...</p>
        </div>
      </div>
    );
  }

  if (!analytics) {
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

        {/* Error content */}
        <div className="relative z-10 w-full max-w-md bg-white bg-opacity-95 p-8 rounded shadow-lg backdrop-blur-sm text-center">
          <h2 className="text-2xl font-bold text-[#1c2a52] mb-2">Error Loading Analytics</h2>
          <p className="text-gray-600">Failed to load analytics data. Please try again.</p>
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
        <div className="max-w-6xl mx-auto">
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
            <div className="flex justify-between items-center">
              <div className="text-center flex-1">
                <h1 className="text-4xl font-bold text-[#1c2a52] mb-2">Analytics & Insights</h1>
                <p className="text-gray-700 text-lg">Track performance and member engagement</p>
              </div>
              <div className="flex gap-4">
                <Link
                  href="/admin/analytics/detailed"
                  className="inline-flex items-center px-4 py-2 bg-[#1c2a52] text-white rounded-lg hover:bg-[#2a3c6b] transition-colors"
                >
                  <BarChart3 size={16} className="mr-2" />
                  Event Detailed Analytics
                </Link>
                <select
                  value={timeRange}
                  onChange={(e) => setTimeRange(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1c2a52] focus:border-transparent"
                >
                  <option value="7d">Last 7 days</option>
                  <option value="30d">Last 30 days</option>
                  <option value="90d">Last 90 days</option>
                  <option value="1y">Last year</option>
                </select>
              </div>
            </div>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white bg-opacity-95 rounded-lg p-6 shadow-lg border border-gray-200 backdrop-blur-sm">
              <div className="text-center">
                <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                <p className="text-2xl font-bold text-[#1c2a52]">
                  ${Math.round(analytics.revenue.total).toLocaleString()}
                </p>
                <div className="flex items-center justify-center mt-2">
                  {analytics.revenue.growth >= 0 ? (
                    <ArrowUpRight size={16} className="text-green-500 mr-1" />
                  ) : (
                    <ArrowDownRight size={16} className="text-red-500 mr-1" />
                  )}
                  <span className={`text-sm ${
                    analytics.revenue.growth >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {Math.abs(analytics.revenue.growth).toFixed(1)}% vs last month
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white bg-opacity-95 rounded-lg p-6 shadow-lg border border-gray-200 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Events</p>
                  <p className="text-2xl font-bold text-[#1c2a52]">{analytics.events.length}</p>
                  <div className="flex items-center mt-2">
                    <Activity size={16} className="text-blue-500 mr-1" />
                    <span className="text-sm text-blue-600">
                      {analytics.events.filter(e => !e.isArchived).length} active
                    </span>
                  </div>
                </div>
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Calendar className="w-8 h-8 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white bg-opacity-95 rounded-lg p-6 shadow-lg border border-gray-200 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Members</p>
                  <p className="text-2xl font-bold text-[#1c2a52]">{analytics.users.length}</p>
                  <div className="flex items-center mt-2">
                    <UserCheck size={16} className="text-purple-500 mr-1" />
                    <span className="text-sm text-purple-600">
                      {analytics.users.filter(u => u.hasProfile).length} complete profiles
                    </span>
                  </div>
                </div>
                <div className="p-3 bg-purple-100 rounded-lg">
                  <Users className="w-8 h-8 text-purple-600" />
                </div>
              </div>
            </div>

            <div className="bg-white bg-opacity-95 rounded-lg p-6 shadow-lg border border-gray-200 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Avg. Attendance</p>
                  <p className="text-2xl font-bold text-[#1c2a52]">
                    {analytics.events.length > 0 ? 
                      (() => {
                        const avg = (analytics.events.reduce((sum, e) => sum + (e.capacity - e.remainingSeats), 0) / analytics.events.length);
                        return avg < 1 ? avg.toFixed(1) : Math.round(avg);
                      })()
                      : 0
                    }
                  </p>
                  <div className="flex items-center mt-2">
                    <Target size={16} className="text-amber-500 mr-1" />
                    <span className="text-sm text-amber-600">per event</span>
                  </div>
                </div>
                <div className="p-3 bg-amber-100 rounded-lg">
                  <Target className="w-8 h-8 text-amber-600" />
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* User Growth Chart */}
            <div className="bg-white bg-opacity-95 rounded-lg p-6 shadow-lg border border-gray-200 backdrop-blur-sm">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-[#1c2a52]">User Growth</h3>
                <TrendingUp className="w-5 h-5 text-blue-600" />
              </div>
              <div className="space-y-4">
                {analytics.userGrowth.map((data, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">{data.month}</span>
                    <div className="flex items-center">
                      <div 
                        className="bg-blue-100 h-6 rounded mr-3"
                        style={{ 
                          width: `${Math.max(data.users * 20, 20)}px`,
                          maxWidth: '200px'
                        }}
                      />
                      <span className="text-sm font-medium text-[#1c2a52]">{data.users}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Event Types */}
            <div className="bg-white bg-opacity-95 rounded-lg p-6 shadow-lg border border-gray-200 backdrop-blur-sm">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-[#1c2a52]">Event Types</h3>
                <PieChart className="w-5 h-5 text-purple-600" />
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-4 h-4 bg-blue-500 rounded mr-3"></div>
                    <span className="text-sm text-gray-600">Social Events</span>
                  </div>
                  <span className="text-sm font-medium text-[#1c2a52]">
                    {analytics.eventTypes.social}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-4 h-4 bg-purple-500 rounded mr-3"></div>
                    <span className="text-sm text-gray-600">Career Events</span>
                  </div>
                  <span className="text-sm font-medium text-[#1c2a52]">
                    {analytics.eventTypes.career}
                  </span>
                </div>
                <div className="pt-4 border-t">
                  <div className="flex space-x-2">
                    <div 
                      className="h-3 bg-blue-500 rounded"
                      style={{ 
                        width: `${(analytics.eventTypes.social / (analytics.eventTypes.social + analytics.eventTypes.career)) * 100}%` 
                      }}
                    />
                    <div 
                      className="h-3 bg-purple-500 rounded"
                      style={{ 
                        width: `${(analytics.eventTypes.career / (analytics.eventTypes.social + analytics.eventTypes.career)) * 100}%` 
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Top Events */}
          <div className="bg-white bg-opacity-95 rounded-lg p-6 shadow-lg border border-gray-200 backdrop-blur-sm mb-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-[#1c2a52]">Top Performing Events</h3>
              <BarChart3 className="w-5 h-5 text-green-600" />
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-500 text-sm">Event</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500 text-sm">Registrations</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500 text-sm">Fill Rate</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500 text-sm">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.topEvents.map((event, index) => (
                    <tr key={index} className="border-b border-gray-100">
                      <td className="py-3 px-4">
                        <div className="font-medium text-[#1c2a52]">{event.name}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-[#1c2a52]">{event.registrations}</span>
                        <span className="text-gray-500 text-sm ml-1">/ {event.capacity}</span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center">
                          <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                            <div 
                              className="bg-green-500 h-2 rounded-full"
                              style={{ width: `${(event.registrations / event.capacity) * 100}%` }}
                            />
                          </div>
                          <span className="text-sm text-gray-600">
                            {Math.round((event.registrations / event.capacity) * 100)}%
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-medium text-[#1c2a52]">
                        ${event.revenue.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Revenue Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white bg-opacity-95 rounded-lg p-6 shadow-lg border border-gray-200 backdrop-blur-sm">
              <h3 className="text-lg font-semibold text-[#1c2a52] mb-6">Revenue Breakdown</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">This Month</span>
                  <span className="font-medium text-[#1c2a52]">
                    ${Math.round(analytics.revenue.thisMonth).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Last Month</span>
                  <span className="font-medium text-[#1c2a52]">
                    ${Math.round(analytics.revenue.lastMonth).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-4 border-t">
                  <span className="text-gray-600">Total Revenue</span>
                  <span className="font-bold text-[#1c2a52] text-lg">
                    ${Math.round(analytics.revenue.total).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white bg-opacity-95 rounded-lg p-6 shadow-lg border border-gray-200 backdrop-blur-sm">
              <h3 className="text-lg font-semibold text-[#1c2a52] mb-6">Quick Insights</h3>
              <div className="space-y-4">
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                  <span className="text-sm text-gray-600">
                    Average event attendance: {analytics.events.length > 0 ? 
                      (() => {
                        const avg = (analytics.events.reduce((sum, e) => sum + (e.capacity - e.remainingSeats), 0) / analytics.events.length);
                        return avg < 1 ? avg.toFixed(1) : Math.round(avg);
                      })()
                      : 0
                    } people
                  </span>
                </div>
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                  <span className="text-sm text-gray-600">
                    {analytics.users.filter(u => u.hasProfile).length} users have complete profiles
                  </span>
                </div>
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-purple-500 rounded-full mr-3"></div>
                  <span className="text-sm text-gray-600">
                    {analytics.eventTypes.social > analytics.eventTypes.career ? 'Social' : 'Career'} events are more popular
                  </span>
                </div>
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-amber-500 rounded-full mr-3"></div>
                  <span className="text-sm text-gray-600">
                    Revenue growth: {analytics.revenue.growth >= 0 ? '+' : ''}{analytics.revenue.growth.toFixed(1)}% month-over-month
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 