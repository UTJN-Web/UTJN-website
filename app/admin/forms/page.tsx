'use client';

import { useState, useEffect, useMemo } from 'react';
import { Plus, Edit, Trash2, Eye, FileText, Save, X, ArrowDown, ArrowUp, QrCode, Search, Calendar, Tag } from 'lucide-react';
import QRCodeDisplay from '../../components/QRCodeDisplay';

interface FormField {
  id?: number;
  type: string;
  question: string;
  description?: string;
  isRequired: boolean;
  options?: string[];
  order: number;
}

interface CreditAward {
  id: number;
  formId: number;
  creditsAwarded: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Form {
  id: number;
  eventId: number;
  title: string;
  description?: string;
  isActive: boolean;
  isRequired: boolean;
  fields: FormField[];
  creditAward?: CreditAward;
  createdAt: string;
  updatedAt: string;
}

interface Event {
  id: number;
  name: string;
  type: string;
  date: string;
  isArchived: boolean;
}

// Coupon interface removed

const FIELD_TYPES = [
  { value: 'text', label: 'Short Text', icon: '' },
  { value: 'textarea', label: 'Long Text', icon: '' },
  { value: 'select', label: 'Dropdown', icon: '' },
  { value: 'radio', label: 'Multiple Choice', icon: '' },
  { value: 'checkbox', label: 'Checkboxes', icon: '' },
  { value: 'rating', label: 'Rating Scale', icon: '' },
  { value: 'file', label: 'File Upload', icon: '' }
];

const EVENT_TYPES = [
  { value: 'all', label: 'All Events', icon: '' },
  { value: 'social', label: 'Social', icon: '' },
  { value: 'career', label: 'Career', icon: '' },
  { value: 'academic', label: 'Academic', icon: '' },
  { value: 'networking', label: 'Networking', icon: '' },
  { value: 'cultural', label: 'Cultural', icon: '' }
];

type SortOption = 'date-asc' | 'date-desc' | 'name-asc' | 'name-desc' | 'type';

export default function AdminFormsPage() {
  // Removed coupon functionality - Forms only
  const [events, setEvents] = useState<Event[]>([]);
  const [forms, setForms] = useState<Form[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filtering and sorting state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState<SortOption>('date-desc');
  const [showArchived, setShowArchived] = useState(false);
  
  // Form designer state
  const [showFormDesigner, setShowFormDesigner] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  
  // QR code state
  const [showQRCode, setShowQRCode] = useState(false);
  const [qrFormId, setQrFormId] = useState<number | null>(null);
  const [currentForm, setCurrentForm] = useState<Form | null>(null);
  const [showSubmissions, setShowSubmissions] = useState(false);
  const [submissionsLoading, setSubmissionsLoading] = useState(false);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formIsRequired, setFormIsRequired] = useState(false);
  const [formFields, setFormFields] = useState<FormField[]>([]);
  
  // Credit award settings
  const [creditAwardEnabled, setCreditAwardEnabled] = useState(false);
  const [creditsAwarded, setCreditsAwarded] = useState('');
  
  // Coupon functionality removed

  useEffect(() => {
    fetchData();
  }, []);

  // Filtered and sorted events
  const filteredAndSortedEvents = useMemo(() => {
    let filtered = events.filter(event => {
      // Category filter
      if (selectedCategory !== 'all' && event.type !== selectedCategory) return false;
      
      // Archive filter
      if (!showArchived && event.isArchived) return false;
      
      // Search filter
      if (searchTerm && !event.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      
      return true;
    });

    // Sort events
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date-asc':
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        case 'date-desc':
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        case 'name-asc':
          return a.name.localeCompare(b.name);
        case 'name-desc':
          return b.name.localeCompare(a.name);
        case 'type':
          return a.type.localeCompare(b.type);
        default:
          return 0;
      }
    });

    return filtered;
  }, [events, selectedCategory, showArchived, searchTerm, sortBy]);

  const fetchData = async () => {
    try {
      const eventsRes = await fetch('/api/events');

      if (eventsRes.ok) {
        const eventsData = await eventsRes.json();
        setEvents(eventsData);
        
        // Fetch forms for each event
        const formsPromises = eventsData.map((event: Event) =>
          fetch(`/api/forms/event/${event.id}`).then(res => res.ok ? res.json() : null)
        );
        const formsResults = await Promise.all(formsPromises);
        const validForms = formsResults.filter(result => result?.success && result.form).map(result => result.form);
        setForms(validForms);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const openFormDesigner = (event: Event, form?: Form) => {
    setSelectedEvent(event);
    setCurrentForm(form || null);
    
    if (form) {
      setFormTitle(form.title);
      setFormDescription(form.description || '');
      setFormIsRequired(form.isRequired);
      setFormFields(form.fields || []);
      // Load credit award settings from backend
      if (form.creditAward) {
        setCreditAwardEnabled(form.creditAward.isActive);
        setCreditsAwarded(form.creditAward.creditsAwarded.toString());
      } else {
        setCreditAwardEnabled(false);
        setCreditsAwarded('');
      }
    } else {
      setFormTitle(`${event.name} Feedback Form`);
      setFormDescription(`Please provide your feedback for ${event.name}`);
      setFormIsRequired(false);
      setFormFields([]);
      setCreditAwardEnabled(false);
      setCreditsAwarded('');
    }
    
    setShowFormDesigner(true);
  };

  const addFormField = () => {
    const newField: FormField = {
      type: 'text',
      question: '',
      description: '',
      isRequired: false,
      options: [],
      order: formFields.length
    };
    setFormFields([...formFields, newField]);
  };

  const updateFormField = (index: number, field: Partial<FormField>) => {
    const updatedFields = [...formFields];
    updatedFields[index] = { ...updatedFields[index], ...field };
    setFormFields(updatedFields);
  };

  const removeFormField = (index: number) => {
    const updatedFields = formFields.filter((_, i) => i !== index);
    setFormFields(updatedFields.map((field, i) => ({ ...field, order: i })));
  };

  const moveFieldUp = (index: number) => {
    if (index === 0) return;
    const updatedFields = [...formFields];
    [updatedFields[index - 1], updatedFields[index]] = [updatedFields[index], updatedFields[index - 1]];
    setFormFields(updatedFields.map((field, i) => ({ ...field, order: i })));
  };

  const moveFieldDown = (index: number) => {
    if (index === formFields.length - 1) return;
    const updatedFields = [...formFields];
    [updatedFields[index], updatedFields[index + 1]] = [updatedFields[index + 1], updatedFields[index]];
    setFormFields(updatedFields.map((field, i) => ({ ...field, order: i })));
  };

  const saveForm = async () => {
    if (!selectedEvent) return;

    try {
      const formData = {
        eventId: selectedEvent.id,
        title: formTitle,
        description: formDescription,
        isRequired: formIsRequired,
        fields: formFields,
        creditAward: creditAwardEnabled ? {
          creditsAwarded: parseInt(creditsAwarded) || 0,
          isActive: true
        } : null
      };

      const url = currentForm ? `/api/forms/manage/${currentForm.id}` : '/api/forms';
      const method = currentForm ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        setShowFormDesigner(false);
        fetchData(); // Refresh data
      } else {
        console.error('Failed to save form');
      }
    } catch (error) {
      console.error('Error saving form:', error);
    }
  };

  const deleteForm = async (formId: number) => {
    if (!confirm('Are you sure you want to delete this form?')) return;

    try {
      const response = await fetch(`/api/forms/manage/${formId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        fetchData(); // Refresh data
      }
    } catch (error) {
      console.error('Error deleting form:', error);
    }
  };

  // Coupon save function removed

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
          <h2 className="text-2xl font-bold text-[#1c2a52] mb-2">Loading Forms</h2>
          <p className="text-gray-600">Please wait while we fetch forms data...</p>
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
      <div className="relative z-10 w-full px-6 py-6">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-[#1c2a52] mb-2">Forms Management</h1>
          <p className="text-gray-700 text-lg">Design event forms and manage submissions</p>
        </div>

        {/* Forms Content */}
        {(
          <div className="space-y-6">
            {/* Controls Bar */}
            <div className="bg-white bg-opacity-95 rounded-lg shadow-lg border border-gray-200 backdrop-blur-sm p-4">
              <div className="flex flex-wrap items-center gap-4">
                {/* Search */}
                <div className="flex-1 min-w-64">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      placeholder="Search events..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1c2a52] focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Category Filter */}
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-gray-500" />
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#1c2a52] focus:border-transparent"
                  >
                    {EVENT_TYPES.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Sort */}
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortOption)}
                    className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#1c2a52] focus:border-transparent"
                  >
                    <option value="date-desc">Newest First</option>
                    <option value="date-asc">Oldest First</option>
                    <option value="name-asc">Name A-Z</option>
                    <option value="name-desc">Name Z-A</option>
                    <option value="type">By Category</option>
                  </select>
                </div>

                {/* Show Archived Toggle */}
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showArchived}
                    onChange={(e) => setShowArchived(e.target.checked)}
                    className="w-4 h-4 text-[#1c2a52] border-gray-300 rounded focus:ring-[#1c2a52]"
                  />
                  <span className="text-sm text-gray-600">Show Archived</span>
                </label>
              </div>
            </div>

            {/* Events Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredAndSortedEvents.map((event) => {
                const eventForm = forms.find(f => f.eventId === event.id);
                const categoryType = EVENT_TYPES.find(t => t.value === event.type);
                
                return (
                  <div key={event.id} className="bg-white bg-opacity-95 rounded-lg shadow-lg border border-gray-200 backdrop-blur-sm hover:shadow-xl transition-all duration-300">
                    {/* Event Header */}
                    <div className="p-4 border-b border-gray-100">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
                              {event.type}
                            </span>
                            {event.isArchived && (
                              <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">
                                Archived
                              </span>
                            )}
                          </div>
                          <h3 className="font-semibold text-gray-900 text-lg mb-1 line-clamp-2">{event.name}</h3>
                          <p className="text-sm text-gray-500">
                            {new Date(event.date).toLocaleDateString('en-US', {
                              weekday: 'short',
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Form Status */}
                    <div className="p-4">
                      {eventForm ? (
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <span className="text-sm font-medium text-green-700">Form Active</span>
                          </div>
                          <div className="bg-green-50 rounded-lg p-3">
                            <p className="font-medium text-green-900 text-sm">{eventForm.title}</p>
                            <p className="text-xs text-green-700 mt-1">
                              {eventForm.fields.length} field{eventForm.fields.length !== 1 ? 's' : ''}
                              {eventForm.isRequired && ' • Required'}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                            <span className="text-sm font-medium text-gray-600">No Form</span>
                          </div>
                          <div className="bg-gray-50 rounded-lg p-3">
                            <p className="text-sm text-gray-600">No feedback form created yet</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="p-4 border-t border-gray-100 bg-gray-50">
                      <div className="flex items-center justify-between">
                        <button
                          onClick={() => openFormDesigner(event, eventForm)}
                          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            eventForm 
                              ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' 
                              : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                          }`}
                        >
                          {eventForm ? <Edit className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                          {eventForm ? 'Edit Form' : 'Create Form'}
                        </button>
                        
                        {eventForm && (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => {
                                setQrFormId(eventForm.id);
                                setShowQRCode(true);
                              }}
                              className="p-2 text-purple-600 hover:bg-purple-100 rounded-lg transition-colors"
                              title="Generate QR Code"
                            >
                              <QrCode className="w-4 h-4" />
                            </button>
                            <button
                              onClick={async () => {
                                setSubmissionsLoading(true);
                                setShowSubmissions(true);
                                try {
                                  const res = await fetch(`/api/forms/manage/${eventForm.id}/submissions`);
                                  if (res.ok) {
                                    const data = await res.json();
                                    setSubmissions(data.submissions || []);
                                  } else {
                                    setSubmissions([]);
                                  }
                                } catch (e) {
                                  console.error('Failed to load submissions', e);
                                  setSubmissions([]);
                                } finally {
                                  setSubmissionsLoading(false);
                                }
                              }}
                              className="p-2 text-green-600 hover:bg-green-100 rounded-lg transition-colors"
                              title="View Submissions"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => deleteForm(eventForm.id)}
                              className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                              title="Delete Form"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Empty State */}
            {filteredAndSortedEvents.length === 0 && (
              <div className="text-center py-12">
                <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No events found</h3>
                <p className="text-gray-500 mb-4">
                  {searchTerm || selectedCategory !== 'all' 
                    ? 'Try adjusting your filters or search terms'
                    : 'No events available to create forms for'
                  }
                </p>
                {(searchTerm || selectedCategory !== 'all') && (
                  <button
                    onClick={() => {
                      setSearchTerm('');
                      setSelectedCategory('all');
                    }}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Form Designer Modal - keeping existing implementation */}
        {showFormDesigner && (
          <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-200">
              <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-2xl">
                <h3 className="text-lg font-medium text-gray-900">
                  {currentForm ? 'Edit Form' : 'Create Form'} - {selectedEvent?.name}
                </h3>
                <button
                  onClick={() => setShowFormDesigner(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              
              <div className="p-6 space-y-6 bg-gray-50">
                {/* Form Basic Info */}
                <div className="bg-white rounded-lg p-6 space-y-4 border border-gray-200 shadow-sm">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Form Title</label>
                    <input
                      type="text"
                      value={formTitle}
                      onChange={(e) => setFormTitle(e.target.value)}
                      className="w-full border-0 border-b-2 border-gray-200 focus:border-blue-500 bg-transparent px-0 py-2 text-lg focus:outline-none focus:ring-0"
                      placeholder="Enter form title"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea
                      value={formDescription}
                      onChange={(e) => setFormDescription(e.target.value)}
                      className="w-full border-0 border-b border-gray-200 focus:border-blue-500 bg-transparent px-0 py-2 resize-none focus:outline-none focus:ring-0"
                      placeholder="Enter form description"
                      rows={2}
                    />
                  </div>
                  
                  <div className="mb-6">
                    <label className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={formIsRequired}
                        onChange={(e) => setFormIsRequired(e.target.checked)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-600">Required for event completion</span>
                    </label>
                  </div>

                  {/* Credit Award Settings */}
                  <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <h4 className="text-lg font-medium text-gray-900 mb-3">Credit Rewards</h4>
                    
                    <div className="mb-4">
                      <label className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={creditAwardEnabled}
                          onChange={(e) => setCreditAwardEnabled(e.target.checked)}
                          className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                        />
                        <span className="text-sm text-gray-700">Award credits for completing this form</span>
                      </label>
                    </div>

                    {creditAwardEnabled && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Credits to Award
                          </label>
                          <input
                            type="number"
                            min="0"
                            max="10"
                            value={creditsAwarded}
                            onChange={(e) => setCreditsAwarded(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                            placeholder="Enter number of credits"
                          />
                          <p className="text-xs text-gray-500 mt-1">1 credit = $1 USD discount</p>
                        </div>
                        <div className="flex items-end">
                          <div className="bg-green-100 border border-green-300 rounded-lg p-3 w-full">
                            <p className="text-sm text-green-800">
                              <strong>Preview:</strong> Users will earn {creditsAwarded || '0'} credit{(parseInt(creditsAwarded) || 0) !== 1 ? 's' : ''} (${creditsAwarded || '0'} value) for completing this form.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Form Fields */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-lg font-medium text-gray-900">Form Fields</h4>
                    <button
                      onClick={addFormField}
                      className="px-4 py-2 bg-blue-600 text-white rounded-full text-sm hover:bg-blue-700 flex items-center gap-2 transition-colors shadow-sm"
                    >
                      <Plus className="w-4 h-4" />
                      Add Field
                    </button>
                  </div>

                  {formFields.map((field, index) => (
                    <div key={index} className="bg-white border border-gray-200 rounded-lg p-6 space-y-4 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full text-xs font-medium flex items-center justify-center">
                            {index + 1}
                          </span>
                          <select
                            value={field.type}
                            onChange={(e) => updateFormField(index, { type: e.target.value })}
                            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            {FIELD_TYPES.map(type => (
                              <option key={type.value} value={type.value}>
                                {type.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => moveFieldUp(index)}
                            disabled={index === 0}
                            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full disabled:opacity-30 transition-colors"
                          >
                            <ArrowUp className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => moveFieldDown(index)}
                            disabled={index === formFields.length - 1}
                            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full disabled:opacity-30 transition-colors"
                          >
                            <ArrowDown className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => removeFormField(index)}
                            className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-full transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Question</label>
                          <input
                            type="text"
                            value={field.question}
                            onChange={(e) => updateFormField(index, { question: e.target.value })}
                            className="w-full border-0 border-b-2 border-gray-200 focus:border-blue-500 bg-transparent px-0 py-2 text-sm focus:outline-none focus:ring-0"
                            placeholder="Enter question"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
                          <input
                            type="text"
                            value={field.description || ''}
                            onChange={(e) => updateFormField(index, { description: e.target.value })}
                            className="w-full border-0 border-b-2 border-gray-200 focus:border-blue-500 bg-transparent px-0 py-2 text-sm focus:outline-none focus:ring-0"
                            placeholder="Help text"
                          />
                        </div>
                      </div>

                      {(field.type === 'select' || field.type === 'radio' || field.type === 'checkbox') && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Options (one per line)</label>
                          <textarea
                            value={(field.options || []).join('\n')}
                            onChange={(e) => updateFormField(index, { 
                              options: e.target.value.split('\n').filter(opt => opt.trim()) 
                            })}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                            placeholder="Option 1&#10;Option 2&#10;Option 3"
                            rows={3}
                          />
                        </div>
                      )}

                      <label className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={field.isRequired}
                          onChange={(e) => updateFormField(index, { isRequired: e.target.checked })}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-600">Required field</span>
                      </label>
                    </div>
                  ))}

                  {formFields.length === 0 && (
                    <div className="text-center py-12 text-gray-500 bg-white border-2 border-dashed border-gray-200 rounded-lg">
                      <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                      <p className="text-lg font-medium mb-1">No fields added yet</p>
                      <p className="text-sm text-gray-400">Click "Add Field" to start building your form</p>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-200 bg-white px-6 py-4 rounded-b-2xl">
                  <button
                    onClick={() => setShowFormDesigner(false)}
                    className="px-6 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveForm}
                    disabled={!formTitle || formFields.length === 0}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors shadow-sm"
                  >
                    <Save className="w-4 h-4" />
                    {currentForm ? 'Update Form' : 'Create Form'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Coupon Designer Modal removed */}

        {/* QR Code Modal */}
        {showQRCode && qrFormId && (
          <QRCodeDisplay
            formId={qrFormId}
            onClose={() => {
              setShowQRCode(false);
              setQrFormId(null);
            }}
          />
        )}

        {/* Submissions Modal */}
        {showSubmissions && (
          <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-5xl w-full max-h-[85vh] overflow-y-auto shadow-2xl border border-gray-200">
              <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-2xl">
                <h3 className="text-lg font-medium text-gray-900">Form Submissions</h3>
                <button onClick={() => setShowSubmissions(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <div className="p-6">
                {submissionsLoading ? (
                  <div className="py-12 text-center text-gray-600">Loading submissions...</div>
                ) : submissions.length === 0 ? (
                  <div className="py-12 text-center text-gray-500">No submissions yet</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Submitted</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Answers (preview)</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {submissions.map((s) => (
                          <tr key={s.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm text-gray-900">{`${s.firstName || ''} ${s.lastName || ''}`.trim() || '—'}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">{s.email || '—'}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">{new Date(s.submittedAt).toLocaleString()}</td>
                            <td className="px-4 py-3 text-sm text-gray-700">
                              <div className="max-w-lg truncate">
                                {(s.responses || []).slice(0, 3).map((r: any, idx: number) => (
                                  <span key={idx} className="inline-block mr-2 text-gray-600">
                                    <span className="font-medium text-gray-800">{r.question}:</span> {Array.isArray(r.value) ? r.value.join(', ') : String(r.value)}
                                    {idx < Math.min(2, (s.responses || []).length - 1) ? '; ' : ''}
                                  </span>
                                ))}
                                {(s.responses || []).length > 3 && <span className="text-gray-400"> …</span>}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 