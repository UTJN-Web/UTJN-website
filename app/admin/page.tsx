'use client';

import Link from 'next/link';
import { Calendar, DollarSign, Users, Settings, BarChart3, Shield } from 'lucide-react';

export default function AdminDashboard() {
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
          <p className="text-gray-600">Manage your UTJN platform</p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg p-6 shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Calendar className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Events</p>
                <p className="text-2xl font-bold text-gray-900">12</p>
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
                <p className="text-2xl font-bold text-gray-900">248</p>
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
                <p className="text-2xl font-bold text-gray-900">3</p>
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
                  <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">12 Active</span>
                  <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">5 Archived</span>
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
                  <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded text-xs">3 Pending</span>
                  <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">12 Processed</span>
                </div>
              </div>
            </div>
          </Link>

          {/* User Management */}
          <Link href="/admin/users" className="group">
            <div className="bg-white rounded-lg p-6 shadow-sm border hover:shadow-md transition-shadow opacity-50">
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
                <span className="text-sm font-medium text-gray-400">Coming Soon</span>
                <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">248 Members</span>
              </div>
            </div>
          </Link>

          {/* Analytics */}
          <Link href="/admin/analytics" className="group">
            <div className="bg-white rounded-lg p-6 shadow-sm border hover:shadow-md transition-shadow opacity-50">
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
                <span className="text-sm font-medium text-gray-400">Coming Soon</span>
                <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">Reports</span>
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