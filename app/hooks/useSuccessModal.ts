'use client';

import { useState } from 'react';

interface SuccessModalState {
  isOpen: boolean;
  title: string;
  message: string;
  buttonText?: string;
  onButtonClick?: () => void;
}

export function useSuccessModal() {
  const [modal, setModal] = useState<SuccessModalState>({
    isOpen: false,
    title: '',
    message: '',
    buttonText: 'Continue'
  });

  const showSuccessModal = (
    title: string, 
    message: string, 
    buttonText: string = 'Continue',
    onButtonClick?: () => void
  ) => {
    setModal({
      isOpen: true,
      title,
      message,
      buttonText,
      onButtonClick
    });
  };

  const hideSuccessModal = () => {
    setModal(prev => ({ ...prev, isOpen: false }));
  };

  return {
    modal,
    showSuccessModal,
    hideSuccessModal
  };
} 