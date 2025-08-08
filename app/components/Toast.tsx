'use client';

import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, AlertTriangle, X } from 'lucide-react';

interface ToastProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  type: 'success' | 'error' | 'warning';
  duration?: number;
}

export default function Toast({
  isOpen,
  onClose,
  title,
  message,
  type,
  duration = 5000
}: ToastProps) {
  useEffect(() => {
    if (isOpen && duration > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [isOpen, duration, onClose]);

  if (!isOpen) return null;

  const getIconAndColors = () => {
    switch (type) {
      case 'success':
        return {
          icon: <CheckCircle className="w-6 h-6 text-green-600" />,
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          textColor: 'text-green-800'
        };
      case 'error':
        return {
          icon: <XCircle className="w-6 h-6 text-red-600" />,
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          textColor: 'text-red-800'
        };
      case 'warning':
        return {
          icon: <AlertTriangle className="w-6 h-6 text-amber-600" />,
          bgColor: 'bg-amber-50',
          borderColor: 'border-amber-200',
          textColor: 'text-amber-800'
        };
    }
  };

  const { icon, bgColor, borderColor, textColor } = getIconAndColors();

  return (
    <div className="fixed top-4 right-4 z-50 transform transition-all duration-300 ease-in-out">
      <div className={`max-w-sm w-full ${bgColor} ${borderColor} border rounded-lg shadow-lg`}>
        <div className="p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              {icon}
            </div>
            <div className="ml-3 flex-1">
              <h3 className={`text-sm font-medium ${textColor}`}>
                {title}
              </h3>
              <p className={`mt-1 text-sm ${textColor} opacity-90`}>
                {message}
              </p>
            </div>
            <div className="ml-4 flex-shrink-0 flex">
              <button
                onClick={onClose}
                className={`inline-flex ${textColor} hover:opacity-75 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-green-50 focus:ring-green-600`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 