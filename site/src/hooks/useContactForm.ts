import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { validateContactValue } from '../utils/validation';

interface UseContactFormOptions {
  contact: string;
  onContactChange: (value: string) => void;
  successMessage: string;
  submitDelayMs?: number;
}

export function useContactForm({
  contact,
  onContactChange,
  successMessage,
  submitDelayMs = 700,
}: UseContactFormOptions) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    headingRef.current?.focus();
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, []);

  function handleInputChange(value: string) {
    onContactChange(value);
    if (errorMessage !== null) {
      setErrorMessage(null);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    setFeedbackMessage(null);
    const validationError = validateContactValue(contact);
    if (validationError !== null) {
      setErrorMessage(validationError);
      inputRef.current?.focus();
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);
    timerRef.current = window.setTimeout(() => {
      setIsSubmitting(false);
      setFeedbackMessage(successMessage);
    }, submitDelayMs);
  }

  return {
    errorMessage,
    feedbackMessage,
    setFeedbackMessage,
    isSubmitting,
    inputRef,
    headingRef,
    handleInputChange,
    handleSubmit,
  };
}
