'use client';

import { useState, useEffect } from 'react';
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
}

type NotificationType = 'success' | 'error' | 'info';

interface Notification {
  id: string;
  type: NotificationType;
  message: string;
}

type SortField = 'name' | 'date' | 'capacity' | 'registrations';
type SortDirection = 'asc' | 'desc';

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
    isUofTOnly: false
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      const url = editingEvent ? `/api/events/${editingEvent.id}` : '/api/events';
      const method = editingEvent ? 'PUT' : 'POST';
      
      const payload = {
        ...formData,
        isArchived: editingEvent?.isArchived || false
      };

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        await fetchEvents();
        setShowForm(false);
        setEditingEvent(null);
        resetForm();
        addNotification('success', editingEvent ? 'Event updated successfully' : 'Event created successfully');
      } else {
        const errorData = await response.json().catch(() => ({}));
        addNotification('error', errorData.detail || 'Failed to save event');
      }
    } catch (error) {
      console.error('Failed to save event:', error);
      addNotification('error', 'Failed to save event. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      targetYear: 'All years',
      fee: '0',
      capacity: '50',
      date: '',
      type: 'social',
      image: '',
      refundDeadline: '',
      isUofTOnly: false
    });
  };

  const handleEdit = (event: Event) => {
    setEditingEvent(event);
    
    // Format date for datetime-local input (YYYY-MM-DDTHH:MM)
    const formatDateForInput = (dateString: string) => {
      const date = new Date(dateString);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    };
    
    setFormData({
      name: event.name,
      description: event.description,
      targetYear: event.targetYear,
      fee: event.fee.toString(),
      capacity: event.capacity.toString(),
      date: formatDateForInput(event.date),
      type: event.type,
      image: event.image || '',
      refundDeadline: event.refundDeadline ? formatDateForInput(event.refundDeadline) : formatDateForInput(event.date),
      isUofTOnly: event.isUofTOnly !== undefined ? event.isUofTOnly : false
    });
    setShowForm(true);
  };

  const handleDelete = async (eventId: number, eventName: string) => {
    if (!confirm(`Are you sure you want to permanently delete "${eventName}"? This action cannot be undone.`)) return;

    try {
      const response = await fetch(`/api/events/${eventId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchEvents();
        addNotification('success', 'Event deleted successfully');
      } else {
        addNotification('error', 'Failed to delete event');
      }
    } catch (error) {
      console.error('Failed to delete event:', error);
      addNotification('error', 'Failed to delete event');
    }
  };

  const handleArchiveToggle = async (event: Event) => {
    try {
      const response = await fetch(`/api/events/${event.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...event,
          date: event.date.split('T')[0],
          isArchived: !event.isArchived
        }),
      });

      if (response.ok) {
        await fetchEvents();
        addNotification('success', event.isArchived ? 'Event restored from archive' : 'Event archived successfully');
      } else {
        addNotification('error', 'Failed to update event');
      }
    } catch (error) {
      console.error('Failed to update event:', error);
      addNotification('error', 'Failed to update event');
    }
  };

  const filteredAndSortedEvents = events
    .filter(event => {
      const matchesSearch = event.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           event.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = filterType === 'all' || event.type === filterType;
      const matchesArchived = filterArchived === 'all' || 
                             (filterArchived === 'active' && !event.isArchived) ||
                             (filterArchived === 'archived' && event.isArchived);
      return matchesSearch && matchesType && matchesArchived;
    })
    .sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortField) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'date':
          aValue = new Date(a.date);
          bValue = new Date(b.date);
          break;
        case 'capacity':
          aValue = a.capacity;
          bValue = b.capacity;
          break;
        case 'registrations':
          aValue = a.capacity - a.remainingSeats;
          bValue = b.capacity - b.remainingSeats;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getEventStatusColor = (event: Event) => {
    if (event.isArchived) return 'bg-gray-100 border-gray-300';
    const registrationRate = (event.capacity - event.remainingSeats) / event.capacity;
    if (registrationRate >= 0.9) return 'bg-red-50 border-red-200';
    if (registrationRate >= 0.7) return 'bg-yellow-50 border-yellow-200';
    return 'bg-green-50 border-green-200';
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString('en-US', { 
        weekday: 'short', 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      }),
      time: date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit' 
      })
    };
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">Loading events...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
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

      <div className="py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-bold text-gray-900 dark:text-white">Event Management</h1>
                <p className="mt-2 text-gray-600 dark:text-gray-400">
                  Manage your organization's events and track registrations
                </p>
              </div>
              <button
                onClick={() => {
                  setEditingEvent(null);
                  resetForm();
                  setShowForm(true);
                }}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200"
              >
                <Plus size={20} />
                Create New Event
              </button>
            </div>

            {/* Stats */}
            <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <Calendar className="h-6 w-6 text-gray-400" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                          Total Events
                        </dt>
                        <dd className="text-lg font-medium text-gray-900 dark:text-white">
                          {events.length}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <CheckCircle className="h-6 w-6 text-green-400" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                          Active Events
                        </dt>
                        <dd className="text-lg font-medium text-gray-900 dark:text-white">
                          {events.filter(e => !e.isArchived).length}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <Users className="h-6 w-6 text-blue-400" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                          Total Registrations
                        </dt>
                        <dd className="text-lg font-medium text-gray-900 dark:text-white">
                          {events.reduce((sum, e) => sum + (e.capacity - e.remainingSeats), 0)}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <Archive className="h-6 w-6 text-gray-400" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                          Archived Events
                        </dt>
                        <dd className="text-lg font-medium text-gray-900 dark:text-white">
                          {events.filter(e => e.isArchived).length}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Form Modal */}
          {showForm && (
            <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 flex items-center justify-center p-4">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-4xl w-full max-h-screen overflow-y-auto">
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                      {editingEvent ? 'Edit Event' : 'Create New Event'}
                    </h2>
                    <button
                      onClick={() => {
                        setShowForm(false);
                        setEditingEvent(null);
                      }}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <X size={24} />
                    </button>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                  <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    <div className="lg:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Event Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-3 text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20 transition-all"
                        placeholder="Enter event name..."
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Event Type *
                      </label>
                      <select
                        value={formData.type}
                        onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                        className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-3 text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20 transition-all"
                      >
                        <option value="social">🎉 Social Event</option>
                        <option value="career">💼 Career Event</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Target Year *
                      </label>
                      <select
                        value={formData.targetYear}
                        onChange={(e) => setFormData({ ...formData, targetYear: e.target.value })}
                        className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-3 text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20 transition-all"
                      >
                        <option value="All years">All years</option>
                        <option value="1st year">1st year</option>
                        <option value="2nd year">2nd year</option>
                        <option value="3rd year">3rd year</option>
                        <option value="4th year">4th year</option>
                        <option value="1st-2nd year">1st-2nd year</option>
                        <option value="2nd-3rd year">2nd-3rd year</option>
                        <option value="3rd-4th year">3rd-4th year</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Event Date *
                      </label>
                      <input
                        type="datetime-local"
                        required
                        value={formData.date}
                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                        className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-3 text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20 transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Refund Deadline
                      </label>
                      <input
                        type="datetime-local"
                        value={formData.refundDeadline}
                        onChange={(e) => setFormData({ ...formData, refundDeadline: e.target.value })}
                        className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-3 text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20 transition-all"
                      />
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Deadline for refund requests. If not set, defaults to event date.
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Registration Fee ($)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.fee}
                        onChange={(e) => setFormData({ ...formData, fee: e.target.value })}
                        className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-3 text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20 transition-all"
                        placeholder="0.00"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Event Capacity *
                      </label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={formData.capacity}
                        onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                        className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-3 text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20 transition-all"
                        placeholder="50"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        UofT Students Only
                      </label>
                      <div className="flex items-center space-x-3">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={formData.isUofTOnly}
                            onChange={(e) => setFormData({ ...formData, isUofTOnly: e.target.checked })}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                            Restrict to UofT students only
                          </span>
                        </label>
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        If checked, only University of Toronto students can see and register for this event.
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Image URL
                      </label>
                      <input
                        type="url"
                        value={formData.image}
                        onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                        className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-3 text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20 transition-all"
                        placeholder="https://example.com/image.jpg"
                      />
                    </div>

                    <div className="lg:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Event Description *
                      </label>
                      <textarea
                        rows={4}
                        required
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-3 text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20 transition-all resize-none"
                        placeholder="Describe your event in detail..."
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-4 pt-6 border-t border-gray-200 dark:border-gray-700">
                    <button
                      type="button"
                      onClick={() => {
                        setShowForm(false);
                        setEditingEvent(null);
                      }}
                      className="px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200"
                      disabled={saving}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {saving ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save size={16} />
                          {editingEvent ? 'Update Event' : 'Create Event'}
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Filters and Search */}
          <div className="mb-8 bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Search Events
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    placeholder="Search by name or description..."
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Event Type
                </label>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as any)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  <option value="all">All Types</option>
                  <option value="social">Social Events</option>
                  <option value="career">Career Events</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Status
                </label>
                <select
                  value={filterArchived}
                  onChange={(e) => setFilterArchived(e.target.value as any)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  <option value="active">Active Events</option>
                  <option value="all">All Events</option>
                  <option value="archived">Archived Events</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Sort By
                </label>
                <div className="flex gap-2">
                  <select
                    value={sortField}
                    onChange={(e) => setSortField(e.target.value as SortField)}
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="date">Date</option>
                    <option value="name">Name</option>
                    <option value="capacity">Capacity</option>
                    <option value="registrations">Registrations</option>
                  </select>
                  <button
                    onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                  >
                    {sortDirection === 'asc' ? <SortAsc size={20} /> : <SortDesc size={20} />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Events List */}
          <div className="space-y-6">
            {filteredAndSortedEvents.length === 0 ? (
              <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow">
                <Calendar className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">No events found</h3>
                <p className="mt-2 text-gray-500 dark:text-gray-400">
                  {searchTerm || filterType !== 'all' || filterArchived !== 'active' 
                    ? 'Try adjusting your search filters.'
                    : 'Get started by creating your first event.'
                  }
                </p>
              </div>
            ) : (
              filteredAndSortedEvents.map((event) => {
                const { date, time } = formatDateTime(event.date);
                const registrationCount = event.capacity - event.remainingSeats;
                const registrationRate = registrationCount / event.capacity;
                
                return (
                  <div
                    key={event.id}
                    className={`rounded-xl border-2 shadow-sm transition-all duration-200 hover:shadow-md ${getEventStatusColor(event)}`}
                  >
                    <div className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-3">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white truncate">
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
                                    ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                                    : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                                }`}
                              >
                                {event.type === 'career' ? '💼' : '🎉'} {event.type === 'career' ? 'Career' : 'Social'}
                              </span>
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  registrationRate >= 0.9 
                                    ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                    : registrationRate >= 0.7
                                    ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                                    : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                }`}
                              >
                                {registrationCount}/{event.capacity} registered
                              </span>
                            </div>
                          </div>
                          
                          <p className="text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                            {event.description}
                          </p>
                          
                          <div className="grid grid-cols-2 gap-4 md:grid-cols-4 text-sm">
                            <div className="flex items-center text-gray-500 dark:text-gray-400">
                              <Calendar size={16} className="mr-2 text-blue-500" />
                              <div>
                                <div className="font-medium">{date}</div>
                                <div className="text-xs">{time}</div>
                              </div>
                            </div>
                            <div className="flex items-center text-gray-500 dark:text-gray-400">
                              <Users size={16} className="mr-2 text-green-500" />
                              <div>
                                <div className="font-medium">{event.targetYear}</div>
                                <div className="text-xs">Target audience</div>
                              </div>
                            </div>
                            <div className="flex items-center text-gray-500 dark:text-gray-400">
                              <DollarSign size={16} className="mr-2 text-yellow-500" />
                              <div>
                                <div className="font-medium">${event.fee}</div>
                                <div className="text-xs">Registration fee</div>
                              </div>
                            </div>
                            <div className="flex items-center text-gray-500 dark:text-gray-400">
                              <MapPin size={16} className="mr-2 text-purple-500" />
                              <div>
                                <div className="font-medium">{event.remainingSeats} left</div>
                                <div className="text-xs">Available spots</div>
                              </div>
                            </div>
                          </div>

                          {registrationCount > 0 && (
                            <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                              <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                                Registered Participants ({registrationCount})
                              </h4>
                              <div className="flex flex-wrap gap-2">
                                {(event.registeredUsers || event.registrations || []).slice(0, 5).map((item: any, index: number) => {
                                  const user = item.user || item;
                                  return (
                                    <span
                                      key={index}
                                      className="inline-flex items-center px-2 py-1 rounded-md bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 text-xs"
                                    >
                                      {user.firstName} {user.lastName}
                                    </span>
                                  );
                                })}
                                {registrationCount > 5 && (
                                  <span className="inline-flex items-center px-2 py-1 rounded-md bg-gray-100 text-gray-800 dark:bg-gray-600 dark:text-gray-200 text-xs">
                                    +{registrationCount - 5} more
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex flex-col gap-2 ml-6">
                          <button
                            onClick={() => handleEdit(event)}
                            className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                            title="Edit Event"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => handleArchiveToggle(event)}
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
                            onClick={() => handleDelete(event.id, event.name)}
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