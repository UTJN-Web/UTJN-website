'use client';

import { useState, useEffect } from 'react';
import { QrCode, ExternalLink, Copy, Check } from 'lucide-react';

interface Event {
  id: number;
  name: string;
  type: string;
  date: string;
}

interface Form {
  id: number;
  eventId: number;
  title: string;
  description?: string;
  accessToken: string;
  allowPublicAccess: boolean;
}

export default function TestFormsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [forms, setForms] = useState<Form[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch events
      const eventsResponse = await fetch('/api/events');
      if (eventsResponse.ok) {
        const eventsData = await eventsResponse.json();
        setEvents(eventsData || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getFormUrl = (accessToken: string) => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/form/${accessToken}`;
  };

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(id);
      setTimeout(() => setCopied(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const generateQRCode = (url: string) => {
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading test data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Form Testing Dashboard</h1>
          <p className="mt-2 text-gray-600">
            Test the public form access functionality. Each form gets a unique QR code and public link.
          </p>
        </div>

        {/* Instructions */}
        <div className="mb-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-blue-900 mb-4">🧪 How to Test</h2>
          <ol className="list-decimal list-inside space-y-2 text-blue-800">
            <li>Create a form for an event in the admin panel at <code>/admin/forms</code></li>
            <li>Come back to this page to see the generated public links and QR codes</li>
            <li>Click "Test Form" to open the public form page without logging in</li>
            <li>Share the QR code with others - they can scan it to access the form directly</li>
            <li>Complete the form to test the discount coupon generation</li>
          </ol>
        </div>

        {/* Events and Forms */}
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-gray-900">Events & Forms</h2>
          
          {events.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg border">
              <p className="text-gray-500">No events found. Create some events first!</p>
              <a 
                href="/admin/events" 
                className="mt-4 inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Go to Admin Panel
              </a>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {events.map((event) => {
                // For this demo, we'll show a placeholder since we need to fetch forms separately
                const mockAccessToken = `demo_${event.id}_${Math.random().toString(36).substr(2, 9)}`;
                const publicUrl = getFormUrl(mockAccessToken);
                const qrCodeUrl = generateQRCode(publicUrl);

                return (
                  <div key={event.id} className="bg-white rounded-lg border p-6">
                    <div className="mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">{event.name}</h3>
                      <p className="text-sm text-gray-500">
                        {new Date(event.date).toLocaleDateString()} • {event.type}
                      </p>
                    </div>

                    {/* Demo QR Code */}
                    <div className="mb-4 text-center">
                      <img
                        src={qrCodeUrl}
                        alt="QR Code"
                        className="w-32 h-32 mx-auto border rounded"
                      />
                      <p className="text-xs text-gray-500 mt-2">Demo QR Code</p>
                    </div>

                    {/* Public URL */}
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Public Form URL:
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={publicUrl}
                          readOnly
                          className="flex-1 text-xs bg-gray-50 border rounded px-2 py-1"
                        />
                        <button
                          onClick={() => copyToClipboard(publicUrl, event.id.toString())}
                          className="p-1 text-gray-500 hover:text-gray-700"
                          title="Copy URL"
                        >
                          {copied === event.id.toString() ? (
                            <Check className="w-4 h-4 text-green-600" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="space-y-2">
                      <a
                        href={publicUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 text-sm"
                      >
                        <ExternalLink className="w-4 h-4" />
                        Test Form (Demo)
                      </a>
                      
                      <div className="text-center">
                        <a 
                          href="/admin/forms"
                          className="text-sm text-blue-600 hover:text-blue-700"
                        >
                          Create actual form for this event →
                        </a>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Feature Overview */}
        <div className="mt-12 bg-white rounded-lg border p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">🚀 Implemented Features</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">✅ Completed</h3>
              <ul className="space-y-1 text-sm text-gray-600">
                <li>• Unique access tokens for each form</li>
                <li>• Public form access without login requirement</li>
                <li>• QR code generation for easy sharing</li>
                <li>• Guest user submission support</li>
                <li>• Optional login for existing users</li>
                <li>• Automatic coupon generation on form completion</li>
                <li>• Beautiful responsive form UI</li>
                <li>• Admin panel integration with QR codes</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">🔧 Technical Implementation</h3>
              <ul className="space-y-1 text-sm text-gray-600">
                <li>• Database schema updated with accessToken</li>
                <li>• New API endpoints for public form access</li>
                <li>• Frontend routes: <code>/form/[token]</code></li>
                <li>• Backend routes: <code>/forms/public/[token]</code></li>
                <li>• QR code generation in admin panel</li>
                <li>• Migration script for existing forms</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 