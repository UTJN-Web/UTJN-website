'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Shield, 
  UserCheck, 
  UserX,
  Crown,
  AlertCircle,
  CheckCircle,
  XCircle,
  Search
} from 'lucide-react';

interface User {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  major: string;
  graduationYear: number;
  joinedAt: string;
  cognitoSub: string;
  hasProfile: boolean;
  isAdmin: boolean;
}

export default function PermissionsManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      console.log('🔍 Fetching users for permissions...');
      const response = await fetch('/api/users');
      
      if (response.ok) {
        const userData = await response.json();
        console.log('👥 Users fetched:', userData.length, 'users');
        
        // Only show users with complete profiles
        const completeUsers = userData.filter((user: User) => user.hasProfile);
        console.log('✅ Complete users:', completeUsers.length);
        
        setUsers(completeUsers);
      } else {
        console.error('❌ Failed to fetch users');
        setMessage({ type: 'error', text: 'Failed to fetch users' });
      }
    } catch (error) {
      console.error('❌ Error fetching users:', error);
      setMessage({ type: 'error', text: 'Error fetching users' });
    } finally {
      setLoading(false);
    }
  };

  const updateAdminStatus = async (email: string, isAdmin: boolean) => {
    setUpdating(email);
    setMessage(null);
    
    try {
      console.log('👑 Updating admin status for', email, 'to', isAdmin);
      
      const response = await fetch('/api/users/admin-status', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          is_admin: isAdmin
        }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Admin status updated successfully');
        
        // Update local state
        setUsers(prevUsers => 
          prevUsers.map(user => 
            user.email === email 
              ? { ...user, isAdmin } 
              : user
          )
        );
        
        setMessage({ 
          type: 'success', 
          text: `${email} ${isAdmin ? 'is now an admin' : 'is no longer an admin'}` 
        });
      } else {
        const errorData = await response.json();
        console.error('❌ Failed to update admin status:', errorData);
        setMessage({ 
          type: 'error', 
          text: errorData.detail || 'Failed to update admin status' 
        });
      }
    } catch (error) {
      console.error('❌ Error updating admin status:', error);
      setMessage({ type: 'error', text: 'Error updating admin status' });
    } finally {
      setUpdating(null);
    }
  };

  // Filter users based on search term
  const filteredUsers = users.filter(user => {
    const fullName = `${user.firstName} ${user.lastName}`.toLowerCase();
    const email = user.email.toLowerCase();
    const searchLower = searchTerm.toLowerCase();
    
    return fullName.includes(searchLower) || email.includes(searchLower);
  });

  const adminUsers = filteredUsers.filter(user => user.isAdmin);
  const regularUsers = filteredUsers.filter(user => !user.isAdmin);

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
            <div className="text-center">
              <h1 className="text-4xl font-bold text-[#1c2a52] mb-2">Admin Permissions</h1>
              <p className="text-gray-700 text-lg">Manage who can access admin features</p>
            </div>
          </div>

          {/* Message */}
          {message && (
            <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
              message.type === 'success' 
                ? 'bg-green-100 border border-green-300 text-green-800' 
                : 'bg-red-100 border border-red-300 text-red-800'
            }`}>
              {message.type === 'success' ? (
                <CheckCircle className="w-5 h-5" />
              ) : (
                <XCircle className="w-5 h-5" />
              )}
              <span>{message.text}</span>
            </div>
          )}

          {/* Search Bar */}
          <div className="bg-white bg-opacity-95 rounded-lg p-6 shadow-lg border border-gray-200 backdrop-blur-sm mb-6">
            <div className="flex flex-col sm:flex-row gap-4 items-center">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search users by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1c2a52] focus:border-transparent"
                />
              </div>
              <div className="text-sm text-gray-600">
                {searchTerm && (
                  <span>Found {filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''}</span>
                )}
              </div>
            </div>
          </div>

          {/* Loading Screen */}
          {loading && (
            <div className="flex items-center justify-center py-20">
              <div className="bg-white bg-opacity-95 rounded-lg p-8 shadow-lg backdrop-blur-sm text-center">
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-[#1c2a52] border-t-transparent mx-auto mb-6"></div>
                <h2 className="text-2xl font-bold text-[#1c2a52] mb-2">Loading Permissions</h2>
                <p className="text-gray-600">Please wait while we fetch user data...</p>
              </div>
            </div>
          )}

          {!loading && (
            <>
              {/* Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white bg-opacity-95 rounded-lg p-6 shadow-lg border border-gray-200 backdrop-blur-sm">
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-600">Total Users</p>
                    <p className="text-2xl font-bold text-[#1c2a52]">{users.length}</p>
                  </div>
                </div>
                <div className="bg-white bg-opacity-95 rounded-lg p-6 shadow-lg border border-gray-200 backdrop-blur-sm">
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-600">Admin Users</p>
                    <p className="text-2xl font-bold text-[#1c2a52]">{adminUsers.length}</p>
                  </div>
                </div>
                <div className="bg-white bg-opacity-95 rounded-lg p-6 shadow-lg border border-gray-200 backdrop-blur-sm">
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-600">Regular Users</p>
                    <p className="text-2xl font-bold text-[#1c2a52]">{regularUsers.length}</p>
                  </div>
                </div>
              </div>

              {/* Admin Users Section */}
              <div className="bg-white bg-opacity-95 rounded-lg shadow-lg border border-gray-200 backdrop-blur-sm overflow-hidden mb-8">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-xl font-semibold text-[#1c2a52] flex items-center gap-2">
                    <Crown className="w-5 h-5 text-yellow-600" />
                    Admin Users ({adminUsers.length})
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">Users with full admin access</p>
                </div>
                
                {adminUsers.length === 0 ? (
                  <div className="p-6 text-center text-gray-500">
                    No admin users found
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200">
                    {adminUsers.map((user) => (
                      <div key={user.id} className="p-6 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                            <Crown className="w-5 h-5 text-yellow-600" />
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">
                              {user.firstName} {user.lastName}
                            </div>
                            <div className="text-sm text-gray-500">{user.email}</div>
                            <div className="text-xs text-gray-400">
                              {user.major} • Class of {user.graduationYear}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => updateAdminStatus(user.email, false)}
                          disabled={updating === user.email}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
                        >
                          {updating === user.email ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                          ) : (
                            <UserX className="w-4 h-4" />
                          )}
                          Remove Admin
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Regular Users Section */}
              <div className="bg-white bg-opacity-95 rounded-lg shadow-lg border border-gray-200 backdrop-blur-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-xl font-semibold text-[#1c2a52] flex items-center gap-2">
                    <Shield className="w-5 h-5 text-gray-600" />
                    Regular Users ({regularUsers.length})
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">Users who can be promoted to admin</p>
                </div>
                
                {regularUsers.length === 0 ? (
                  <div className="p-6 text-center text-gray-500">
                    No regular users found
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200">
                    {regularUsers.map((user) => (
                      <div key={user.id} className="p-6 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                            <Shield className="w-5 h-5 text-gray-600" />
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">
                              {user.firstName} {user.lastName}
                            </div>
                            <div className="text-sm text-gray-500">{user.email}</div>
                            <div className="text-xs text-gray-400">
                              {user.major} • Class of {user.graduationYear}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => updateAdminStatus(user.email, true)}
                          disabled={updating === user.email}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
                        >
                          {updating === user.email ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                          ) : (
                            <UserCheck className="w-4 h-4" />
                          )}
                          Make Admin
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
} 