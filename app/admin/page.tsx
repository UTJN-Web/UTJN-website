'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Calendar, DollarSign, Users, FileText, BarChart3, Shield, TrendingUp, Activity } from 'lucide-react';

interface DashboardStats {
  activeEvents: number;
  archivedEvents: number;
  totalUsers: number;
  pendingRefunds: number;
  processedRefunds: number;
  totalRegistrations: number;
  revenueThisMonth: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    activeEvents: 0,
    archivedEvents: 0,
    totalUsers: 0,
    pendingRefunds: 0,
    processedRefunds: 0,
    totalRegistrations: 0,
    revenueThisMonth: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const [eventsRes, usersRes, refundsRes] = await Promise.all([
        fetch('/api/events'),
        fetch('/api/users'),
        fetch('/api/admin/refunds')
      ]);

      const events = eventsRes.ok ? await eventsRes.json() : [];
      const users = usersRes.ok ? await usersRes.json() : [];
      const refundsResponse = refundsRes.ok ? await refundsRes.json() : { refunds: [] };
      const refunds = refundsResponse.refunds || [];

      console.log('📊 Dashboard data:', { 
        eventsCount: events.length, 
        usersCount: users.length, 
        refundsCount: refunds.length,
        activeEvents: events.filter((e: any) => !e.isArchived).length,
        totalRegistrations: events.reduce((sum: number, e: any) => sum + (e.registration_count || 0), 0),
        pendingRefunds: refunds.filter((r: any) => r.status === 'pending').length,
        sampleEvent: events[0],
        sampleUser: users[0],
        sampleRefund: refunds[0]
      });

      // Calculate stats
      const activeEvents = events.filter((e: any) => !e.isArchived).length;
      const archivedEvents = events.filter((e: any) => e.isArchived).length;
      const totalRegistrations = events.reduce((sum: number, e: any) => sum + (e.registration_count || 0), 0);
      const pendingRefunds = refunds.filter((r: any) => r.status === 'pending').length;
      const processedRefunds = refunds.filter((r: any) => r.status === 'approved' || r.status === 'rejected').length;
      
      // Calculate revenue (simplified - sum of all event fees * registrations)
      const revenueThisMonth = events.reduce((sum: number, e: any) => {
        const registrations = e.registration_count || 0;
        return sum + (e.fee * registrations);
      }, 0);

      setStats({
        activeEvents,
        archivedEvents,
        totalUsers: users.length,
        pendingRefunds,
        processedRefunds,
        totalRegistrations,
        revenueThisMonth
      });
      
      console.log('📊 Final calculated stats:', {
        activeEvents,
        archivedEvents,
        totalUsers: users.length,
        pendingRefunds,
        processedRefunds,
        totalRegistrations,
        revenueThisMonth
      });
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

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
          <div className="mb-8 text-center">
            <h1 className="text-4xl font-bold text-[#1c2a52] mb-2">Admin Dashboard</h1>
            <p className="text-gray-700 text-lg">Manage your UTJN platform</p>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white bg-opacity-95 rounded-lg p-6 shadow-lg border border-gray-200 backdrop-blur-sm">
              <div className="text-center">
                <p className="text-sm font-medium text-gray-600">Active Events</p>
                <p className="text-2xl font-bold text-[#1c2a52]">
                  {loading ? '...' : stats.activeEvents}
                </p>
              </div>
            </div>
            <div className="bg-white bg-opacity-95 rounded-lg p-6 shadow-lg border border-gray-200 backdrop-blur-sm">
              <div className="text-center">
                <p className="text-sm font-medium text-gray-600">Total Members</p>
                <p className="text-2xl font-bold text-[#1c2a52]">
                  {loading ? '...' : stats.totalUsers}
                </p>
              </div>
            </div>
            <div className="bg-white bg-opacity-95 rounded-lg p-6 shadow-lg border border-gray-200 backdrop-blur-sm">
              <div className="text-center">
                <p className="text-sm font-medium text-gray-600">Pending Refunds</p>
                <p className="text-2xl font-bold text-[#1c2a52]">
                  {loading ? '...' : stats.pendingRefunds}
                </p>
              </div>
            </div>
            <div className="bg-white bg-opacity-95 rounded-lg p-6 shadow-lg border border-gray-200 backdrop-blur-sm">
              <div className="text-center">
                <p className="text-sm font-medium text-gray-600">Total Registrations</p>
                <p className="text-2xl font-bold text-[#1c2a52]">
                  {loading ? '...' : stats.totalRegistrations}
                </p>
              </div>
            </div>
          </div>

          {/* Management Modules */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Events Management */}
            <Link href="/admin/events" className="group">
              <div className="bg-white bg-opacity-95 rounded-lg p-6 shadow-lg border border-gray-200 hover:shadow-xl transition-all duration-300 backdrop-blur-sm">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-[#1c2a52]">Events</h3>
                  <p className="text-sm text-gray-500">Manage events</p>
                </div>
                <p className="text-gray-600 mb-4">
                  Create, edit, and manage member events. Handle registrations and event capacity.
                </p>
                <div className="text-center">
                  <span className="text-sm font-medium text-[#1c2a52]">Manage Events →</span>
                </div>
              </div>
            </Link>

            {/* Refunds Management */}
            <Link href="/admin/refunds" className="group">
              <div className="bg-white bg-opacity-95 rounded-lg p-6 shadow-lg border border-gray-200 hover:shadow-xl transition-all duration-300 backdrop-blur-sm">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-[#1c2a52]">Refunds</h3>
                  <p className="text-sm text-gray-500">Process refund requests</p>
                </div>
                <p className="text-gray-600 mb-4">
                  Review and process refund requests from members who cancel paid events.
                </p>
                <div className="text-center">
                  <span className="text-sm font-medium text-[#1c2a52]">Manage Refunds →</span>
                </div>
              </div>
            </Link>

            {/* User Management */}
            <Link href="/admin/users" className="group">
              <div className="bg-white bg-opacity-95 rounded-lg p-6 shadow-lg border border-gray-200 hover:shadow-xl transition-all duration-300 backdrop-blur-sm">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-[#1c2a52]">Users</h3>
                  <p className="text-sm text-gray-500">Member management</p>
                </div>
                <p className="text-gray-600 mb-4">
                  Manage member accounts, profiles, and permissions.
                </p>
                <div className="text-center">
                  <span className="text-sm font-medium text-[#1c2a52]">Manage Users →</span>
                </div>
              </div>
            </Link>

            {/* Analytics */}
            <Link href="/admin/analytics" className="group">
              <div className="bg-white bg-opacity-95 rounded-lg p-6 shadow-lg border border-gray-200 hover:shadow-xl transition-all duration-300 backdrop-blur-sm">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-[#1c2a52]">Analytics</h3>
                  <p className="text-sm text-gray-500">Reports & insights</p>
                </div>
                <p className="text-gray-600 mb-4">
                  View detailed analytics about events, registrations, and member engagement.
                </p>
                <div className="text-center">
                  <span className="text-sm font-medium text-[#1c2a52]">View Analytics →</span>
                </div>
              </div>
            </Link>

            {/* Forms */}
            <Link href="/admin/forms" className="group">
              <div className="bg-white bg-opacity-95 rounded-lg p-6 shadow-lg border border-gray-200 hover:shadow-xl transition-all duration-300 backdrop-blur-sm">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-[#1c2a52]">Forms</h3>
                  <p className="text-sm text-gray-500">Event forms & feedback</p>
                </div>
                <p className="text-gray-600 mb-4">
                  Design feedback forms for events, manage submissions, and create discount coupons.
                </p>
                <div className="text-center">
                  <span className="text-sm font-medium text-[#1c2a52]">Active</span>
                </div>
              </div>
            </Link>

            {/* Permissions */}
            <Link href="/admin/permissions" className="group">
              <div className="bg-white bg-opacity-95 rounded-lg p-6 shadow-lg border border-gray-200 hover:shadow-xl transition-all duration-300 backdrop-blur-sm">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-[#1c2a52]">Permissions</h3>
                  <p className="text-sm text-gray-500">Access control</p>
                </div>
                <p className="text-gray-600 mb-4">
                  Manage admin roles, permissions, and access control for different features.
                </p>
                <div className="text-center">
                  <span className="text-sm font-medium text-[#1c2a52]">Manage Permissions →</span>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}