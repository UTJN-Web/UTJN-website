'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Archive, 
  ArchiveRestore, 
  Calendar,
  Users,
  DollarSign,
  MapPin,
  Eye,
  X,
  Save,
  AlertTriangle,
  CheckCircle,
  Clock,
  Filter,
  Search,
  SortAsc,
  SortDesc
} from 'lucide-react';

interface Event {
  id: number;
  name: string;
  description: string;
  targetYear: string;
  fee: number;
  capacity: number;
  isArchived: boolean;
  isUofTOnly?: boolean;
  enableAdvancedTicketing?: boolean;
  enableSubEvents?: boolean;
  date: string;
  type: string;
  image?: string;
  refundDeadline?: string;
  remainingSeats: number;
  registeredUsers: any[];
  registrations?: any[];
}

interface EventFormData {
  name: string;
  description: string;
  targetYear: string;
  fee: string;
  capacity: string;
  date: string;
  type: string;
  image: string;
  refundDeadline: string;
  isUofTOnly: boolean;
  enableAdvancedTicketing: boolean;
  enableSubEvents: boolean;
}

type NotificationType = 'success' | 'error' | 'info';

interface Notification {
  id: string;
  type: NotificationType;
  message: string;
}

type SortField = 'name' | 'date' | 'capacity' | 'registrations';
type SortDirection = 'asc' | 'desc';

interface TicketTier {
  id?: number;
  name: string;
  price: number;
  capacity: number;
  targetYear: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  subEventPrices?: number[];
  subEventCapacities?: number[];
}

interface SubEvent {
  id?: number;
  name: string;
  description: string;
  price: number;
  capacity: number;
  isStandalone: boolean;
  isComboOption: boolean;
}

export default function AdminEventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [saving, setSaving] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'social' | 'career'>('all');
  const [filterArchived, setFilterArchived] = useState<'all' | 'active' | 'archived'>('active');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  
  // Image upload state
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [uploadingImage, setUploadingImage] = useState(false);
  
  // Target year options
  const targetYearOptions = [
    { value: '1st year', label: '1st year' },
    { value: '2nd year', label: '2nd year' },
    { value: '3rd year', label: '3rd year' },
    { value: '4th year', label: '4th year' },
    { value: 'All years', label: 'All years' }
  ];
  
  const [selectedTargetYears, setSelectedTargetYears] = useState<string[]>(['All years']);
  
  // Advanced ticketing state
  const [ticketTiers, setTicketTiers] = useState<TicketTier[]>([]);
  const [subEvents, setSubEvents] = useState<SubEvent[]>([]);
  const [showTierConfig, setShowTierConfig] = useState(false);
  const [showSubEventConfig, setShowSubEventConfig] = useState(false);
  
  const [formData, setFormData] = useState<EventFormData>({
    name: '',
    description: '',
    targetYear: 'All years',
    fee: '0',
    capacity: '50',
    date: '',
    type: 'social',
    image: '',
    refundDeadline: '',
    isUofTOnly: false,
    enableAdvancedTicketing: false,
    enableSubEvents: false
  });

  useEffect(() => {
    fetchEvents();
  }, []);

  const addNotification = (type: NotificationType, message: string) => {
    const id = Date.now().toString();
    setNotifications(prev => [...prev, { id, type, message }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const fetchEvents = async () => {
    try {
      const response = await fetch('/api/events');
      if (response.ok) {
        const data = await response.json();
        setEvents(data);
        addNotification('success', 'Events loaded successfully');
      } else {
        addNotification('error', 'Failed to load events');
      }
    } catch (error) {
      console.error('Failed to fetch events:', error);
      addNotification('error', 'Failed to connect to server');
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
        <div className="relative z-10 w-full max-w-md bg-white bg-opacity-95 p-8 rounded-lg shadow-lg backdrop-blur-sm text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-[#1c2a52] border-t-transparent mx-auto mb-6"></div>
          <h2 className="text-2xl font-bold text-[#1c2a52] mb-2">Loading Events</h2>
          <p className="text-gray-600">Please wait while we fetch the latest events...</p>
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
          {/* Notifications */}
          <div className="fixed top-4 right-4 z-50 space-y-2">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`max-w-md rounded-lg p-4 shadow-lg ${
                  notification.type === 'success' 
                    ? 'bg-green-600 text-white' 
                    : notification.type === 'error'
                    ? 'bg-red-600 text-white'
                    : 'bg-blue-600 text-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {notification.type === 'success' && <CheckCircle size={20} />}
                    {notification.type === 'error' && <AlertTriangle size={20} />}
                    {notification.type === 'info' && <Clock size={20} />}
                    <span>{notification.message}</span>
                  </div>
                  <button
                    onClick={() => removeNotification(notification.id)}
                    className="ml-4 hover:opacity-75"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>

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
              <h1 className="text-4xl font-bold text-[#1c2a52] mb-2">Event Management</h1>
              <p className="text-gray-700 text-lg">Manage your organization's events and track registrations</p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
            <div className="bg-white bg-opacity-95 rounded-lg p-6 shadow-lg border border-gray-200 backdrop-blur-sm">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Calendar className="h-6 w-6 text-[#1c2a52]" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-600 truncate">
                      Total Events
                    </dt>
                    <dd className="text-lg font-medium text-[#1c2a52]">
                      {events.length}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>

            <div className="bg-white bg-opacity-95 rounded-lg p-6 shadow-lg border border-gray-200 backdrop-blur-sm">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-600 truncate">
                      Active Events
                    </dt>
                    <dd className="text-lg font-medium text-[#1c2a52]">
                      {events.filter(e => !e.isArchived).length}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>

            <div className="bg-white bg-opacity-95 rounded-lg p-6 shadow-lg border border-gray-200 backdrop-blur-sm">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-600 truncate">
                      Total Registrations
                    </dt>
                    <dd className="text-lg font-medium text-[#1c2a52]">
                      {events.reduce((sum, e) => sum + (e.capacity - e.remainingSeats), 0)}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>

            <div className="bg-white bg-opacity-95 rounded-lg p-6 shadow-lg border border-gray-200 backdrop-blur-sm">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Archive className="h-6 w-6 text-gray-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-600 truncate">
                      Archived Events
                    </dt>
                    <dd className="text-lg font-medium text-[#1c2a52]">
                      {events.filter(e => e.isArchived).length}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          {/* Create Event Button */}
          <div className="mb-8 text-center">
            <button
              onClick={() => {
                setEditingEvent(null);
                // resetForm();
                setShowForm(true);
              }}
              className="inline-flex items-center gap-2 rounded-lg bg-[#1c2a52] px-6 py-3 text-white shadow-sm hover:bg-[#2a3c6b] focus:outline-none focus:ring-2 focus:ring-[#1c2a52] focus:ring-offset-2 transition-all duration-200"
            >
              <Plus size={20} />
              Create New Event
            </button>
          </div>

          {/* Filters and Search */}
          <div className="mb-8 bg-white bg-opacity-95 rounded-lg shadow-lg border border-gray-200 backdrop-blur-sm p-6">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Search Events
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:border-[#1c2a52] focus:ring-2 focus:ring-[#1c2a52] focus:ring-opacity-20"
                    placeholder="Search by name or description..."
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Event Type
                </label>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as any)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:border-[#1c2a52] focus:ring-2 focus:ring-[#1c2a52] focus:ring-opacity-20"
                >
                  <option value="all">All Types</option>
                  <option value="social">Social Events</option>
                  <option value="career">Career Events</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  value={filterArchived}
                  onChange={(e) => setFilterArchived(e.target.value as any)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:border-[#1c2a52] focus:ring-2 focus:ring-[#1c2a52] focus:ring-opacity-20"
                >
                  <option value="active">Active Events</option>
                  <option value="all">All Events</option>
                  <option value="archived">Archived Events</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sort By
                </label>
                <div className="flex gap-2">
                  <select
                    value={sortField}
                    onChange={(e) => setSortField(e.target.value as SortField)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:border-[#1c2a52] focus:ring-2 focus:ring-[#1c2a52] focus:ring-opacity-20"
                  >
                    <option value="date">Date</option>
                    <option value="name">Name</option>
                    <option value="capacity">Capacity</option>
                    <option value="registrations">Registrations</option>
                  </select>
                  <button
                    onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                  >
                    {sortDirection === 'asc' ? <SortAsc size={20} /> : <SortDesc size={20} />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Events List */}
          <div className="space-y-6">
            {events.length === 0 ? (
              <div className="text-center py-12 bg-white bg-opacity-95 rounded-lg shadow-lg border border-gray-200 backdrop-blur-sm">
                <Calendar className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-4 text-lg font-medium text-gray-900">No events found</h3>
                <p className="mt-2 text-gray-500">
                  Get started by creating your first event.
                </p>
              </div>
            ) : (
              events.map((event) => {
                const registrationCount = event.capacity - event.remainingSeats;
                const registrationRate = registrationCount / event.capacity;
                
                return (
                  <div
                    key={event.id}
                    className="bg-white bg-opacity-95 rounded-lg shadow-lg border border-gray-200 backdrop-blur-sm hover:shadow-xl transition-all duration-300"
                  >
                    <div className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-3">
                            <h3 className="text-xl font-bold text-[#1c2a52] truncate">
                              {event.name}
                            </h3>
                            <div className="flex gap-2">
                              {event.isArchived && (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-500 text-white">
                                  <Archive size={12} className="mr-1" />
                                  Archived
                                </span>
                              )}
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  event.type === 'career'
                                    ? 'bg-purple-100 text-purple-800'
                                    : 'bg-blue-100 text-blue-800'
                                }`}
                              >
                                {event.type === 'career' ? '💼' : '🎉'} {event.type === 'career' ? 'Career' : 'Social'}
                              </span>
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  registrationRate >= 0.9 
                                    ? 'bg-red-100 text-red-800'
                                    : registrationRate >= 0.7
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : 'bg-green-100 text-green-800'
                                }`}
                              >
                                {registrationCount}/{event.capacity} registered
                              </span>
                            </div>
                          </div>
                          
                          <p className="text-gray-600 mb-4 line-clamp-2">
                            {event.description}
                          </p>
                          
                          <div className="grid grid-cols-2 gap-4 md:grid-cols-4 text-sm">
                            <div className="flex items-center text-gray-500">
                              <Calendar size={16} className="mr-2 text-[#1c2a52]" />
                              <div>
                                <div className="font-medium">{new Date(event.date).toLocaleDateString()}</div>
                                <div className="text-xs">{new Date(event.date).toLocaleTimeString()}</div>
                              </div>
                            </div>
                            <div className="flex items-center text-gray-500">
                              <Users size={16} className="mr-2 text-green-600" />
                              <div>
                                <div className="font-medium">{event.targetYear}</div>
                                <div className="text-xs">Target audience</div>
                              </div>
                            </div>
                            <div className="flex items-center text-gray-500">
                              <DollarSign size={16} className="mr-2 text-yellow-600" />
                              <div>
                                <div className="font-medium">
                                  {event.enableAdvancedTicketing || event.enableSubEvents ? 'Advanced' : `$${event.fee}`}
                                </div>
                                <div className="text-xs">
                                  {event.enableAdvancedTicketing || event.enableSubEvents ? 'Pricing' : 'Registration fee'}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center text-gray-500">
                              <MapPin size={16} className="mr-2 text-purple-600" />
                              <div>
                                <div className="font-medium">{event.remainingSeats} left</div>
                                <div className="text-xs">Available spots</div>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex flex-col gap-2 ml-6">
                          <button
                            onClick={() => {/* handleEdit(event) */}}
                            className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-[#1c2a52] text-white hover:bg-[#2a3c6b] transition-colors"
                            title="Edit Event"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => {/* handleArchiveToggle(event) */}}
                            className={`inline-flex items-center justify-center w-10 h-10 rounded-lg text-white transition-colors ${
                              event.isArchived 
                                ? 'bg-green-600 hover:bg-green-700' 
                                : 'bg-yellow-600 hover:bg-yellow-700'
                            }`}
                            title={event.isArchived ? 'Restore Event' : 'Archive Event'}
                          >
                            {event.isArchived ? <ArchiveRestore size={16} /> : <Archive size={16} />}
                          </button>
                          <button
                            onClick={() => {/* handleDelete(event.id, event.name) */}}
                            className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors"
                            title="Delete Event"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 