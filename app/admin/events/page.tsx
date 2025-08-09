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
  subEventPrices?: number[]; // Added for complex pricing
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

  const handleTargetYearChange = (year: string, checked: boolean) => {
    let newSelectedYears: string[];
    
    if (year === 'All years') {
      if (checked) {
        // If "All years" is selected, clear other selections
        newSelectedYears = ['All years'];
      } else {
        // If "All years" is unchecked, don't allow unchecking it
        return;
      }
    } else {
      if (checked) {
        // Add the year and remove "All years" if it was selected
        newSelectedYears = selectedTargetYears.filter(y => y !== 'All years').concat(year);
      } else {
        // Remove the year
        newSelectedYears = selectedTargetYears.filter(y => y !== year);
        // If no years selected, default to "All years"
        if (newSelectedYears.length === 0) {
          newSelectedYears = ['All years'];
        }
      }
    }
    
    setSelectedTargetYears(newSelectedYears);
    setFormData({ ...formData, targetYear: newSelectedYears.join(', ') });
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
        isArchived: editingEvent?.isArchived || false,
        ticketTiers: formData.enableAdvancedTicketing ? ticketTiers : [],
        subEvents: formData.enableSubEvents ? subEvents : []
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
    setSelectedTargetYears(['All years']);
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
      isUofTOnly: false,
      enableAdvancedTicketing: false,
      enableSubEvents: false
    });
  };

  const handleEdit = async (event: Event) => {
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
    
    // Parse target years from the event
    const targetYears = event.targetYear.split(', ').filter(year => year.trim() !== '');
    setSelectedTargetYears(targetYears.length > 0 ? targetYears : ['All years']);
    
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
      isUofTOnly: event.isUofTOnly !== undefined ? event.isUofTOnly : false,
      enableAdvancedTicketing: event.enableAdvancedTicketing !== undefined ? event.enableAdvancedTicketing : false,
      enableSubEvents: event.enableSubEvents !== undefined ? event.enableSubEvents : false
    });

    // Load existing ticket tiers and sub-events if advanced features are enabled
    if (event.enableAdvancedTicketing || event.enableSubEvents) {
      try {
        const response = await fetch(`/api/events/${event.id}/ticket-options`);
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            // Load existing ticket tiers
            if (data.ticketTiers && data.ticketTiers.length > 0) {
              const formattedTiers = data.ticketTiers.map((tier: any) => ({
                name: tier.name,
                price: tier.price,
                capacity: tier.capacity,
                targetYear: tier.targetYear || 'All years',
                startDate: tier.startDate ? new Date(tier.startDate).toISOString().slice(0, 16) : '',
                endDate: tier.endDate ? new Date(tier.endDate).toISOString().slice(0, 16) : '',
                isActive: tier.isActive !== undefined ? tier.isActive : true,
                subEventPrices: tier.subEventPrices || undefined // Handle complex pricing
              }));
              setTicketTiers(formattedTiers);
            } else {
              setTicketTiers([]);
            }

            // Load existing sub-events
            if (data.subEvents && data.subEvents.length > 0) {
              const formattedSubEvents = data.subEvents.map((subEvent: any) => ({
                name: subEvent.name,
                description: subEvent.description || '',
                price: subEvent.price,
                capacity: subEvent.capacity,
                isStandalone: subEvent.isStandalone !== undefined ? subEvent.isStandalone : true,
                isComboOption: subEvent.isComboOption !== undefined ? subEvent.isComboOption : false
              }));
              setSubEvents(formattedSubEvents);
            } else {
              setSubEvents([]);
            }
          }
        }
      } catch (error) {
        console.error('Failed to load ticket options for editing:', error);
        // Reset to empty arrays if fetch fails
        setTicketTiers([]);
        setSubEvents([]);
      }
    } else {
      // Reset arrays if advanced features are not enabled
      setTicketTiers([]);
      setSubEvents([]);
    }

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
                      <div className="grid grid-cols-2 gap-3 p-4 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700">
                        {targetYearOptions.map((option) => (
                          <label key={option.value} className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={selectedTargetYears.includes(option.value)}
                              onChange={(e) => handleTargetYearChange(option.value, e.target.checked)}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-700 dark:text-gray-300">
                              {option.label}
                            </span>
                          </label>
                        ))}
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Select target years for this event. "All years" overrides other selections.
                      </p>
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
                        Event Pricing Configuration
                      </label>
                      <div className="space-y-4">
                        {/* Simple Pricing Option */}
                        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                          <label className="flex items-start space-x-3 cursor-pointer">
                            <input
                              type="radio"
                              name="pricingMode"
                              checked={!formData.enableSubEvents}
                              onChange={() => {
                                setFormData({ 
                                  ...formData, 
                                  enableAdvancedTicketing: true,
                                  enableSubEvents: false 
                                });
                                // Don't clear existing data when switching modes
                              }}
                              className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                            />
                            <div className="flex-1">
                              <div className="flex items-center space-x-2">
                                <span className="text-sm font-medium text-gray-900 dark:text-white">
                                  Simple Pricing
                                </span>
                              </div>
                              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                Early Bird → Regular pricing. One price per person.
                              </p>
                            </div>
                          </label>
                        </div>

                        {/* Complex Pricing Option */}
                        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                          <label className="flex items-start space-x-3 cursor-pointer">
                            <input
                              type="radio"
                              name="pricingMode"
                              checked={formData.enableSubEvents}
                              onChange={() => {
                                setFormData({ 
                                  ...formData, 
                                  enableAdvancedTicketing: true,
                                  enableSubEvents: true 
                                });
                                // Don't clear existing data when switching modes
                              }}
                              className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                            />
                            <div className="flex-1">
                              <div className="flex items-center space-x-2">
                                <span className="text-sm font-medium text-gray-900 dark:text-white">
                                  Matrix Pricing
                                </span>
                              </div>
                              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                Multiple sub-events with flexible pricing matrix.
                              </p>
                            </div>
                          </label>
                        </div>

                        {/* Configuration Links */}
                        {(formData.enableAdvancedTicketing || formData.enableSubEvents) && (
                          <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                                  {formData.enableSubEvents ? 'Price Matrix Configuration' : 'Tier Configuration'}
                                </h4>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                  {formData.enableSubEvents 
                                    ? `${ticketTiers.length} tiers × ${subEvents.length} sub-events = ${ticketTiers.length * subEvents.length} price points`
                                    : `${ticketTiers.length} ticket tiers configured`
                                  }
                                </p>
                              </div>
                              <div className="flex space-x-2">
                                {formData.enableSubEvents && (
                                  <button
                                    type="button"
                                    onClick={() => setShowSubEventConfig(true)}
                                    className="px-3 py-2 text-sm text-blue-600 hover:text-blue-800 border border-blue-200 rounded-lg hover:bg-blue-50"
                                  >
                                    Configure Sub-Events ({subEvents.length})
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => setShowTierConfig(true)}
                                  className="px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                >
                                  {formData.enableSubEvents ? 'Configure Price Matrix' : 'Configure Tiers'} 
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
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
                                <div className="font-medium">
                                  {event.enableAdvancedTicketing || event.enableSubEvents ? 'Advanced' : `$${event.fee}`}
                                </div>
                                <div className="text-xs">
                                  {event.enableAdvancedTicketing || event.enableSubEvents ? 'Pricing' : 'Registration fee'}
                                </div>
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

                          {/* Advanced Configuration Details */}
                          {(event.enableAdvancedTicketing || event.enableSubEvents) && (
                            <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg">
                              <h4 className="text-sm font-medium text-blue-900 dark:text-blue-200 mb-3 flex items-center">
                                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V4a2 2 0 00-2-2H6zm1 2a1 1 0 000 2h6a1 1 0 100-2H7zm6 7a1 1 0 011 1v3a1 1 0 11-2 0v-3a1 1 0 011-1zm-3 3a1 1 0 100 2h.01a1 1 0 100-2H10zm-4 1a1 1 0 011-1h.01a1 1 0 110 2H7a1 1 0 01-1-1zm1-4a1 1 0 100 2h.01a1 1 0 100-2H7zm2 1a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1zm4-4a1 1 0 100 2h.01a1 1 0 100-2H13z" clipRule="evenodd" />
                                </svg>
                                Advanced Configuration
                              </h4>
                              
                              {(event as any).ticketTiers && (event as any).ticketTiers.length > 0 && (
                                <div className="mb-3">
                                  <h5 className="text-xs font-medium text-blue-800 dark:text-blue-300 mb-2">🎫 Ticket Tiers:</h5>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                    {(event as any).ticketTiers.map((tier: any, index: number) => (
                                      <div key={index} className="bg-white dark:bg-gray-800 rounded-md p-2 border border-blue-200 dark:border-blue-600">
                                        <div className="text-xs">
                                          <div className="font-medium text-gray-900 dark:text-white">{tier.name}</div>
                                          <div className="text-gray-600 dark:text-gray-400">
                                            ${tier.price} • {tier.capacity} spots
                                          </div>
                                          {tier.targetYear !== 'All years' && (
                                            <div className="text-blue-600 dark:text-blue-400 text-[10px]">
                                              Target: {tier.targetYear}
                                            </div>
                                          )}
                                          <div className={`text-[10px] mt-1 ${tier.isAvailable ? 'text-green-600' : 'text-red-600'}`}>
                                            {tier.remaining_capacity || 0} remaining
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {(event as any).subEvents && (event as any).subEvents.length > 0 && (
                                <div>
                                  <h5 className="text-xs font-medium text-blue-800 dark:text-blue-300 mb-2">🎊 Sub-Events:</h5>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                    {(event as any).subEvents.map((subEvent: any, index: number) => (
                                      <div key={index} className="bg-white dark:bg-gray-800 rounded-md p-2 border border-blue-200 dark:border-blue-600">
                                        <div className="text-xs">
                                          <div className="font-medium text-gray-900 dark:text-white">{subEvent.name}</div>
                                          <div className="text-gray-600 dark:text-gray-400">
                                            ${subEvent.price} • {subEvent.capacity} spots
                                          </div>
                                          <div className={`text-[10px] mt-1 ${subEvent.isAvailable ? 'text-green-600' : 'text-red-600'}`}>
                                            {subEvent.remaining_capacity || 0} remaining
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

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

      {/* Ticket Tier Configuration Modal */}
      {showTierConfig && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Configure Ticket Tiers
                {formData.enableSubEvents && (
                  <span className="text-sm font-normal text-blue-600 ml-2">
                    (with Sub-Events Pricing)
                  </span>
                )}
              </h3>
              <button
                onClick={() => setShowTierConfig(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Configuration Mode Info */}
              <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <div className="text-blue-600 dark:text-blue-400 mt-1">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-blue-900 dark:text-blue-200">
                      {formData.enableSubEvents ? 'Complex Pricing Mode' : 'Simple Pricing Mode'}
                    </h4>
                    <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                      {formData.enableSubEvents 
                        ? 'Each tier can have different prices for each sub-event (1st party, 2nd party, combo)'
                        : 'Simple Early Bird → Regular → Walk-in progression with fixed pricing'
                      }
                    </p>
                  </div>
                </div>
              </div>

              {!formData.enableSubEvents ? (
                // Simple Mode: Traditional tier configuration
                <div className="space-y-4">
                  {ticketTiers.map((tier, index) => (
                    <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-medium text-gray-900 dark:text-white">
                          {tier.name} Tier
                        </h4>
                        <button
                          onClick={() => {
                            const newTiers = ticketTiers.filter((_, i) => i !== index);
                            setTicketTiers(newTiers);
                          }}
                          className="text-red-600 hover:text-red-800 text-sm font-medium"
                        >
                          🗑️ 削除
                        </button>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Tier Name
                          </label>
                          <input
                            type="text"
                            value={tier.name}
                            onChange={(e) => {
                              const newTiers = [...ticketTiers];
                              newTiers[index].name = e.target.value;
                              setTicketTiers(newTiers);
                            }}
                            className="w-full rounded border border-gray-300 dark:border-gray-600 px-3 py-2 text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                            placeholder="e.g., Early Bird"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Price ($)
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={tier.price === 0 ? '' : tier.price}
                            onChange={(e) => {
                              const newTiers = [...ticketTiers];
                              newTiers[index].price = e.target.value === '' ? 0 : parseFloat(e.target.value);
                              setTicketTiers(newTiers);
                            }}
                            className="w-full rounded border border-gray-300 dark:border-gray-600 px-3 py-2 text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Capacity
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={tier.capacity === 0 ? '' : tier.capacity}
                            onChange={(e) => {
                              const newTiers = [...ticketTiers];
                              const newValue = e.target.value === '' ? 0 : parseInt(e.target.value);
                              newTiers[index].capacity = newValue;
                              setTicketTiers(newTiers);
                            }}
                            className="w-full rounded border border-gray-300 dark:border-gray-600 px-3 py-2 text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Target Year
                          </label>
                          <select
                            value={tier.targetYear}
                            onChange={(e) => {
                              const newTiers = [...ticketTiers];
                              newTiers[index].targetYear = e.target.value;
                              setTicketTiers(newTiers);
                            }}
                            className="w-full rounded border border-gray-300 dark:border-gray-600 px-3 py-2 text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                          >
                            <option value="All years">All years</option>
                            <option value="1st year">1st year</option>
                            <option value="2nd year">2nd year</option>
                            <option value="3rd year">3rd year</option>
                            <option value="4th year">4th year</option>
                            <option value="1st-2nd year">1st-2nd year</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Start Date & Time
                          </label>
                          <input
                            type="datetime-local"
                            value={tier.startDate}
                            onChange={(e) => {
                              const newTiers = [...ticketTiers];
                              newTiers[index].startDate = e.target.value;
                              setTicketTiers(newTiers);
                            }}
                            className="w-full rounded border border-gray-300 dark:border-gray-600 px-3 py-2 text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            End Date & Time
                          </label>
                          <input
                            type="datetime-local"
                            value={tier.endDate}
                            onChange={(e) => {
                              const newTiers = [...ticketTiers];
                              newTiers[index].endDate = e.target.value;
                              setTicketTiers(newTiers);
                            }}
                            className="w-full rounded border border-gray-300 dark:border-gray-600 px-3 py-2 text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                          />
                        </div>
                      </div>
                      
                      <div className="mt-4">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={tier.isActive}
                            onChange={(e) => {
                              const newTiers = [...ticketTiers];
                              newTiers[index].isActive = e.target.checked;
                              setTicketTiers(newTiers);
                            }}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Active</span>
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                // Complex Mode: Tier + Sub-Event matrix pricing
                <div className="space-y-6">
                  {ticketTiers.length > 0 && subEvents.length > 0 ? (
                    <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 dark:text-white mb-4">
                        Pricing Matrix: Tiers × Sub-Events
                      </h4>
                      
                      {/* Pricing Matrix Table */}
                      <div className="overflow-x-auto">
                        <table className="min-w-full border border-gray-200 dark:border-gray-700">
                          <thead className="bg-gray-100 dark:bg-gray-800">
                            <tr>
                              <th className="border border-gray-200 dark:border-gray-700 px-4 py-2 text-left text-sm font-medium text-gray-900 dark:text-white">
                                Tier / Sub-Event
                              </th>
                              {subEvents.map((subEvent, subIndex) => (
                                <th key={subIndex} className="border border-gray-200 dark:border-gray-700 px-4 py-2 text-center text-sm font-medium text-gray-900 dark:text-white">
                                  {subEvent.name}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {ticketTiers.map((tier, tierIndex) => (
                              <tr key={tierIndex}>
                                <td className="border border-gray-200 dark:border-gray-700 px-4 py-2 font-medium text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800">
                                  {tier.name}
                                  <div className="text-xs text-gray-500 dark:text-gray-400">
                                    Capacity: {tier.capacity}
                                  </div>
                                </td>
                                {subEvents.map((subEvent, subIndex) => (
                                  <td key={subIndex} className="border border-gray-200 dark:border-gray-700 px-2 py-2">
                                    <input
                                      type="number"
                                      min="0"
                                      value={tier.subEventPrices?.[subIndex] !== undefined 
                                        ? (tier.subEventPrices[subIndex] === 0 ? '' : tier.subEventPrices[subIndex])
                                        : ''
                                      }
                                      onChange={(e) => {
                                        const newTiers = [...ticketTiers];
                                        const newValue = e.target.value === '' ? 0 : parseFloat(e.target.value);
                                        
                                        if (!newTiers[tierIndex].subEventPrices) {
                                          newTiers[tierIndex].subEventPrices = subEvents.map((_, i) => 
                                            i === subIndex ? newValue : 0
                                          );
                                        } else {
                                          newTiers[tierIndex].subEventPrices[subIndex] = newValue;
                                        }
                                        setTicketTiers(newTiers);
                                      }}
                                      className="w-full text-center rounded border border-gray-300 dark:border-gray-600 px-2 py-1 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                                    />
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      
                      <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
                        💡 <strong>Tip:</strong> Set different prices for each tier-subevent combination. 
                        Early Bird 1次会 might be $30, while Regular 1次会 is $35.
                      </div>
                    </div>
                  ) : (
                    <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4">
                      <p className="text-sm text-yellow-800 dark:text-yellow-200">
                        ⚠️ Please configure both ticket tiers and sub-events first to set up the pricing matrix.
                      </p>
                    </div>
                  )}
                  
                  {/* Tier Configuration for Complex Mode */}
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white mb-4">Tier Capacity Settings</h4>
                    <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 mb-4">
                      <div className="flex items-start space-x-3">
                        <div className="text-gray-600 dark:text-gray-400 mt-1">
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div>
                          <h5 className="text-sm font-medium text-gray-900 dark:text-gray-200">How Tier Capacity Works</h5>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            Early Bird gets first X spots, then Regular gets next Y spots. 
                            When Early Bird sells out, registration automatically moves to Regular pricing.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {ticketTiers.map((tier, index) => (
                        <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Tier Name
                              </label>
                              <input
                                type="text"
                                value={tier.name}
                                onChange={(e) => {
                                  const newTiers = [...ticketTiers];
                                  newTiers[index].name = e.target.value;
                                  setTicketTiers(newTiers);
                                }}
                                className="w-full rounded border border-gray-300 dark:border-gray-600 px-3 py-2 text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Capacity
                                <span className="text-xs text-gray-500 ml-1">(shared across all sub-events)</span>
                              </label>
                              <input
                                type="number"
                                min="0"
                                value={tier.capacity === 0 ? '' : tier.capacity}
                                onChange={(e) => {
                                  const newTiers = [...ticketTiers];
                                  newTiers[index].capacity = e.target.value === '' ? 0 : parseInt(e.target.value);
                                  setTicketTiers(newTiers);
                                }}
                                className="w-full rounded border border-gray-300 dark:border-gray-600 px-3 py-2 text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Target Year
                              </label>
                              <select
                                value={tier.targetYear}
                                onChange={(e) => {
                                  const newTiers = [...ticketTiers];
                                  newTiers[index].targetYear = e.target.value;
                                  setTicketTiers(newTiers);
                                }}
                                className="w-full rounded border border-gray-300 dark:border-gray-600 px-3 py-2 text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                              >
                                <option value="All years">All years</option>
                                <option value="1st year">1st year</option>
                                <option value="2nd year">2nd year</option>
                                <option value="3rd year">3rd year</option>
                                <option value="4th year">4th year</option>
                                <option value="1st-2nd year">1st-2nd year</option>
                              </select>
                            </div>
                          </div>
                          
                          <div className="mt-3 flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                              <label className="flex items-center">
                                <input
                                  type="checkbox"
                                  checked={tier.isActive}
                                  onChange={(e) => {
                                    const newTiers = [...ticketTiers];
                                    newTiers[index].isActive = e.target.checked;
                                    setTicketTiers(newTiers);
                                  }}
                                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Active</span>
                              </label>
                            </div>
                                                         <button
                               onClick={() => {
                                 const newTiers = ticketTiers.filter((_, i) => i !== index);
                                 setTicketTiers(newTiers);
                               }}
                               className="text-red-600 hover:text-red-800 text-sm font-medium"
                             >
                               🗑️ 削除
                             </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              
              {/* Add Tier Button */}
              <button
                onClick={() => {
                  const newTier = {
                    name: '',
                    price: 0,
                    capacity: 0,
                    targetYear: 'All years',
                    startDate: '',
                    endDate: '',
                    isActive: true,
                    subEventPrices: formData.enableSubEvents ? [] : undefined
                  };
                  setTicketTiers([...ticketTiers, newTier]);
                }}
                className="w-full border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg py-4 text-gray-500 dark:text-gray-400 hover:border-gray-400 hover:text-gray-600 transition-colors"
              >
                + Add New Tier
              </button>
            </div>
            
            <div className="flex justify-end space-x-3 p-6 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setShowTierConfig(false)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={() => setShowTierConfig(false)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Save Configuration
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sub-Event Configuration Modal */}
      {showSubEventConfig && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Configure Sub-Events
                <span className="text-sm font-normal text-gray-500 ml-2">
                  (Set capacity for each part)
                </span>
              </h3>
              <button
                onClick={() => setShowSubEventConfig(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <div className="text-blue-600 dark:text-blue-400 mt-1">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-blue-900 dark:text-blue-200">Sub-Event Capacity Settings</h4>
                    <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                      Set the maximum number of people for each part of your event. Prices will be configured in the Price Matrix.
                    </p>
                  </div>
                </div>
              </div>

              {subEvents.map((subEvent, index) => (
                <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      Sub-Event {index + 1}
                    </h4>
                    <button
                      onClick={() => {
                        const newSubEvents = subEvents.filter((_, i) => i !== index);
                        setSubEvents(newSubEvents);
                        
                        // Update all ticket tiers to remove the corresponding sub-event price
                        const newTiers = ticketTiers.map(tier => {
                          if (tier.subEventPrices && tier.subEventPrices.length > index) {
                            const newPrices = [...tier.subEventPrices];
                            newPrices.splice(index, 1);
                            return { ...tier, subEventPrices: newPrices };
                          }
                          return tier;
                        });
                        setTicketTiers(newTiers);
                      }}
                      className="text-red-600 hover:text-red-800 text-sm font-medium"
                    >
                      🗑️ 削除
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Event Name
                      </label>
                      <input
                        type="text"
                        value={subEvent.name}
                        onChange={(e) => {
                          const newSubEvents = [...subEvents];
                          newSubEvents[index].name = e.target.value;
                          setSubEvents(newSubEvents);
                        }}
                        className="w-full rounded border border-gray-300 dark:border-gray-600 px-3 py-2 text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                        placeholder="e.g., 1次会 (1st Party)"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Maximum Capacity
                      </label>
                                              <input
                          type="number"
                          min="0"
                          value={subEvent.capacity === 0 ? '' : subEvent.capacity}
                          onChange={(e) => {
                            const newSubEvents = [...subEvents];
                            newSubEvents[index].capacity = e.target.value === '' ? 0 : parseInt(e.target.value);
                            setSubEvents(newSubEvents);
                          }}
                          className="w-full rounded border border-gray-300 dark:border-gray-600 px-3 py-2 text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                        />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Description (Optional)
                      </label>
                      <input
                        type="text"
                        value={subEvent.description}
                        onChange={(e) => {
                          const newSubEvents = [...subEvents];
                          newSubEvents[index].description = e.target.value;
                          setSubEvents(newSubEvents);
                        }}
                        className="w-full rounded border border-gray-300 dark:border-gray-600 px-3 py-2 text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                        placeholder="Brief description"
                      />
                    </div>
                  </div>
                </div>
              ))}
              
              <button
                onClick={() => {
                  setSubEvents([...subEvents, {
                    name: '',
                    description: '',
                    price: 0,
                    capacity: 0,
                    isStandalone: true,
                    isComboOption: false
                  }]);
                }}
                className="w-full border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg py-4 text-gray-500 dark:text-gray-400 hover:border-gray-400 hover:text-gray-600 transition-colors"
              >
                + Add Sub-Event
              </button>

              <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <div className="text-yellow-600 dark:text-yellow-400 mt-1">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-yellow-900 dark:text-yellow-200">💡 Pro Tip</h4>
                    <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                      Capacity is per sub-event, but tiers (Early Bird/Regular) share the same pool. 
                      Set conservative capacities - you can always increase later!
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 p-6 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setShowSubEventConfig(false)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={() => setShowSubEventConfig(false)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Save Sub-Events
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 