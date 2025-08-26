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

  const getStyles = () => {
    // UTJN brand primary
    const brand = '#1c2a52';

    switch (type) {
      case 'success':
        return {
          icon: <CheckCircle className="w-5 h-5 text-white" />,
          ring: 'ring-[color:rgba(28,42,82,0.25)]',
          iconBg: 'bg-[color:#1c2a52]',
          titleColor: 'text-[color:#1c2a52]',
          textColor: 'text-[color:#1c2a52] opacity-90',
          barColor: 'bg-[color:#1c2a52]'
        };
      case 'error':
        return {
          icon: <XCircle className="w-5 h-5 text-white" />,
          ring: 'ring-red-200/60',
          iconBg: 'bg-red-600',
          titleColor: 'text-red-700',
          textColor: 'text-red-700/90',
          barColor: 'bg-red-600'
        };
      case 'warning':
        return {
          icon: <AlertTriangle className="w-5 h-5 text-white" />,
          ring: 'ring-amber-200/60',
          iconBg: 'bg-amber-600',
          titleColor: 'text-amber-700',
          textColor: 'text-amber-700/90',
          barColor: 'bg-amber-600'
        };
    }
  };

  const { icon, ring, iconBg, titleColor, textColor, barColor } = getStyles()!;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4 sm:px-0 transform transition-all duration-300 ease-in-out">
      <div
        role="status"
        aria-live="polite"
        className={`relative overflow-hidden rounded-xl border border-white/40 bg-white/90 dark:bg-[#1c1c1c]/90 backdrop-blur-md shadow-xl ${ring} ring-1`}
      >
        <div className="p-4">
          <div className="flex items-start gap-3">
            <div className={`flex h-8 w-8 items-center justify-center rounded-full ${iconBg} shadow-sm`}> 
              {icon}
            </div>
            <div className="flex-1">
              <h3 className={`text-sm font-semibold leading-5 ${titleColor}`}>
                {title}
              </h3>
              <p className={`mt-1 text-sm leading-6 ${textColor}`}>
                {message}
              </p>
            </div>
            <button
              onClick={onClose}
              aria-label="Close notification"
              className="ml-2 rounded-md p-1 text-gray-500 hover:text-gray-700 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        {/* Progress bar */}
        {duration > 0 && (
          <div className="absolute bottom-0 left-0 h-1 w-full bg-transparent">
            <div
              className={`${barColor} h-full animate-[toastbar_linear]`}
              style={{ animationDuration: `${duration}ms` }}
            />
          </div>
        )}
      </div>
      <style jsx>{`
        @keyframes toastbar_linear { from { width: 100%; } to { width: 0%; } }
      `}</style>
    </div>
  );
} 