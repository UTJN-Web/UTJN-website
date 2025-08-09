'use client';

import { useState, useEffect, useContext } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { UserContext } from '@/app/contexts/UserContext';
import { FileText, Star, Upload, Check, AlertCircle, ArrowLeft } from 'lucide-react';

interface FormField {
  id: number;
  type: string;
  question: string;
  description?: string;
  isRequired: boolean;
  options?: string[];
  order: number;
}

interface Form {
  id: number;
  eventId: number;
  title: string;
  description?: string;
  isActive: boolean;
  isRequired: boolean;
  fields: FormField[];
}

interface Event {
  id: number;
  name: string;
  description: string;
  date: string;
  type: string;
}

export default function EventFormPage() {
  const router = useRouter();
  const params = useParams();
  const userContext = useContext(UserContext);
  const user = userContext?.user;
  const eventId = parseInt(params.id as string);

  const [event, setEvent] = useState<Event | null>(null);
  const [form, setForm] = useState<Form | null>(null);
  const [responses, setResponses] = useState<{ [fieldId: number]: any }>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<{ [fieldId: number]: string }>({});

  useEffect(() => {
    if (eventId) {
      fetchEventAndForm();
    }
  }, [eventId]);

  const fetchEventAndForm = async () => {
    try {
      const [eventRes, formRes] = await Promise.all([
        fetch(`/api/events/${eventId}`),
        fetch(`/api/forms/${eventId}`)
      ]);

      if (eventRes.ok) {
        const eventData = await eventRes.json();
        setEvent(eventData);
      }

      if (formRes.ok) {
        const formData = await formRes.json();
        if (formData.success && formData.form) {
          setForm(formData.form);
          // Initialize responses
          const initialResponses: { [fieldId: number]: any } = {};
          formData.form.fields.forEach((field: FormField) => {
            if (field.type === 'checkbox') {
              initialResponses[field.id] = [];
            } else {
              initialResponses[field.id] = '';
            }
          });
          setResponses(initialResponses);
        }
      }
    } catch (error) {
      console.error('Error fetching event and form:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (fieldId: number, value: any) => {
    setResponses(prev => ({
      ...prev,
      [fieldId]: value
    }));
    
    // Clear error when user starts typing
    if (errors[fieldId]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldId];
        return newErrors;
      });
    }
  };

  const validateForm = () => {
    const newErrors: { [fieldId: number]: string } = {};
    
    form?.fields.forEach(field => {
      if (field.isRequired) {
        const value = responses[field.id];
        if (!value || (Array.isArray(value) && value.length === 0)) {
          newErrors[field.id] = 'This field is required';
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !form) return;
    
    if (!validateForm()) {
      return;
    }

    setSubmitting(true);

    try {
      const submissionData = {
        formId: form.id,
        userId: user.id,
        responses: form.fields.map(field => ({
          fieldId: field.id,
          value: responses[field.id]
        }))
      };

      const response = await fetch('/api/forms/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submissionData),
      });

      if (response.ok) {
        setSubmitted(true);
      } else {
        throw new Error('Failed to submit form');
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      alert('Failed to submit form. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderField = (field: FormField) => {
    const value = responses[field.id];
    const hasError = !!errors[field.id];

    switch (field.type) {
      case 'text':
        return (
          <input
            type="text"
            value={value || ''}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            className={`w-full border rounded-lg px-3 py-2 ${hasError ? 'border-red-500' : 'border-gray-300'} focus:outline-none focus:ring-2 focus:ring-blue-500`}
            placeholder={field.description || 'Enter your answer'}
          />
        );

      case 'textarea':
        return (
          <textarea
            value={value || ''}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            className={`w-full border rounded-lg px-3 py-2 h-32 ${hasError ? 'border-red-500' : 'border-gray-300'} focus:outline-none focus:ring-2 focus:ring-blue-500`}
            placeholder={field.description || 'Enter your answer'}
          />
        );

      case 'select':
        return (
          <select
            value={value || ''}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            className={`w-full border rounded-lg px-3 py-2 ${hasError ? 'border-red-500' : 'border-gray-300'} focus:outline-none focus:ring-2 focus:ring-blue-500`}
          >
            <option value="">Select an option</option>
            {field.options?.map((option, index) => (
              <option key={index} value={option}>{option}</option>
            ))}
          </select>
        );

      case 'radio':
        return (
          <div className="space-y-2">
            {field.options?.map((option, index) => (
              <label key={index} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name={`field-${field.id}`}
                  value={option}
                  checked={value === option}
                  onChange={(e) => handleFieldChange(field.id, e.target.value)}
                  className="text-blue-600"
                />
                <span>{option}</span>
              </label>
            ))}
          </div>
        );

      case 'checkbox':
        return (
          <div className="space-y-2">
            {field.options?.map((option, index) => (
              <label key={index} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={(value || []).includes(option)}
                  onChange={(e) => {
                    const currentValues = value || [];
                    if (e.target.checked) {
                      handleFieldChange(field.id, [...currentValues, option]);
                    } else {
                      handleFieldChange(field.id, currentValues.filter((v: string) => v !== option));
                    }
                  }}
                  className="text-blue-600"
                />
                <span>{option}</span>
              </label>
            ))}
          </div>
        );

      case 'rating':
        return (
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((rating) => (
              <button
                key={rating}
                type="button"
                onClick={() => handleFieldChange(field.id, rating)}
                className={`p-1 ${value >= rating ? 'text-yellow-500' : 'text-gray-300'} hover:text-yellow-500`}
              >
                <Star className="w-8 h-8 fill-current" />
              </button>
            ))}
            {value && <span className="ml-2 text-sm text-gray-600">({value}/5)</span>}
          </div>
        );

      case 'file':
        return (
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
            <p className="text-sm text-gray-600">File upload coming soon</p>
            <input
              type="text"
              value={value || ''}
              onChange={(e) => handleFieldChange(field.id, e.target.value)}
              className="mt-2 w-full border rounded px-2 py-1 text-sm"
              placeholder="Enter file URL or description for now"
            />
          </div>
        );

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading form...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-amber-500" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Login Required</h2>
          <p className="text-gray-600 mb-4">You need to be logged in to access this form.</p>
          <button
            onClick={() => router.push('/login')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  if (!form) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <FileText className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">No Form Available</h2>
          <p className="text-gray-600 mb-4">
            There is no feedback form available for this event yet.
          </p>
          <button
            onClick={() => router.push('/events')}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center gap-2 mx-auto"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Events
          </button>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">Thank You!</h2>
          <p className="text-gray-600 mb-4">
            Your feedback has been submitted successfully. We appreciate your input!
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-blue-800">
              🎟️ <strong>Good news!</strong> You may be eligible for discount coupons on future events. 
              Check your email or profile for any generated coupon codes.
            </p>
          </div>
          <div className="space-y-2">
            <button
              onClick={() => router.push('/events')}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Back to Events
            </button>
            <button
              onClick={() => router.push('/profile')}
              className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              View My Profile
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/events')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Events
          </button>
          
          {event && (
            <div className="bg-white rounded-lg p-6 shadow-sm border mb-6">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">{event.name}</h1>
              <p className="text-gray-600 mb-2">{event.description}</p>
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <span>📅 {new Date(event.date).toLocaleDateString()}</span>
                <span>🏷️ {event.type}</span>
              </div>
            </div>
          )}

          <div className="bg-white rounded-lg p-6 shadow-sm border">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-purple-100 rounded-lg">
                <FileText className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">{form.title}</h2>
                {form.isRequired && (
                  <span className="inline-block px-2 py-1 bg-red-100 text-red-700 text-xs rounded mt-1">
                    Required
                  </span>
                )}
              </div>
            </div>
            {form.description && (
              <p className="text-gray-600 mb-6">{form.description}</p>
            )}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {form.fields
            .sort((a, b) => a.order - b.order)
            .map((field) => (
              <div key={field.id} className="bg-white rounded-lg p-6 shadow-sm border">
                <div className="mb-3">
                  <label className="block text-sm font-medium text-gray-900 mb-1">
                    {field.question}
                    {field.isRequired && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  {field.description && (
                    <p className="text-sm text-gray-500 mb-3">{field.description}</p>
                  )}
                </div>
                
                {renderField(field)}
                
                {errors[field.id] && (
                  <p className="text-red-500 text-sm mt-2 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors[field.id]}
                  </p>
                )}
              </div>
            ))}

          {/* Submit Button */}
          <div className="bg-white rounded-lg p-6 shadow-sm border">
            <button
              type="submit"
              disabled={submitting}
              className="w-full px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Submitting...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Submit Feedback
                </>
              )}
            </button>
            <p className="text-center text-sm text-gray-500 mt-2">
              Your responses will help us improve future events
            </p>
          </div>
        </form>
      </div>
    </div>
  );
} 