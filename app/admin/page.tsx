'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Calendar, DollarSign, Users, Settings, BarChart3, Shield, TrendingUp, Activity } from 'lucide-react';

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
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
          <p className="text-gray-600">Manage your UTJN platform</p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg p-6 shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Calendar className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Events</p>
                <p className="text-2xl font-bold text-gray-900">
                  {loading ? '...' : stats.activeEvents}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg p-6 shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <Users className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Members</p>
                <p className="text-2xl font-bold text-gray-900">
                  {loading ? '...' : stats.totalUsers}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg p-6 shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-amber-100 rounded-lg">
                <DollarSign className="w-6 h-6 text-amber-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pending Refunds</p>
                <p className="text-2xl font-bold text-gray-900">
                  {loading ? '...' : stats.pendingRefunds}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg p-6 shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Registrations</p>
                <p className="text-2xl font-bold text-gray-900">
                  {loading ? '...' : stats.totalRegistrations}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Management Modules */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Events Management */}
          <Link href="/admin/events" className="group">
            <div className="bg-white rounded-lg p-6 shadow-sm border hover:shadow-md transition-shadow">
              <div className="flex items-center mb-4">
                <div className="p-3 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
                  <Calendar className="w-8 h-8 text-blue-600" />
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-semibold text-gray-900">Events</h3>
                  <p className="text-sm text-gray-500">Manage events</p>
                </div>
              </div>
              <p className="text-gray-600 mb-4">
                Create, edit, and manage member events. Handle registrations and event capacity.
              </p>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-blue-600">Manage Events →</span>
                <div className="flex gap-1">
                  <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">
                    {loading ? '...' : stats.activeEvents} Active
                  </span>
                  <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                    {loading ? '...' : stats.archivedEvents} Archived
                  </span>
                </div>
              </div>
            </div>
          </Link>

          {/* Refunds Management */}
          <Link href="/admin/refunds" className="group">
            <div className="bg-white rounded-lg p-6 shadow-sm border hover:shadow-md transition-shadow">
              <div className="flex items-center mb-4">
                <div className="p-3 bg-amber-100 rounded-lg group-hover:bg-amber-200 transition-colors">
                  <DollarSign className="w-8 h-8 text-amber-600" />
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-semibold text-gray-900">Refunds</h3>
                  <p className="text-sm text-gray-500">Process refund requests</p>
                </div>
              </div>
              <p className="text-gray-600 mb-4">
                Review and process refund requests from members who cancel paid events.
              </p>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-amber-600">Manage Refunds →</span>
                <div className="flex gap-1">
                  <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded text-xs">
                    {loading ? '...' : stats.pendingRefunds} Pending
                  </span>
                  <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">
                    {loading ? '...' : stats.processedRefunds} Processed
                  </span>
                </div>
              </div>
            </div>
          </Link>

          {/* User Management */}
          <Link href="/admin/users" className="group">
            <div className="bg-white rounded-lg p-6 shadow-sm border hover:shadow-md transition-shadow">
              <div className="flex items-center mb-4">
                <div className="p-3 bg-green-100 rounded-lg group-hover:bg-green-200 transition-colors">
                  <Users className="w-8 h-8 text-green-600" />
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-semibold text-gray-900">Users</h3>
                  <p className="text-sm text-gray-500">Member management</p>
                </div>
              </div>
              <p className="text-gray-600 mb-4">
                Manage member accounts, profiles, and permissions.
              </p>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-green-600">Manage Users →</span>
                <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">
                  {loading ? '...' : stats.totalUsers} Members
                </span>
              </div>
            </div>
          </Link>

          {/* Analytics */}
          <Link href="/admin/analytics" className="group">
            <div className="bg-white rounded-lg p-6 shadow-sm border hover:shadow-md transition-shadow">
              <div className="flex items-center mb-4">
                <div className="p-3 bg-purple-100 rounded-lg group-hover:bg-purple-200 transition-colors">
                  <BarChart3 className="w-8 h-8 text-purple-600" />
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-semibold text-gray-900">Analytics</h3>
                  <p className="text-sm text-gray-500">Reports & insights</p>
                </div>
              </div>
              <p className="text-gray-600 mb-4">
                View detailed analytics about events, registrations, and member engagement.
              </p>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-purple-600">View Analytics →</span>
                <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs">
                  ${loading ? '...' : Math.round(stats.revenueThisMonth)}
                </span>
              </div>
            </div>
          </Link>

          {/* Settings */}
          <Link href="/admin/settings" className="group">
            <div className="bg-white rounded-lg p-6 shadow-sm border hover:shadow-md transition-shadow opacity-50">
              <div className="flex items-center mb-4">
                <div className="p-3 bg-gray-100 rounded-lg group-hover:bg-gray-200 transition-colors">
                  <Settings className="w-8 h-8 text-gray-600" />
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-semibold text-gray-900">Settings</h3>
                  <p className="text-sm text-gray-500">Platform configuration</p>
                </div>
              </div>
              <p className="text-gray-600 mb-4">
                Configure platform settings, payment processors, and system preferences.
              </p>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-400">Coming Soon</span>
                <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">Config</span>
              </div>
            </div>
          </Link>

          {/* Permissions */}
          <Link href="/admin/permissions" className="group">
            <div className="bg-white rounded-lg p-6 shadow-sm border hover:shadow-md transition-shadow opacity-50">
              <div className="flex items-center mb-4">
                <div className="p-3 bg-red-100 rounded-lg group-hover:bg-red-200 transition-colors">
                  <Shield className="w-8 h-8 text-red-600" />
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-semibold text-gray-900">Permissions</h3>
                  <p className="text-sm text-gray-500">Access control</p>
                </div>
              </div>
              <p className="text-gray-600 mb-4">
                Manage admin roles, permissions, and access control for different features.
              </p>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-400">Coming Soon</span>
                <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">Roles</span>
              </div>
            </div>
          </Link>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 bg-white rounded-lg p-6 shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="flex gap-4">
            <Link 
              href="/admin/events?action=create"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Calendar className="w-4 h-4" />
              Create New Event
            </Link>
            <Link 
              href="/admin/refunds?filter=pending"
              className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors flex items-center gap-2"
            >
              <DollarSign className="w-4 h-4" />
              Review Pending Refunds
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
} 