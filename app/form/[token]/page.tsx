'use client';

import { useState, useEffect, useContext } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { UserContext } from '@/app/contexts/UserContext';
import { User, QrCode, FileText, AlertCircle, Star, Upload, Check } from 'lucide-react';

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
  accessToken: string;
  allowPublicAccess: boolean;
  fields: FormField[];
}

interface Event {
  id: number;
  name: string;
  description: string;
  date: string;
  type: string;
}

interface UserProfile {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
}

export default function PublicFormPage() {
  const router = useRouter();
  const params = useParams();
  const userContext = useContext(UserContext);
  const user = userContext?.user;
  const token = params.token as string;

  const [event, setEvent] = useState<Event | null>(null);
  const [form, setForm] = useState<Form | null>(null);
  const [responses, setResponses] = useState<{ [fieldId: number]: any }>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [errors, setErrors] = useState<{ [key: string | number]: string }>({});
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [generatedCoupons, setGeneratedCoupons] = useState<any[]>([]);
  const [creditsAwarded, setCreditsAwarded] = useState<number>(0);

  // Guest user info for submission
  const [guestEmail, setGuestEmail] = useState('');
  const [guestName, setGuestName] = useState('');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  useEffect(() => {
    if (token) {
      fetchForm();
    }
  }, [token]);

  useEffect(() => {
    if (form && user?.id) {
      checkExistingSubmission();
    }
  }, [form, user]);

  const checkExistingSubmission = async () => {
    if (!form || !user?.id) return;
    
    try {
      // Check if user has already submitted this form
      const response = await fetch(`/api/forms/check-submission?formId=${form.id}&userId=${user.id}`);
      if (response.ok) {
        const data = await response.json();
        if (data.hasSubmitted) {
          setAlreadySubmitted(true);
          // Also set the previous response data if available
          if (data.submission && data.submission.responses) {
            const existingResponses: { [fieldId: number]: any } = {};
            data.submission.responses.forEach((response: any) => {
              try {
                existingResponses[response.fieldId] = JSON.parse(response.value);
              } catch {
                existingResponses[response.fieldId] = response.value;
              }
            });
            setResponses(existingResponses);
          }
        }
      }
    } catch (error) {
      console.error('Error checking existing submission:', error);
    }
  };

  const fetchForm = async () => {
    try {
      console.log(`📝 Frontend: Getting public form by token: ${token}`);
      const response = await fetch(`/api/forms/${token}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch form: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('✅ Frontend: Public form fetched successfully');
      console.log('🔍 Raw API Response:', JSON.stringify(data, null, 2));
      
      if (data.form) {
        // Parse JSON string fields from backend
        let parsedFields: any[] = [];
        if (data.form.fields) {
          parsedFields = data.form.fields.map((field: any) => {
            // If field is a JSON string, parse it
            if (typeof field === 'string') {
              try {
                return JSON.parse(field);
              } catch (e) {
                console.error('Failed to parse field JSON:', field);
                return {};
              }
            }
            // If field is already an object, return as-is
            return field;
          });
        }

        const formWithParsedFields = {
          ...data.form,
          fields: parsedFields
        };

        setForm(formWithParsedFields);
        console.log('📋 Form with parsed fields:', formWithParsedFields);
        console.log('🔍 Parsed fields array:', parsedFields);

        // Initialize responses based on parsed field data
        const initialResponses: { [fieldId: number]: any } = {};
        parsedFields.forEach((field: any) => {
          const fieldId = field.id;
          const fieldType = (field.type || '').toLowerCase();
          initialResponses[fieldId] = (fieldType === 'checkbox' || fieldType === 'checkboxes') ? [] : '';
        });
        setResponses(initialResponses);
        console.log('✅ Responses initialized:', initialResponses);

        if (data.event) {
          setEvent(data.event);
          console.log('🎯 Event data:', data.event);
        }
      } else {
        console.error('❌ No form data in response');
      }
    } catch (error) {
      console.error('❌ Error fetching form:', error);
      setErrors({ general: 'Failed to load form' });
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.user) {
          userContext?.login({ email: data.user.email, name: data.user.name, id: data.user.id });
        } else {
          userContext?.login({ email: loginEmail });
        }
        setShowLoginForm(false);
      } else {
        const data = await response.json();
        setLoginError(data.detail || 'Login failed');
      }
    } catch (error) {
      setLoginError('Login failed. Please try again.');
    }
  };

  const handleFieldChange = (fieldId: number, value: any) => {
    console.log(`🔄 Field change: fieldId=${fieldId}, value="${value}"`);
    console.log('📝 Current responses before change:', responses);
    
    setResponses(prev => {
      const updated = { 
        ...prev, 
        [fieldId]: value 
      };
      console.log('📝 Updated responses after change:', updated);
      console.log(`🎯 Specifically field ${fieldId}:`, updated[fieldId]);
      return updated;
    });
    
    // Clear error when user starts typing
    if (errors[fieldId]) {
      setErrors(prev => ({ ...prev, [fieldId]: '' }));
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

    // Validate guest info if not logged in
    if (!user && !showLoginForm) {
      if (!guestEmail) {
        setErrors(prev => ({ ...prev, email: 'Email is required' }));
        return false;
      }
      if (!guestName) {
        setErrors(prev => ({ ...prev, name: 'Name is required' }));
        return false;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrors({});

    if (!form) {
      setErrors({ general: 'Form not loaded' });
      setSubmitting(false);
      return;
    }

    // Validation
    const newErrors: { [key: string]: string } = {};
    
    form.fields?.forEach((field) => {
      if (field.isRequired) {
        const value = responses[field.id];
        if (!value || (Array.isArray(value) && value.length === 0)) {
          newErrors[field.id] = 'This field is required';
        }
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setSubmitting(false);
      return;
    }

    try {
      // Prepare submission data
      const submissionData = {
        userId: user?.id || null,
        guestEmail: user ? user.email : guestEmail,
        guestName: user ? `${user.firstName} ${user.lastName}` : guestName,
        responses: Object.entries(responses).map(([fieldId, value]) => ({
          fieldId: parseInt(fieldId),
          value: typeof value === 'object' ? JSON.stringify(value) : String(value)
        }))
      };

      console.log('📝 Submitting form with data:', submissionData);

      const response = await fetch(`/api/forms/${token}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submissionData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        
        // Handle specific case of already submitted form
        if (response.status === 409 && errorData.alreadySubmitted) {
          console.log('ℹ️ Form already submitted by user');
          setAlreadySubmitted(true);
          setSubmitted(true); // Show the success/already submitted state
          setSubmitting(false);
          return;
        }
        
        throw new Error(errorData.error || 'Failed to submit form');
      }

      const result = await response.json();
      console.log('✅ Form submitted successfully:', result);
      
      // Show success state
      setSubmitted(true);
      if (result.generatedCoupons) {
        setGeneratedCoupons(result.generatedCoupons);
      }
      if (result.creditsAwarded) {
        setCreditsAwarded(result.creditsAwarded);
      }
      
    } catch (error) {
      console.error('❌ Error submitting form:', error);
      setErrors({ general: 'Failed to submit form. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  const renderField = (field: any) => {
    const value = responses[field.id];
    const hasError = !!errors[field.id];
    let fieldType = (field.type || '').toLowerCase().trim();

    // Temporary fix for empty field types - guess based on question content or default to text
    if (!fieldType) {
      const question = (field.question || '').toLowerCase();
      if (question.includes('rate') || question.includes('rating') || question.includes('star')) {
        fieldType = 'rating';
      } else if (question.includes('enjoy') || question.includes('like') || question.includes('overall')) {
        fieldType = 'text';
      } else {
        fieldType = 'text'; // Default fallback
      }
    }

    console.log(`🎨 Rendering field ${field.id}:`);
    console.log(`   - Type: "${field.type}" -> normalized: "${fieldType}"`);
    console.log(`   - Question: "${(field as any).question}"`);
    console.log(`   - Current value: "${value}"`);
    console.log(`   - All responses:`, responses);

    console.log(`Rendering field ${field.id}: type="${field.type}" -> normalized="${fieldType}", question="${field.question}", value="${value}"`);

    switch (fieldType) {
      case 'text':
      case 'short text':
        return (
          <input
            key={`text-${field.id}`}
            type="text"
            value={value || ''}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            className={`w-full border ${hasError ? 'border-red-500' : 'border-gray-300'} rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-[#1c2a52] focus:border-[#1c2a52]`}
            placeholder={field.description || 'Your answer'}
            id={`field-${field.id}`}
          />
        );

      case 'textarea':
      case 'long text':
      case 'longtext':
        return (
          <textarea
            key={`textarea-${field.id}`}
            value={value || ''}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            className={`w-full border ${hasError ? 'border-red-500' : 'border-gray-300'} rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-[#1c2a52] focus:border-[#1c2a52] resize-none`}
            placeholder={field.description || 'Your answer'}
            rows={4}
            id={`field-${field.id}`}
          />
        );

      case 'select':
      case 'dropdown':
        return (
          <select
            key={`select-${field.id}`}
            value={value || ''}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            className={`w-full border ${hasError ? 'border-red-500' : 'border-gray-300'} rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-[#1c2a52] focus:border-[#1c2a52]`}
            id={`field-${field.id}`}
          >
            <option value="">Choose an option</option>
            {field.options?.map((option: string, index: number) => (
              <option key={`${field.id}-option-${index}`} value={option}>{option}</option>
            ))}
          </select>
        );

      case 'radio':
      case 'multiple choice':
      case 'multiplechoice':
        return (
          <div key={`radio-${field.id}`} className="space-y-3">
            {field.options?.map((option: string, index: number) => (
              <label key={`${field.id}-radio-${index}`} className="flex items-center gap-3 cursor-pointer p-2 hover:bg-gray-50 rounded">
                <input
                  type="radio"
                  name={`field-${field.id}`}
                  value={option}
                  checked={value === option}
                  onChange={(e) => handleFieldChange(field.id, e.target.value)}
                  className="w-5 h-5 text-[#1c2a52] border-gray-300 focus:ring-[#1c2a52]"
                  id={`field-${field.id}-radio-${index}`}
                />
                <span className="text-base text-gray-700">{option}</span>
              </label>
            ))}
          </div>
        );

      case 'checkbox':
      case 'checkboxes':
        return (
          <div key={`checkbox-${field.id}`} className="space-y-3">
            {field.options?.map((option: string, index: number) => (
              <label key={`${field.id}-checkbox-${index}`} className="flex items-center gap-3 cursor-pointer p-2 hover:bg-gray-50 rounded">
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
                  className="w-5 h-5 text-[#1c2a52] border-gray-300 rounded focus:ring-[#1c2a52]"
                  id={`field-${field.id}-checkbox-${index}`}
                />
                <span className="text-base text-gray-700">{option}</span>
              </label>
            ))}
          </div>
        );

      case 'rating':
      case 'rating scale':
      case 'ratingscale':
        return (
          <div key={`rating-${field.id}`} className="flex items-center gap-2">
            {[1, 2, 3, 4, 5].map((rating) => (
              <button
                key={`${field.id}-star-${rating}`}
                type="button"
                onClick={() => handleFieldChange(field.id, rating)}
                className={`p-2 rounded-lg transition-colors ${value >= rating ? 'text-yellow-500' : 'text-gray-300'} hover:text-yellow-500 hover:bg-gray-50`}
              >
                <Star className="w-8 h-8 fill-current" />
              </button>
            ))}
            {value && <span className="ml-3 text-base text-gray-600 font-medium">({value}/5)</span>}
          </div>
        );

      case 'file':
      case 'file upload':
      case 'fileupload':
        return (
          <div key={`file-${field.id}`} className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
            <Upload className="w-8 h-8 mx-auto mb-3 text-gray-400" />
            <p className="text-base text-gray-600 mb-3">File upload feature coming soon</p>
            <input
              type="text"
              value={value || ''}
              onChange={(e) => handleFieldChange(field.id, e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-[#1c2a52] focus:border-[#1c2a52]"
              placeholder="Enter file URL or description for now"
              id={`field-${field.id}`}
            />
          </div>
        );

      default:
        return (
          <div key={`default-${field.id}`} className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
            <p className="text-yellow-800 font-medium mb-2">Unknown field type: "{field.type || 'empty'}" (normalized: "{fieldType}")</p>
            <p className="text-yellow-600 text-sm mb-3">Using text input as fallback.</p>
            <input
              type="text"
              value={value || ''}
              onChange={(e) => handleFieldChange(field.id, e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-[#1c2a52] focus:border-[#1c2a52]"
              placeholder="Enter your response here as text"
              id={`field-${field.id}`}
            />
          </div>
        );
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
        <div className="relative z-10 w-full max-w-md bg-white bg-opacity-95 p-8 rounded shadow-lg backdrop-blur-sm text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-[#1c2a52] border-t-transparent mx-auto mb-6"></div>
          <h2 className="text-2xl font-bold text-[#1c2a52] mb-2">Loading Form</h2>
          <p className="text-gray-600">Please wait while we load the feedback form...</p>
        </div>
      </div>
    );
  }

  if (!form || !form.allowPublicAccess) {
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

        {/* Error content */}
        <div className="relative z-10 w-full max-w-md bg-white bg-opacity-95 p-8 rounded shadow-lg backdrop-blur-sm text-center">
          <FileText className="w-16 h-16 mx-auto mb-6 text-gray-400" />
          <h2 className="text-2xl font-bold text-[#1c2a52] mb-2">Form Not Available</h2>
          <p className="text-gray-600 mb-4">
            This form is not available or the link has expired.
          </p>
        </div>
      </div>
    );
  }

  if (submitted || alreadySubmitted) {
    return (
      <div
        className="relative min-h-screen w-full flex items-center justify-center"
        style={{
          backgroundImage: "url('/UofT.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          backgroundAttachment: "fixed"
        }}
      >
        {/* Dark faded overlay */}
        <div className="absolute inset-0 bg-black opacity-20 z-0" />

        {/* Success content */}
        <div className="relative z-10 w-full max-w-4xl mx-4 bg-white bg-opacity-95 p-8 rounded-lg shadow-xl backdrop-blur-sm text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-[#1c2a52] mb-2">
            {alreadySubmitted ? 'Already Submitted!' : 'Thank You!'}
          </h2>
          <p className="text-gray-600 mb-4">
            {alreadySubmitted 
              ? 'You have already submitted this form. Thank you for your feedback!'
              : 'Your feedback has been submitted successfully. We appreciate your input!'
            }
          </p>

          {alreadySubmitted && (
            <div className="bg-[#1c2a52]/10 border border-[#1c2a52]/20 rounded-lg p-6 mb-4">
              <h3 className="text-lg font-semibold text-[#1c2a52] mb-2">📋 Submission Information</h3>
              <p className="text-[#1c2a52] mb-3">
                You previously submitted this form. You cannot submit it again.
              </p>
              <p className="text-sm text-[#1c2a52]/80">
                ℹ️ If you need to make changes to your responses, please contact the event organizers.
              </p>
            </div>
          )}
          
          {!alreadySubmitted && generatedCoupons.length > 0 && (
            <div className="bg-gradient-to-r from-[#1c2a52]/10 to-blue-50 border border-[#1c2a52]/20 rounded-lg p-6 mb-4">
              <h3 className="text-lg font-semibold text-[#1c2a52] mb-2">Congratulations!</h3>
              <p className="text-[#1c2a52] mb-3">
                You've earned {generatedCoupons.length} discount coupon{generatedCoupons.length > 1 ? 's' : ''} for future events!
              </p>
                                <div className="space-y-2">
                    {generatedCoupons.map((coupon, index) => (
                      <div key={index} className="bg-white rounded-lg p-3 border border-[#1c2a52]/20">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-mono text-lg font-bold text-[#1c2a52]">{coupon.code}</p>
                            <p className="text-sm text-gray-600">{coupon.name}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-green-600 font-semibold">
                              {coupon.discountType === 'percentage' ? `${coupon.discountValue}% OFF` : `$${coupon.discountValue} OFF`}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-[#1c2a52] mt-3">
                    Save these codes! Use them when registering for future events.
                  </p>
            </div>
          )}

          {!alreadySubmitted && creditsAwarded > 0 && (
            <div className="bg-gradient-to-r from-[#1c2a52]/10 to-blue-50 border border-[#1c2a52]/20 rounded-lg p-6 mb-4">
              <h3 className="text-lg font-semibold text-[#1c2a52] mb-2"> Credits Awarded!</h3>
              <p className="text-[#1c2a52] mb-3">
                You've earned {creditsAwarded} credit{creditsAwarded > 1 ? 's' : ''} for future events!
              </p>
              <p className="text-xs text-[#1c2a52]/80 mt-3">
                These credits can be used towards future UTJN events.
              </p>
            </div>
          )}

          <div className="bg-[#1c2a52]/10 border border-[#1c2a52]/20 rounded-lg p-4 mb-4">
            <p className="text-sm text-[#1c2a52]">
              💡 <strong>Tip:</strong> Join UTJN to stay updated on future events and exclusive opportunities!
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative min-h-screen w-full py-6"
      style={{
        backgroundImage: "url('/UofT.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        backgroundAttachment: "fixed"
      }}
    >
      {/* Dark faded overlay */}
      <div className="absolute inset-0 bg-black opacity-20 z-0" />

      {/* Content */}
      <div className="relative z-10 w-full max-w-6xl mx-auto px-6">
        {/* Wider Header */}
        <div className="bg-white bg-opacity-95 rounded-lg shadow-lg border border-gray-200 backdrop-blur-sm mb-6">
          <div className="p-8">
            {/* Event Info */}
            {event && (
              <div className="mb-6 pb-6 border-b border-gray-100">
                <div className="flex items-center gap-3 mb-3">
                  <QrCode className="w-6 h-6 text-[#1c2a52]" />
                  <span className="text-sm text-[#1c2a52] font-medium">Accessed via QR Code</span>
                </div>
                <h1 className="text-3xl font-bold text-[#1c2a52] mb-3">{event.name}</h1>
                <p className="text-gray-600 mb-3">{event.description}</p>
                <div className="flex items-center gap-6 text-sm text-gray-500">
                  <span>{new Date(event.date).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}</span>
                  <span className="capitalize">{event.type}</span>
                </div>
              </div>
            )}

            {/* Form Header */}
            <div className="flex items-center gap-4">
              <FileText className="w-8 h-8 text-[#1c2a52]" />
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-[#1c2a52] mb-2">{form.title}</h2>
                <div className="flex items-center gap-3">
                  {form.isRequired && (
                    <span className="px-3 py-1 bg-red-50 text-red-700 text-sm rounded-full">
                      Required
                    </span>
                  )}
                  {form.description && (
                    <span className="text-gray-600">{form.description}</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* User Info Section - Wide */}
        {!user && (
          <div className="bg-white bg-opacity-95 rounded-lg shadow-lg border border-gray-200 backdrop-blur-sm mb-6">
            <div className="p-6">
              <h3 className="text-lg font-bold text-[#1c2a52] mb-4">Your Information</h3>
              
              {!showLoginForm ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      value={guestEmail}
                      onChange={(e) => setGuestEmail(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-[#1c2a52] focus:border-[#1c2a52]"
                      placeholder="your.email@example.com"
                    />
                    {errors.email && (
                      <p className="text-red-500 text-sm mt-1">{errors.email}</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-[#1c2a52] focus:border-[#1c2a52]"
                      placeholder="Your full name"
                    />
                    {errors.name && (
                      <p className="text-red-500 text-sm mt-1">{errors.name}</p>
                    )}
                  </div>
                </div>
              ) : (
                <form onSubmit={handleLogin} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                    <input
                      type="email"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-[#1c2a52] focus:border-[#1c2a52]"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                    <input
                      type="password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-[#1c2a52] focus:border-[#1c2a52]"
                      required
                    />
                  </div>
                  
                  {loginError && (
                    <p className="text-red-500 text-sm col-span-2">{loginError}</p>
                  )}
                  
                  <div className="flex items-center gap-3 col-span-2">
                    <button
                      type="submit"
                      className="px-6 py-3 bg-[#1c2a52] text-white rounded-lg hover:bg-[#2a3c6b]"
                    >
                      Login
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowLoginForm(false)}
                      className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}

              {!showLoginForm && (
                <div className="text-center mt-6 pt-6 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setShowLoginForm(true)}
                    className="text-[#1c2a52] text-sm hover:text-[#2a3c6b]"
                  >
                    Already have an account? Login instead
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {user && (
          <div className="bg-white bg-opacity-95 border border-[#1c2a52]/30 rounded-lg p-4 mb-6 flex items-center gap-3 shadow-sm">
            <User className="w-5 h-5 text-[#1c2a52]" />
            <span className="text-[#1c2a52] font-medium">Logged in as {user.email}</span>
          </div>
        )}

        {/* Enhanced Debug Info */}
        {/* <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-blue-800 text-sm font-mono">
            <strong>Debug:</strong> Form has {form.fields?.length || 0} fields.
          </p>
          <details className="mt-2">
            <summary className="text-blue-700 cursor-pointer text-sm">View Raw Field Data</summary>
            <pre className="mt-2 text-xs bg-white p-3 rounded border overflow-auto">
              {JSON.stringify(form.fields, null, 2)}
            </pre>
          </details>
        </div> */}

        {/* Form Fields - Wide Layout */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {form.fields && form.fields.length > 0 ? (
            form.fields
              .sort((a, b) => a.order - b.order)
              .map((field, index) => (
                <div key={field.id} className="bg-white bg-opacity-95 rounded-lg shadow-lg border border-gray-200 backdrop-blur-sm p-6 hover:shadow-xl transition-shadow">
                  <div className="mb-4">
                    <label className="block text-lg font-medium text-gray-900 mb-2">
                      {index + 1}. {field.question || `Question ${index + 1}`}
                      {field.isRequired && <span className="text-red-500 ml-1">*</span>}
                    </label>
                    {field.description && (
                      <p className="text-sm text-gray-600 mb-3">{field.description}</p>
                    )}
                    
                    {/* Temporary debug for question */}
                    {/* <div className="bg-yellow-50 p-2 rounded text-xs mb-2">
                      Debug: field.question = "{field.question || 'MISSING'}" (type: {typeof field.question})
                      <br />Raw field: {JSON.stringify(field)}
                    </div> */}
                  </div>
                  
                  <div className="form-field-content">
                    {renderField(field)}
                  </div>
                  
                  {errors[field.id] && (
                    <p className="text-red-500 text-sm mt-3 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      {errors[field.id]}
                    </p>
                  )}

                  {/* Field Debug Info */}
                  {/* <details className="mt-3">
                    <summary className="text-xs text-gray-500 cursor-pointer">Debug: Field Data</summary>
                    <pre className="mt-1 text-xs text-gray-600 bg-gray-50 p-2 rounded">
                      {JSON.stringify(field, null, 2)}
                    </pre>
                  </details> */}
                </div>
              ))
          ) : (
            <div className="bg-white bg-opacity-95 rounded-lg shadow-lg border border-gray-200 backdrop-blur-sm p-8 text-center">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-[#1c2a52] mb-3">No Questions Found</h3>
              <p className="text-gray-600 mb-4">
                This form doesn't have any questions configured yet.
              </p>
              <div className="bg-[#1c2a52]/10 border border-[#1c2a52]/20 rounded-lg p-4">
                <p className="text-sm text-[#1c2a52]">
                  <strong>Debug Info:</strong> Form ID: {form.id}, Fields: {form.fields?.length || 0}
                </p>
              </div>
            </div>
          )}

          {/* Submit Button - Wide */}
          {form.fields && form.fields.length > 0 && (
            <div className="bg-white bg-opacity-95 rounded-lg shadow-lg border border-gray-200 backdrop-blur-sm p-6">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-8 py-3 bg-[#1c2a52] text-white rounded-lg hover:bg-[#2a3c6b] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-base font-medium"
                >
                  {submitting ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Check className="w-5 h-5" />
                      Submit Feedback
                    </>
                  )}
                </button>
                <span className="text-sm text-gray-500">
                  Your responses help us improve future events
                </span>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
} 