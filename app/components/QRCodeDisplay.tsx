'use client';

import { useState, useEffect } from 'react';
import { QrCode, Download, Copy, Check, ExternalLink } from 'lucide-react';

/**
 * QRCodeDisplay Component
 * 
 * Displays a QR code for event form access. Note that there is only ONE QR code per event
 * because the database enforces a unique constraint (@@unique([eventId])) on the Form model,
 * meaning each event can have only one form, and therefore only one QR code.
 * 
 * The QR code links to a public form URL using the form's unique accessToken.
 */

interface QRCodeDisplayProps {
  formId: number;
  onClose?: () => void;
}

interface QRData {
  url: string;
  accessToken: string;
  formTitle: string;
  eventName: string;
  eventDate?: string;
}

export default function QRCodeDisplay({ formId, onClose }: QRCodeDisplayProps) {
  const [qrData, setQrData] = useState<QRData | null>(null);
  const [loading, setLoading] = useState(true);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchQRData();
  }, [formId]);

  useEffect(() => {
    if (qrData?.url) {
      generateQRCode(qrData.url);
    }
  }, [qrData]);

  const fetchQRData = async () => {
    try {
      const response = await fetch(`/api/forms/qr/${formId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setQrData(data.qrData);
        }
      }
    } catch (error) {
      console.error('Error fetching QR data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateQRCode = async (url: string) => {
    try {
      // Use a simple QR code generation approach
      // For production, you might want to use a library like qrcode
      const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(url)}`;
      setQrCodeDataUrl(qrApiUrl);
    } catch (error) {
      console.error('Error generating QR code:', error);
    }
  };

  const copyToClipboard = async () => {
    if (qrData?.url) {
      try {
        await navigator.clipboard.writeText(qrData.url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (error) {
        console.error('Failed to copy:', error);
      }
    }
  };

  const downloadQRCode = () => {
    if (qrCodeDataUrl) {
      const link = document.createElement('a');
      link.href = qrCodeDataUrl;
      link.download = `form-qr-${qrData?.formTitle?.replace(/\s+/g, '-') || 'code'}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Generating QR Code...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!qrData) {
    return (
      <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
          <div className="text-center">
            <p className="text-red-600">Failed to generate QR code</p>
            <button
              onClick={onClose}
              className="mt-4 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">QR Code for Form Access</h3>
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          )}
        </div>

        <div className="text-center">
          {/* Event and Form Info */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-semibold text-gray-900">{qrData.eventName}</h4>
            <p className="text-sm text-gray-600">{qrData.formTitle}</p>
            {qrData.eventDate && (
              <p className="text-xs text-gray-500 mt-1">
                {new Date(qrData.eventDate).toLocaleDateString()}
              </p>
            )}
          </div>

          {/* QR Code */}
          <div className="mb-6">
            {qrCodeDataUrl ? (
              <div className="inline-block p-4 bg-white border-2 border-gray-200 rounded-lg">
                <img
                  src={qrCodeDataUrl}
                  alt="QR Code for form access"
                  className="w-64 h-64 mx-auto"
                />
              </div>
            ) : (
              <div className="w-64 h-64 mx-auto bg-gray-100 rounded-lg flex items-center justify-center">
                <QrCode className="w-16 h-16 text-gray-400" />
              </div>
            )}
          </div>

          {/* URL Display */}
          <div className="mb-6 p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500 mb-1">Direct Link:</p>
            <p className="text-sm text-blue-600 break-all">{qrData.url}</p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={copyToClipboard}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied!' : 'Copy Link'}
            </button>
            
            <button
              onClick={downloadQRCode}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              <Download className="w-4 h-4" />
              Download QR
            </button>
            
            <a
              href={qrData.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              <ExternalLink className="w-4 h-4" />
              Test Form
            </a>
          </div>

          {/* Instructions */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Instructions:</strong> Show this QR code to event attendees. 
              They can scan it to access the feedback form directly without needing to log in first.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 