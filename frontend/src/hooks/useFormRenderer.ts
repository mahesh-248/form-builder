import { useState, useCallback, useRef } from 'react';
import { FormField, FormRendererState } from '@/types';

export interface UseFormRendererOptions {
  fields: FormField[];
  onSubmit?: (responses: Record<string, any>) => Promise<void>;
  validateOnChange?: boolean;
}

export function useFormRenderer(options: UseFormRendererOptions) {
  const [state, setState] = useState<FormRendererState>({
    responses: {},
    errors: {},
    isSubmitting: false,
    isSubmitted: false,
    currentStep: 0,
  });

  const formRef = useRef<HTMLFormElement>(null);

  const updateResponse = useCallback((fieldId: string, value: any) => {
    setState(prev => ({
      ...prev,
      responses: {
        ...prev.responses,
        [fieldId]: value,
      },
      errors: {
        ...prev.errors,
        [fieldId]: '', // Clear error when user types
      },
    }));
  }, []);

  const validateField = useCallback((field: FormField, value: any): string => {
    const { validation } = field;

    // Required validation
    if (validation.required && (value === undefined || value === null || value === '')) {
      return `${field.label} is required`;
    }

    if (value === undefined || value === null || value === '') {
      return ''; // Skip other validations if field is empty and not required
    }

    // Type-specific validation
    switch (field.type) {
      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          return 'Please enter a valid email address';
        }
        break;

      case 'text':
      case 'textarea':
        if (validation.minLength && value.length < validation.minLength) {
          return `Minimum ${validation.minLength} characters required`;
        }
        if (validation.maxLength && value.length > validation.maxLength) {
          return `Maximum ${validation.maxLength} characters allowed`;
        }
        if (validation.pattern) {
          const regex = new RegExp(validation.pattern);
          if (!regex.test(value)) {
            return 'Please enter a valid format';
          }
        }
        break;

      case 'number':
        const num = parseFloat(value);
        if (isNaN(num)) {
          return 'Please enter a valid number';
        }
        if (validation.min !== undefined && num < validation.min) {
          return `Minimum value is ${validation.min}`;
        }
        if (validation.max !== undefined && num > validation.max) {
          return `Maximum value is ${validation.max}`;
        }
        break;

      case 'rating':
        const rating = parseFloat(value);
        if (isNaN(rating) || rating < 1 || rating > 5) {
          return 'Please select a valid rating';
        }
        break;

      case 'date':
        const date = new Date(value);
        if (isNaN(date.getTime())) {
          return 'Please enter a valid date';
        }
        break;
    }

    return '';
  }, []);

  const validateForm = useCallback((): boolean => {
    const errors: Record<string, string> = {};
    let hasErrors = false;

    options.fields.forEach(field => {
      const value = state.responses[field.id];
      const error = validateField(field, value);
      if (error) {
        errors[field.id] = error;
        hasErrors = true;
      }
    });

    setState(prev => ({ ...prev, errors }));
    return !hasErrors;
  }, [options.fields, state.responses, validateField]);

  const validateSingleField = useCallback((fieldId: string): boolean => {
    const field = options.fields.find(f => f.id === fieldId);
    if (!field) return true;

    const value = state.responses[fieldId];
    const error = validateField(field, value);

    setState(prev => ({
      ...prev,
      errors: {
        ...prev.errors,
        [fieldId]: error,
      },
    }));

    return !error;
  }, [options.fields, state.responses, validateField]);

  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault();

    if (state.isSubmitting) return;

    setState(prev => ({ ...prev, isSubmitting: true }));

    try {
      const isValid = validateForm();
      if (!isValid) {
        setState(prev => ({ ...prev, isSubmitting: false }));
        return;
      }

      if (options.onSubmit) {
        await options.onSubmit(state.responses);
      }

      setState(prev => ({
        ...prev,
        isSubmitting: false,
        isSubmitted: true,
      }));
    } catch (error) {
      console.error('Form submission error:', error);
      setState(prev => ({
        ...prev,
        isSubmitting: false,
        errors: {
          ...prev.errors,
          _form: error instanceof Error ? error.message : 'An error occurred while submitting the form',
        },
      }));
    }
  }, [state.isSubmitting, state.responses, validateForm, options]);

  const resetForm = useCallback(() => {
    setState({
      responses: {},
      errors: {},
      isSubmitting: false,
      isSubmitted: false,
      currentStep: 0,
    });
  }, []);

  const getFieldValue = useCallback((fieldId: string) => {
    return state.responses[fieldId];
  }, [state.responses]);

  const getFieldError = useCallback((fieldId: string) => {
    return state.errors[fieldId];
  }, [state.errors]);

  const hasFieldError = useCallback((fieldId: string) => {
    return Boolean(state.errors[fieldId]);
  }, [state.errors]);

  const getFormError = useCallback(() => {
    return state.errors._form;
  }, [state.errors]);

  const isFieldTouched = useCallback((fieldId: string) => {
    return fieldId in state.responses;
  }, [state.responses]);

  const getCompletionPercentage = useCallback(() => {
    const totalFields = options.fields.length;
    if (totalFields === 0) return 100;

    const completedFields = options.fields.filter(field => {
      const value = state.responses[field.id];
      return value !== undefined && value !== null && value !== '';
    }).length;

    return Math.round((completedFields / totalFields) * 100);
  }, [options.fields, state.responses]);

  const canSubmit = useCallback(() => {
    return !state.isSubmitting && !state.isSubmitted;
  }, [state.isSubmitting, state.isSubmitted]);

  return {
    // State
    responses: state.responses,
    errors: state.errors,
    isSubmitting: state.isSubmitting,
    isSubmitted: state.isSubmitted,
    currentStep: state.currentStep,
    formRef,

    // Actions
    updateResponse,
    handleSubmit,
    resetForm,
    validateForm,
    validateSingleField,

    // Getters
    getFieldValue,
    getFieldError,
    getFormError,
    hasFieldError,
    isFieldTouched,
    getCompletionPercentage,
    canSubmit,
  };
}
