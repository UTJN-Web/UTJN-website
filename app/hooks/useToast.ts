'use client';

import { useState } from 'react';

interface ToastState {
  isOpen: boolean;
  title: string;
  message: string;
  type: 'success' | 'error' | 'warning';
}

export function useToast() {
  const [toast, setToast] = useState<ToastState>({
    isOpen: false,
    title: '',
    message: '',
    type: 'success'
  });

  const showToast = (title: string, message: string, type: 'success' | 'error' | 'warning' = 'success') => {
    setToast({
      isOpen: true,
      title,
      message,
      type
    });
  };

  const hideToast = () => {
    setToast(prev => ({ ...prev, isOpen: false }));
  };

  const showSuccess = (message: string, title: string = 'Success') => {
    showToast(title, message, 'success');
  };

  const showError = (message: string, title: string = 'Error') => {
    showToast(title, message, 'error');
  };

  const showWarning = (message: string, title: string = 'Warning') => {
    showToast(title, message, 'warning');
  };

  return {
    toast,
    showToast,
    hideToast,
    showSuccess,
    showError,
    showWarning
  };
} 