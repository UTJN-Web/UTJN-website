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
  fee: string; // Will be calculated from pricing configuration
  capacity: string; // Will be calculated from pricing configuration
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
  subEventCapacities?: number[]; // Added for capacity matrix
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
    fee: '0', // Will be calculated from pricing configuration
    capacity: '50', // Will be calculated from pricing configuration
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

  // Image upload functions
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        addNotification('error', 'Invalid file type. Please select JPG, PNG, GIF, or WebP image.');
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        addNotification('error', 'File size too large. Please select an image smaller than 5MB.');
        return;
      }

      setImageFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadImage = async (): Promise<string> => {
    if (!imageFile) {
      return formData.image; // Return existing image URL if no new file
    }

    setUploadingImage(true);
    try {
      // Convert file to base64
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(imageFile);
      });

      const response = await fetch('/api/admin/upload-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageData: base64,
          fileName: imageFile.name,
          eventId: editingEvent?.id
        }),
      });

      if (response.ok) {
        const result = await response.json();
        return result.imageUrl;
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to upload image');
      }
    } catch (error) {
      console.error('Image upload error:', error);
      addNotification('error', 'Failed to upload image. Please try again.');
      throw error;
    } finally {
      setUploadingImage(false);
    }
  };

  const clearImage = () => {
    setImageFile(null);
    setImagePreview('');
    setFormData({ ...formData, image: '' });
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
        console.log('Fetched events:', data);
        
        // Debug: Check pricing configuration for each event
        data.forEach((event: any) => {
          console.log(`Event "${event.name}":`, {
            enableAdvancedTicketing: event.enableAdvancedTicketing,
            enableSubEvents: event.enableSubEvents,
            ticketTiers: event.ticketTiers ? event.ticketTiers.length : 0,
            subEvents: event.subEvents ? event.subEvents.length : 0
          });
        });
        
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

  // Create default ticket tiers
  const createDefaultTiers = () => {
    // Check if event date is set
    if (!formData.date) {
      console.error('Event date is not set, cannot create default tiers');
      return [];
    }
    
    const eventDate = new Date(formData.date);
    
    // Set all times to EST midnight (00:00)
    const today = new Date();
    // Convert to EST midnight (UTC-5)
    const estOffset = -5 * 60; // EST is UTC-5
    const todayUTC = today.getTime() + (today.getTimezoneOffset() * 60000);
    const todayEST = new Date(todayUTC + (estOffset * 60000));
    todayEST.setHours(0, 0, 0, 0);
    
    // Early Bird: Start from midnight today, end at midnight on event date
    const earlyBirdEnd = new Date(eventDate);
    const earlyBirdUTC = earlyBirdEnd.getTime() + (earlyBirdEnd.getTimezoneOffset() * 60000);
    const earlyBirdEST = new Date(earlyBirdUTC + (estOffset * 60000));
    earlyBirdEST.setHours(0, 0, 0, 0);
    
    // Regular: Start from Early Bird end (midnight), end at event date
    const regularEnd = new Date(eventDate);
    
    const defaultTiers = [
      {
        name: 'Early Bird',
        price: 15,
        capacity: 25,
        targetYear: 'All years',
        startDate: todayEST.toISOString().slice(0, 16),
        endDate: earlyBirdEST.toISOString().slice(0, 16),
        isActive: true
      },
      {
        name: 'Regular',
        price: 20,
        capacity: 25,
        targetYear: 'All years',
        startDate: earlyBirdEST.toISOString().slice(0, 16),
        endDate: regularEnd.toISOString().slice(0, 16),
        isActive: true
      }
    ];
    
    console.log('Created default tiers:', defaultTiers);
    return defaultTiers;
  };

  // Calculate basic fee and capacity from pricing configuration
  const calculateBasicValues = () => {
    if (formData.enableSubEvents && subEvents.length > 0) {
      // For sub-events, use the highest price and total capacity
      const maxPrice = Math.max(...subEvents.map(se => se.price));
      const totalCapacity = subEvents.reduce((sum, se) => sum + se.capacity, 0);
      return { fee: maxPrice, capacity: totalCapacity };
    } else if (formData.enableAdvancedTicketing && ticketTiers.length > 0) {
      // For ticket tiers, use the regular price and total capacity
      const regularTier = ticketTiers.find(t => t.name === 'Regular') || ticketTiers[0];
      const totalCapacity = ticketTiers.reduce((sum, t) => sum + t.capacity, 0);
      return { fee: regularTier.price, capacity: totalCapacity };
    } else {
      // Fallback to default values (should not happen with new UI)
      return { fee: 0, capacity: 50 };
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      // Upload image first if there's a new file
      let imageUrl = formData.image;
      if (imageFile) {
        try {
          imageUrl = await uploadImage();
        } catch (error) {
          setSaving(false);
          return; // Stop submission if image upload fails
        }
      }

      // Calculate basic values from pricing configuration
      const { fee, capacity } = calculateBasicValues();

      // Create default tiers if advanced ticketing is enabled but no tiers are configured
      let finalTicketTiers = ticketTiers;
      if (formData.enableAdvancedTicketing && ticketTiers.length === 0) {
        finalTicketTiers = createDefaultTiers();
        console.log('Using default tiers:', finalTicketTiers);
      }

      // Validate capacity for Matrix Pricing
      if (formData.enableSubEvents && formData.enableAdvancedTicketing) {
        const subEventCapacityErrors: string[] = [];
        
        subEvents.forEach((subEvent, subIndex) => {
          const totalTierCapacityForSubEvent = finalTicketTiers.reduce((sum, tier) => 
            sum + (tier.subEventCapacities?.[subIndex] || 0), 0
          );
          
          if (totalTierCapacityForSubEvent !== subEvent.capacity) {
            subEventCapacityErrors.push(
              `${subEvent.name}: Tier total (${totalTierCapacityForSubEvent}) ≠ Sub-event capacity (${subEvent.capacity})`
            );
          }
        });
        
        if (subEventCapacityErrors.length > 0) {
          addNotification('error', `Capacity matrix validation failed: ${subEventCapacityErrors.join(', ')}. Please adjust the capacity matrix.`);
          setSaving(false);
          return;
        }
      }

      const url = editingEvent ? `/api/events/${editingEvent.id}` : '/api/events';
      const method = editingEvent ? 'PUT' : 'POST';
      
      const payload = {
        ...formData,
        fee: fee.toString(),
        capacity: capacity.toString(),
        image: imageUrl, // Use the uploaded image URL
        isArchived: editingEvent?.isArchived || false,
        ticketTiers: formData.enableAdvancedTicketing ? finalTicketTiers : [],
        subEvents: formData.enableSubEvents ? subEvents : []
      };

      console.log('Submitting event payload:', {
        enableAdvancedTicketing: formData.enableAdvancedTicketing,
        enableSubEvents: formData.enableSubEvents,
        ticketTiersCount: finalTicketTiers.length,
        subEventsCount: subEvents.length,
        payload: payload
      });

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const responseData = await response.json().catch(() => ({}));
        console.log('Event saved successfully:', responseData);
        await fetchEvents();
        setShowForm(false);
        setEditingEvent(null);
        resetForm();
        clearImage(); // Clear image state
        addNotification('success', editingEvent ? 'Event updated successfully' : 'Event created successfully');
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Failed to save event:', errorData);
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
      fee: '0', // Will be calculated from pricing configuration
      capacity: '50', // Will be calculated from pricing configuration
      date: '',
      type: 'social',
      image: '',
      refundDeadline: '',
      isUofTOnly: false,
      enableAdvancedTicketing: false,
      enableSubEvents: false
    });
    // Reset image state
    setImageFile(null);
    setImagePreview('');
    // Reset pricing configuration
    setTicketTiers([]);
    setSubEvents([]);
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
      fee: '0', // Will be calculated from pricing configuration
      capacity: '50', // Will be calculated from pricing configuration
      date: formatDateForInput(event.date),
      type: event.type,
      image: event.image || '',
      refundDeadline: event.refundDeadline ? formatDateForInput(event.refundDeadline) : formatDateForInput(event.date),
      isUofTOnly: event.isUofTOnly !== undefined ? event.isUofTOnly : false,
      enableAdvancedTicketing: event.enableAdvancedTicketing !== undefined ? event.enableAdvancedTicketing : false,
      enableSubEvents: event.enableSubEvents !== undefined ? event.enableSubEvents : false
    });

    // Set image preview if event has an image
    if (event.image) {
      setImagePreview(event.image);
    } else {
      setImagePreview('');
    }
    setImageFile(null); // Clear any existing file

    // Load existing ticket tiers and sub-events from the event data
    if (event.enableAdvancedTicketing && (event as any).ticketTiers) {
      console.log('Loading existing ticket tiers:', (event as any).ticketTiers);
      const formattedTiers = (event as any).ticketTiers.map((tier: any) => {
        // Format dates to EST midnight (00:00)
        const formatToMidnight = (dateString: string) => {
          if (!dateString) return '';
          const date = new Date(dateString);
          // Convert to EST midnight (UTC-5)
          const estOffset = -5 * 60; // EST is UTC-5
          const utc = date.getTime() + (date.getTimezoneOffset() * 60000);
          const estDate = new Date(utc + (estOffset * 60000));
          estDate.setHours(0, 0, 0, 0);
          return estDate.toISOString().slice(0, 16);
        };
        
        return {
          name: tier.name,
          price: tier.price,
          capacity: tier.capacity,
          targetYear: tier.targetYear || 'All years',
          startDate: formatToMidnight(tier.startDate),
          endDate: formatToMidnight(tier.endDate),
          isActive: tier.isActive !== undefined ? tier.isActive : true,
          subEventPrices: tier.subEventPrices || undefined,
          subEventCapacities: tier.subEventCapacities || undefined
        };
      });
      setTicketTiers(formattedTiers);
    } else if (event.enableAdvancedTicketing) {
      console.log('Advanced ticketing enabled but no tiers found, will create defaults');
      setTicketTiers([]);
    } else {
      setTicketTiers([]);
    }

    if (event.enableSubEvents && (event as any).subEvents) {
      console.log('Loading existing sub-events:', (event as any).subEvents);
      const formattedSubEvents = (event as any).subEvents.map((subEvent: any) => ({
        name: subEvent.name,
        description: subEvent.description || '',
        price: subEvent.price,
        capacity: subEvent.capacity,
        isStandalone: subEvent.isStandalone !== undefined ? subEvent.isStandalone : true,
        isComboOption: subEvent.isComboOption !== undefined ? subEvent.isComboOption : false
      }));
      setSubEvents(formattedSubEvents);
    } else if (event.enableSubEvents) {
      console.log('Sub-events enabled but no sub-events found');
      setSubEvents([]);
    } else {
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

      <div className="relative z-10 py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div className="text-center flex-1">
                <h1 className="text-4xl font-bold text-[#1c2a52] mb-2">Event Management</h1>
                <p className="text-gray-700 text-lg">
                  Manage your organization's events and track registrations
                </p>
              </div>
              <button
                onClick={() => {
                  setEditingEvent(null);
                  resetForm();
                  setShowForm(true);
                }}
                className="inline-flex items-center gap-2 rounded-lg bg-[#1c2a52] px-6 py-3 text-white shadow-sm hover:bg-[#2a3c6b] focus:outline-none focus:ring-2 focus:ring-[#1c2a52] focus:ring-offset-2 transition-all duration-200"
              >
                <Plus size={20} />
                Create New Event
              </button>
            </div>

            {/* Stats */}
            <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              <div className="bg-white bg-opacity-95 rounded-lg p-6 shadow-lg border border-gray-200 backdrop-blur-sm">
                <div className="text-center">
                  <dt className="text-sm font-medium text-gray-600 mb-2">
                    Total Events
                  </dt>
                  <dd className="text-3xl font-bold text-[#1c2a52]">
                    {events.length}
                  </dd>
                </div>
              </div>

              <div className="bg-white bg-opacity-95 rounded-lg p-6 shadow-lg border border-gray-200 backdrop-blur-sm">
                <div className="text-center">
                  <dt className="text-sm font-medium text-gray-600 mb-2">
                    Active Events
                  </dt>
                  <dd className="text-3xl font-bold text-[#1c2a52]">
                    {events.filter(e => !e.isArchived).length}
                  </dd>
                </div>
              </div>

              <div className="bg-white bg-opacity-95 rounded-lg p-6 shadow-lg border border-gray-200 backdrop-blur-sm">
                <div className="text-center">
                  <dt className="text-sm font-medium text-gray-600 mb-2">
                    Total Registrations
                  </dt>
                  <dd className="text-3xl font-bold text-[#1c2a52]">
                    {events.reduce((sum, e) => sum + (e.capacity - e.remainingSeats), 0)}
                  </dd>
                </div>
              </div>

              <div className="bg-white bg-opacity-95 rounded-lg p-6 shadow-lg border border-gray-200 backdrop-blur-sm">
                <div className="text-center">
                  <dt className="text-sm font-medium text-gray-600 mb-2">
                    Archived Events
                  </dt>
                  <dd className="text-3xl font-bold text-[#1c2a52]">
                    {events.filter(e => e.isArchived).length}
                  </dd>
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
                        <option value="social"> Social Event</option>
                        <option value="career"> Career Event</option>
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

                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                      <div className="flex items-center space-x-2 mb-2">
                        <AlertTriangle className="h-4 w-4 text-blue-600" />
                        <span className="text-sm font-medium text-blue-900 dark:text-blue-200">
                          Pricing & Capacity Configuration
                        </span>
                      </div>
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        Registration fee and event capacity are now managed through the Event Pricing Configuration below. 
                        This ensures consistency between basic and advanced pricing settings.
                      </p>
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
                                Early Bird ends at midnight (00:00) on event date, then Regular begins.
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
                                    : ticketTiers.length === 0 
                                    ? 'Default tiers will be created automatically'
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
                        Event Image
                      </label>
                      <div className="space-y-4">
                        {/* File input */}
                        <div className="flex items-center space-x-4">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleImageChange}
                            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                            disabled={uploadingImage}
                          />
                          {imagePreview && (
                            <button
                              type="button"
                              onClick={clearImage}
                              className="px-3 py-2 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                              disabled={uploadingImage}
                            >
                              Clear
                            </button>
                          )}
                        </div>

                        {/* Image preview */}
                        {imagePreview && (
                          <div className="relative">
                            <img
                              src={imagePreview}
                              alt="Event preview"
                              className="w-full max-w-md h-48 object-cover rounded-lg border border-gray-300"
                            />
                            {uploadingImage && (
                              <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-lg">
                                <div className="text-white text-center">
                                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
                                  <p>Uploading...</p>
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* URL input (fallback) */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Or enter image URL
                          </label>
                          <input
                            type="url"
                            value={formData.image}
                            onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-3 text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20 transition-all"
                            placeholder="https://example.com/image.jpg"
                            disabled={uploadingImage}
                          />
                        </div>
                      </div>
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
                      disabled={saving || uploadingImage}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={saving || uploadingImage}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {saving || uploadingImage ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          {uploadingImage ? 'Uploading...' : 'Saving...'}
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
          <div className="mb-8 bg-white bg-opacity-95 rounded-lg shadow-lg border border-gray-200 backdrop-blur-sm p-6">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
              <div>
                <label className="block text-sm font-medium text-[#1c2a52] mb-2">
                  Search Events
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:border-[#1c2a52] focus:ring-1 focus:ring-[#1c2a52]"
                    placeholder="Search by name or description..."
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1c2a52] mb-2">
                  Event Type
                </label>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as any)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:border-[#1c2a52] focus:ring-1 focus:ring-[#1c2a52]"
                >
                  <option value="all">All Types</option>
                  <option value="social">Social Events</option>
                  <option value="career">Career Events</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1c2a52] mb-2">
                  Status
                </label>
                <select
                  value={filterArchived}
                  onChange={(e) => setFilterArchived(e.target.value as any)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:border-[#1c2a52] focus:ring-1 focus:ring-[#1c2a52]"
                >
                  <option value="active">Active Events</option>
                  <option value="all">All Events</option>
                  <option value="archived">Archived Events</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1c2a52] mb-2">
                  Sort By
                </label>
                <div className="flex gap-2">
                  <select
                    value={sortField}
                    onChange={(e) => setSortField(e.target.value as SortField)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:border-[#1c2a52] focus:ring-1 focus:ring-[#1c2a52]"
                  >
                    <option value="date">Date</option>
                    <option value="name">Name</option>
                    <option value="capacity">Capacity</option>
                    <option value="registrations">Registrations</option>
                  </select>
                  <button
                    onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-[#1c2a52] bg-white hover:bg-gray-50 transition-colors"
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
              <div className="text-center py-12 bg-white bg-opacity-95 rounded-lg shadow-lg border border-gray-200 backdrop-blur-sm">
                <Calendar className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-4 text-lg font-medium text-[#1c2a52]">No events found</h3>
                <p className="mt-2 text-gray-600">
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
                    className="bg-white bg-opacity-95 rounded-lg shadow-lg border border-gray-200 backdrop-blur-sm transition-all duration-200 hover:shadow-xl"
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
                                    ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                                    : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                                }`}
                              >
                                {event.type === 'career' ? '' : ''} {event.type === 'career' ? 'Career' : 'Social'}
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
                          
                          <p className="text-gray-700 mb-4 line-clamp-2">
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
                            <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                              <h4 className="text-sm font-medium text-[#1c2a52] mb-3 flex items-center">
                                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V4a2 2 0 00-2-2H6zm1 2a1 1 0 000 2h6a1 1 0 100-2H7zm6 7a1 1 0 011 1v3a1 1 0 11-2 0v-3a1 1 0 011-1zm-3 3a1 1 0 100 2h.01a1 1 0 100-2H10zm-4 1a1 1 0 011-1h.01a1 1 0 110 2H7a1 1 0 01-1-1zm1-4a1 1 0 100 2h.01a1 1 0 100-2H7zm2 1a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1zm4-4a1 1 0 100 2h.01a1 1 0 100-2H13z" clipRule="evenodd" />
                                </svg>
                                Advanced Configuration
                              </h4>
                              
                              {(event as any).ticketTiers && (event as any).ticketTiers.length > 0 && (
                                <div className="mb-3">
                                  <h5 className="text-xs font-medium text-[#1c2a52] mb-2">Ticket Tiers:</h5>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                    {(event as any).ticketTiers.map((tier: any, index: number) => (
                                                                              <div key={index} className="bg-white rounded-md p-2 border border-gray-200">
                                          <div className="text-xs">
                                            <div className="font-medium text-[#1c2a52]">{tier.name}</div>
                                            <div className="text-gray-600">
                                            ${tier.price} • {tier.capacity} spots
                                          </div>
                                                                                      {tier.targetYear !== 'All years' && (
                                              <div className="text-[#1c2a52] text-[10px]">
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
                                  <h5 className="text-xs font-medium text-[#1c2a52] mb-2">Sub-Events:</h5>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                    {(event as any).subEvents.map((subEvent: any, index: number) => (
                                                                              <div key={index} className="bg-white rounded-md p-2 border border-gray-200">
                                          <div className="text-xs">
                                            <div className="font-medium text-[#1c2a52]">{subEvent.name}</div>
                                            <div className="text-gray-600">
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
                            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                              <h4 className="text-sm font-medium text-[#1c2a52] mb-2">
                                Registered Participants ({registrationCount})
                              </h4>
                              <div className="flex flex-wrap gap-2">
                                {(event.registeredUsers || event.registrations || []).slice(0, 5).map((item: any, index: number) => {
                                  const user = item.user || item;
                                  return (
                                    <span
                                      key={index}
                                      className="inline-flex items-center px-2 py-1 rounded-md bg-[#1c2a52] bg-opacity-10 text-[#1c2a52] text-xs"
                                    >
                                      {user.firstName} {user.lastName}
                                    </span>
                                  );
                                })}
                                {registrationCount > 5 && (
                                  <span className="inline-flex items-center px-2 py-1 rounded-md bg-gray-100 text-gray-800 text-xs">
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
                              // Set time to EST 00:00 (midnight)
                              const date = new Date(e.target.value);
                              const estOffset = -5 * 60; // EST is UTC-5
                              const utc = date.getTime() + (date.getTimezoneOffset() * 60000);
                              const estDate = new Date(utc + (estOffset * 60000));
                              estDate.setHours(0, 0, 0, 0);
                              newTiers[index].startDate = estDate.toISOString().slice(0, 16);
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
                              // Set time to EST 00:00 (midnight)
                              const date = new Date(e.target.value);
                              const estOffset = -5 * 60; // EST is UTC-5
                              const utc = date.getTime() + (date.getTimezoneOffset() * 60000);
                              const estDate = new Date(utc + (estOffset * 60000));
                              estDate.setHours(0, 0, 0, 0);
                              newTiers[index].endDate = estDate.toISOString().slice(0, 16);
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
                    <>
                      {/* Pricing Matrix */}
                      <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 mb-6">
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
                                        placeholder="Price"
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

                      {/* Capacity Matrix */}
                      <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg p-4 mb-6">
                        <h4 className="font-medium text-gray-900 dark:text-white mb-4">
                          Capacity Matrix: Tiers × Sub-Events
                        </h4>
                        
                        {/* Capacity Matrix Table */}
                        <div className="overflow-x-auto">
                          <table className="min-w-full border border-gray-200 dark:border-gray-700">
                            <thead className="bg-blue-100 dark:bg-blue-800">
                              <tr>
                                <th className="border border-gray-200 dark:border-gray-700 px-4 py-2 text-left text-sm font-medium text-gray-900 dark:text-white">
                                  Tier / Sub-Event
                                </th>
                                {subEvents.map((subEvent, subIndex) => (
                                  <th key={subIndex} className="border border-gray-200 dark:border-gray-700 px-4 py-2 text-center text-sm font-medium text-gray-900 dark:text-white">
                                    {subEvent.name}
                                  </th>
                                ))}
                                <th className="border border-gray-200 dark:border-gray-700 px-4 py-2 text-center text-sm font-medium text-gray-900 dark:text-white">
                                  Total
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {ticketTiers.map((tier, tierIndex) => (
                                <tr key={tierIndex}>
                                  <td className="border border-gray-200 dark:border-gray-700 px-4 py-2 font-medium text-gray-900 dark:text-white bg-blue-50 dark:bg-blue-800">
                                    {tier.name}
                                  </td>
                                  {subEvents.map((subEvent, subIndex) => (
                                    <td key={subIndex} className="border border-gray-200 dark:border-gray-700 px-2 py-2">
                                      <input
                                        type="number"
                                        min="0"
                                        value={tier.subEventCapacities?.[subIndex] !== undefined 
                                          ? (tier.subEventCapacities[subIndex] === 0 ? '' : tier.subEventCapacities[subIndex])
                                          : ''
                                        }
                                        onChange={(e) => {
                                          const newTiers = [...ticketTiers];
                                          const newValue = e.target.value === '' ? 0 : parseInt(e.target.value);
                                          
                                          if (!newTiers[tierIndex].subEventCapacities) {
                                            newTiers[tierIndex].subEventCapacities = subEvents.map((_, i) => 
                                              i === subIndex ? newValue : 0
                                            );
                                          } else {
                                            newTiers[tierIndex].subEventCapacities[subIndex] = newValue;
                                          }
                                          
                                          // Auto-calculate tier total capacity
                                          const totalCapacity = newTiers[tierIndex].subEventCapacities.reduce((sum, cap) => sum + cap, 0);
                                          newTiers[tierIndex].capacity = totalCapacity;
                                          
                                          setTicketTiers(newTiers);
                                        }}
                                        className="w-full text-center rounded border border-gray-300 dark:border-gray-600 px-2 py-1 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                                        placeholder="Capacity"
                                      />
                                    </td>
                                  ))}
                                  <td className="border border-gray-200 dark:border-gray-700 px-4 py-2 text-center font-medium text-gray-900 dark:text-white bg-blue-100 dark:bg-blue-700">
                                    {tier.subEventCapacities ? tier.subEventCapacities.reduce((sum, cap) => sum + cap, 0) : 0}
                                  </td>
                                </tr>
                              ))}
                              <tr className="bg-gray-50 dark:bg-gray-800">
                                <td className="border border-gray-200 dark:border-gray-700 px-4 py-2 font-medium text-gray-900 dark:text-white">
                                  Sub-Event Total
                                </td>
                                {subEvents.map((subEvent, subIndex) => (
                                  <td key={subIndex} className="border border-gray-200 dark:border-gray-700 px-4 py-2 text-center font-medium text-gray-900 dark:text-white">
                                    {ticketTiers.reduce((sum, tier) => 
                                      sum + (tier.subEventCapacities?.[subIndex] || 0), 0
                                    )}
                                  </td>
                                ))}
                                <td className="border border-gray-200 dark:border-gray-700 px-4 py-2 text-center font-medium text-gray-900 dark:text-white">
                                  {ticketTiers.reduce((sum, tier) => 
                                    sum + (tier.subEventCapacities ? tier.subEventCapacities.reduce((tierSum, cap) => tierSum + cap, 0) : 0), 0
                                  )}
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                        
                        <div className="mt-4 text-sm text-blue-600 dark:text-blue-400">
                          💡 <strong>Tip:</strong> Set capacity for each tier-subevent combination. 
                          The tier total will be automatically calculated. Early Bird might have 30 for 1次会 and 20 for 2次会.
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4">
                      <p className="text-sm text-yellow-800 dark:text-yellow-200">
                        ⚠️ Please configure both ticket tiers and sub-events first to set up the pricing and capacity matrices.
                      </p>
                    </div>
                  )}
                  
                  {/* Tier Configuration for Complex Mode */}
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white mb-4">
                      {formData.enableSubEvents ? 'Tier Capacity Matrix' : 'Tier Capacity Settings'}
                    </h4>
                    <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 mb-4">
                      <div className="flex items-start space-x-3">
                        <div className="text-gray-600 dark:text-gray-400 mt-1">
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div>
                          <h5 className="text-sm font-medium text-gray-900 dark:text-gray-200">
                            {formData.enableSubEvents ? 'How Tier Capacity Matrix Works' : 'How Tier Capacity Works'}
                          </h5>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {formData.enableSubEvents 
                              ? 'Set capacity for each tier. Total capacity will be automatically calculated and validated against sub-event capacities.'
                              : 'Early Bird gets first X spots, then Regular gets next Y spots. When Early Bird sells out, registration automatically moves to Regular pricing.'
                            }
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Capacity Validation Error */}
                    {formData.enableSubEvents && (() => {
                      // For Matrix mode, validate that each sub-event's total capacity matches the sub-event's capacity
                      const subEventCapacityErrors: string[] = [];
                      
                      subEvents.forEach((subEvent, subIndex) => {
                        const totalTierCapacityForSubEvent = ticketTiers.reduce((sum, tier) => 
                          sum + (tier.subEventCapacities?.[subIndex] || 0), 0
                        );
                        
                        if (totalTierCapacityForSubEvent !== subEvent.capacity) {
                          subEventCapacityErrors.push(
                            `${subEvent.name}: Tier total (${totalTierCapacityForSubEvent}) ≠ Sub-event capacity (${subEvent.capacity})`
                          );
                        }
                      });
                      
                      const hasError = subEventCapacityErrors.length > 0;
                      
                      return hasError ? (
                        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg">
                          <div className="flex items-center space-x-2">
                            <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                            </svg>
                            <span className="text-sm font-medium text-red-800 dark:text-red-200">
                              Capacity Matrix Validation Error
                            </span>
                          </div>
                          <div className="text-sm text-red-700 dark:text-red-300 mt-1">
                            <p className="font-medium mb-2">The following sub-events have capacity mismatches:</p>
                            <ul className="list-disc list-inside space-y-1">
                              {subEventCapacityErrors.map((error, index) => (
                                <li key={index}>{error}</li>
                              ))}
                            </ul>
                            <p className="mt-2">Please adjust the capacity matrix to match the sub-event capacities.</p>
                          </div>
                        </div>
                      ) : (
                        <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-lg">
                          <div className="flex items-center space-x-2">
                            <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            <span className="text-sm font-medium text-green-800 dark:text-green-200">
                              Capacity Matrix Validated
                            </span>
                          </div>
                          <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                            All sub-event capacities match their tier allocations in the capacity matrix.
                          </p>
                        </div>
                      );
                    })()}

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
                            {!formData.enableSubEvents && (
                              <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                  Capacity
                                  <span className="text-xs text-gray-500 ml-1">
                                    (shared across all sub-events)
                                  </span>
                                </label>
                                <input
                                  type="number"
                                  min="0"
                                  value={tier.capacity === 0 ? '' : tier.capacity}
                                  onChange={(e) => {
                                    const newTiers = [...ticketTiers];
                                    const newCapacity = e.target.value === '' ? 0 : parseInt(e.target.value);
                                    newTiers[index].capacity = newCapacity;
                                    setTicketTiers(newTiers);
                                  }}
                                  className="w-full rounded border border-gray-300 dark:border-gray-600 px-3 py-2 text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                                />
                              </div>
                            )}
                            {formData.enableSubEvents && (
                              <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                  Tier Total Capacity
                                  <span className="text-xs text-gray-500 ml-1">
                                    (auto-calculated from matrix)
                                  </span>
                                </label>
                                <input
                                  type="number"
                                  min="0"
                                  value={tier.capacity === 0 ? '' : tier.capacity}
                                  disabled
                                  className="w-full rounded border border-gray-300 dark:border-gray-600 px-3 py-2 text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 cursor-not-allowed"
                                />
                              </div>
                            )}
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
                          
                          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Start Date
                              </label>
                              <input
                                type="datetime-local"
                                value={tier.startDate}
                                onChange={(e) => {
                                  const newTiers = [...ticketTiers];
                                  // Set time to EST 00:00 (midnight)
                                  const date = new Date(e.target.value);
                                  const estOffset = -5 * 60; // EST is UTC-5
                                  const utc = date.getTime() + (date.getTimezoneOffset() * 60000);
                                  const estDate = new Date(utc + (estOffset * 60000));
                                  estDate.setHours(0, 0, 0, 0);
                                  newTiers[index].startDate = estDate.toISOString().slice(0, 16);
                                  setTicketTiers(newTiers);
                                }}
                                className="w-full rounded border border-gray-300 dark:border-gray-600 px-3 py-2 text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                End Date (00:00)
                              </label>
                              <input
                                type="datetime-local"
                                value={tier.endDate}
                                onChange={(e) => {
                                  const newTiers = [...ticketTiers];
                                  // Set time to EST 00:00 (midnight)
                                  const date = new Date(e.target.value);
                                  const estOffset = -5 * 60; // EST is UTC-5
                                  const utc = date.getTime() + (date.getTimezoneOffset() * 60000);
                                  const estDate = new Date(utc + (estOffset * 60000));
                                  estDate.setHours(0, 0, 0, 0);
                                  newTiers[index].endDate = estDate.toISOString().slice(0, 16);
                                  setTicketTiers(newTiers);
                                }}
                                className="w-full rounded border border-gray-300 dark:border-gray-600 px-3 py-2 text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                              />
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
                    startDate: ticketTiers.length > 0 
                      ? ticketTiers[ticketTiers.length - 1].endDate 
                      : (() => {
                          const today = new Date();
                          // Convert to EST midnight (UTC-5)
                          const estOffset = -5 * 60; // EST is UTC-5
                          const todayUTC = today.getTime() + (today.getTimezoneOffset() * 60000);
                          const todayEST = new Date(todayUTC + (estOffset * 60000));
                          todayEST.setHours(0, 0, 0, 0);
                          return todayEST.toISOString().slice(0, 16);
                        })(),
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
                          const newCapacity = e.target.value === '' ? 0 : parseInt(e.target.value);
                          newSubEvents[index].capacity = newCapacity;
                          setSubEvents(newSubEvents);
                          
                          // Auto-update tier capacities when sub-event capacity changes
                          if (ticketTiers.length > 0) {
                            const totalSubEventCapacity = newSubEvents.reduce((sum, se, i) => 
                              sum + (i === index ? newCapacity : se.capacity), 0
                            );
                            
                            const newTiers = [...ticketTiers];
                            
                            // If we have Early Bird and Regular tiers, distribute capacity
                            if (newTiers.length >= 2) {
                              const earlyBirdIndex = newTiers.findIndex(t => t.name.toLowerCase() === 'early bird');
                              const regularIndex = newTiers.findIndex(t => t.name.toLowerCase() === 'regular');
                              
                              if (earlyBirdIndex !== -1 && regularIndex !== -1) {
                                // Set Early Bird to 60% of total capacity
                                const earlyBirdCapacity = Math.floor(totalSubEventCapacity * 0.6);
                                newTiers[earlyBirdIndex].capacity = earlyBirdCapacity;
                                
                                // Set Regular to remaining capacity
                                newTiers[regularIndex].capacity = totalSubEventCapacity - earlyBirdCapacity;
                              }
                            } else if (newTiers.length === 1) {
                              // Single tier gets all capacity
                              newTiers[0].capacity = totalSubEventCapacity;
                            }
                            
                            setTicketTiers(newTiers);
                          }
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