'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Search, 
  Filter, 
  Mail, 
  Calendar, 
  MapPin, 
  GraduationCap,
  Edit,
  Trash2,
  Eye,
  UserPlus,
  Download
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
}

export default function UsersManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterYear, setFilterYear] = useState<string>('all');
  const [filterMajor, setFilterMajor] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users');
      if (response.ok) {
        const userData = await response.json();
        setUsers(userData);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.major.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesYear = filterYear === 'all' || user.graduationYear.toString() === filterYear;
    const matchesMajor = filterMajor === 'all' || user.major === filterMajor;

    return matchesSearch && matchesYear && matchesMajor;
  });

  const uniqueYears = [...new Set(users.map(u => u.graduationYear))].sort();
  const uniqueMajors = [...new Set(users.map(u => u.major))].sort();

  const exportUsers = () => {
    const csvData = [
      ['First Name', 'Last Name', 'Email', 'Major', 'Graduation Year', 'Joined Date'],
      ...filteredUsers.map(user => [
        user.firstName,
        user.lastName,
        user.email,
        user.major,
        user.graduationYear.toString(),
        new Date(user.joinedAt).toLocaleDateString()
      ])
    ];
    
    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `utjn-users-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
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
              <h1 className="text-4xl font-bold text-[#1c2a52] mb-2">User Management</h1>
              <p className="text-gray-700 text-lg">Manage member accounts and profiles</p>
            </div>
          </div>

          {/* Loading Screen */}
          {loading && (
            <div className="flex items-center justify-center py-20">
              <div className="bg-white bg-opacity-95 rounded-lg p-8 shadow-lg backdrop-blur-sm text-center">
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-[#1c2a52] border-t-transparent mx-auto mb-6"></div>
                <h2 className="text-2xl font-bold text-[#1c2a52] mb-2">Loading Users</h2>
                <p className="text-gray-600">Please wait while we fetch user data...</p>
              </div>
            </div>
          )}

          {/* Main Content */}
          {!loading && (
            <>
              {/* Controls */}
              <div className="bg-white bg-opacity-95 rounded-lg p-6 shadow-lg border border-gray-200 backdrop-blur-sm mb-6">
                <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                  <div className="flex flex-col sm:flex-row gap-4 flex-1">
                    <div className="relative flex-1 max-w-md">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input
                        type="text"
                        placeholder="Search users..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1c2a52] focus:border-transparent"
                      />
                    </div>
                    <select
                      value={filterYear}
                      onChange={(e) => setFilterYear(e.target.value)}
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1c2a52] focus:border-transparent"
                    >
                      <option value="all">All Years</option>
                      {uniqueYears.map(year => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                    <select
                      value={filterMajor}
                      onChange={(e) => setFilterMajor(e.target.value)}
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1c2a52] focus:border-transparent"
                    >
                      <option value="all">All Majors</option>
                      {uniqueMajors.map(major => (
                        <option key={major} value={major}>{major}</option>
                      ))}
                    </select>
                  </div>
                  <button
                    onClick={exportUsers}
                    className="bg-[#1c2a52] text-white px-4 py-2 rounded-lg hover:bg-[#2a3c6b] transition-colors flex items-center gap-2"
                  >
                    <Download size={16} />
                    Export CSV
                  </button>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="bg-white bg-opacity-95 rounded-lg p-6 shadow-lg border border-gray-200 backdrop-blur-sm">
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-600">Total Users</p>
                    <p className="text-2xl font-bold text-[#1c2a52]">{users.length}</p>
                  </div>
                </div>
                <div className="bg-white bg-opacity-95 rounded-lg p-6 shadow-lg border border-gray-200 backdrop-blur-sm">
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-600">Complete Profiles</p>
                    <p className="text-2xl font-bold text-[#1c2a52]">
                      {users.filter(u => u.hasProfile).length}
                    </p>
                  </div>
                </div>
                <div className="bg-white bg-opacity-95 rounded-lg p-6 shadow-lg border border-gray-200 backdrop-blur-sm">
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-600">Incomplete Profiles</p>
                    <p className="text-2xl font-bold text-[#1c2a52]">
                      {users.filter(u => !u.hasProfile).length}
                    </p>
                  </div>
                </div>
              </div>

              {/* Users Table */}
              <div className="bg-white bg-opacity-95 rounded-lg shadow-lg border border-gray-200 backdrop-blur-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          User
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Email
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Major & Year
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Joined
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Profile Status
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredUsers.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                            No users found matching your criteria
                          </td>
                        </tr>
                      ) : (
                        filteredUsers.map((user) => (
                          <tr key={user.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="w-10 h-10 bg-[#1c2a52] bg-opacity-10 rounded-full flex items-center justify-center">
                                  <span className="text-[#1c2a52] font-medium">
                                    {user.firstName[0]}{user.lastName[0]}
                                  </span>
                                </div>
                                <div className="ml-4">
                                  <div className="text-sm font-medium text-gray-900">
                                    {user.firstName} {user.lastName}
                                  </div>
                                  <div className="text-sm text-gray-500">ID: {user.id}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">{user.email}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">{user.major}</div>
                              <div className="text-sm text-gray-500">Class of {user.graduationYear}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">
                                {new Date(user.joinedAt).toLocaleDateString()}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 py-1 text-xs rounded-full ${
                                user.hasProfile 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}>
                                {user.hasProfile ? 'Complete' : 'Incomplete'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <div className="flex justify-end gap-2">
                                <button
                                  onClick={() => {
                                    setSelectedUser(user);
                                    setShowUserModal(true);
                                  }}
                                  className="text-[#1c2a52] hover:text-[#2a3c6b]"
                                >
                                  <Eye size={16} />
                                </button>
                                <button className="text-gray-600 hover:text-gray-900">
                                  <Edit size={16} />
                                </button>
                                <button className="text-red-600 hover:text-red-900">
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* User Detail Modal */}
          {showUserModal && selectedUser && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-gray-900">User Details</h2>
                  <button
                    onClick={() => setShowUserModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                </div>
                
                <div className="space-y-6">
                  <div className="flex items-center">
                    <div className="w-16 h-16 bg-[#1c2a52] bg-opacity-10 rounded-full flex items-center justify-center">
                      <span className="text-[#1c2a52] font-bold text-xl">
                        {selectedUser.firstName[0]}{selectedUser.lastName[0]}
                      </span>
                    </div>
                    <div className="ml-6">
                      <h3 className="text-xl font-bold text-gray-900">
                        {selectedUser.firstName} {selectedUser.lastName}
                      </h3>
                      <p className="text-gray-600">{selectedUser.email}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">Academic Information</h4>
                      <div className="space-y-2">
                        <p className="text-sm">
                          <span className="font-medium text-gray-600">Major:</span> {selectedUser.major}
                        </p>
                        <p className="text-sm">
                          <span className="font-medium text-gray-600">Graduation Year:</span> {selectedUser.graduationYear}
                        </p>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">Account Information</h4>
                      <div className="space-y-2">
                        <p className="text-sm">
                          <span className="font-medium text-gray-600">User ID:</span> {selectedUser.id}
                        </p>
                        <p className="text-sm">
                          <span className="font-medium text-gray-600">Joined:</span> {new Date(selectedUser.joinedAt).toLocaleDateString()}
                        </p>
                        <p className="text-sm">
                          <span className="font-medium text-gray-600">Profile Status:</span>
                          <span className={`ml-2 px-2 py-1 text-xs rounded-full ${
                            selectedUser.hasProfile 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {selectedUser.hasProfile ? 'Complete' : 'Incomplete'}
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Cognito Information</h4>
                    <p className="text-sm text-gray-600 font-mono bg-gray-50 p-2 rounded">
                      {selectedUser.cognitoSub}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 