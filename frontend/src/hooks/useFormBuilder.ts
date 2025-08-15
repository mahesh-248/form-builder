import { useState, useCallback } from 'react';
import { FormField, FieldType, ValidationRule, FieldOption } from '@/types';
import { generateId } from '@/lib/utils';

export interface UseFormBuilderOptions {
  initialFields?: FormField[];
  onFieldsChange?: (fields: FormField[]) => void;
}

export function useFormBuilder(options: UseFormBuilderOptions = {}) {
  const [fields, setFields] = useState<FormField[]>(options.initialFields || []);
  const [selectedField, setSelectedField] = useState<FormField | null>(null);
  const [draggedField, setDraggedField] = useState<FormField | null>(null);

  const addField = useCallback((type: FieldType) => {
    const newField: FormField = {
      id: generateId(),
      type,
      label: getDefaultLabel(type),
      description: '',
      placeholder: getDefaultPlaceholder(type),
      required: false,
      options: type === 'multiple_choice' || type === 'checkbox' ? [
        { id: generateId(), label: 'Option 1', value: 'option1' },
        { id: generateId(), label: 'Option 2', value: 'option2' }
      ] : undefined,
      validation: getDefaultValidation(type),
      order: fields.length,
    };

    const updatedFields = [...fields, newField];
    setFields(updatedFields);
    setSelectedField(newField);
    options.onFieldsChange?.(updatedFields);
  }, [fields, options]);

  const updateField = useCallback((fieldId: string, updates: Partial<FormField>) => {
    const updatedFields = fields.map(field =>
      field.id === fieldId ? { ...field, ...updates } : field
    );
    setFields(updatedFields);
    
    if (selectedField?.id === fieldId) {
      setSelectedField({ ...selectedField, ...updates });
    }
    
    options.onFieldsChange?.(updatedFields);
  }, [fields, selectedField, options]);

  const removeField = useCallback((fieldId: string) => {
    const updatedFields = fields.filter(field => field.id !== fieldId);
    setFields(updatedFields);
    
    if (selectedField?.id === fieldId) {
      setSelectedField(null);
    }
    
    options.onFieldsChange?.(updatedFields);
  }, [fields, selectedField, options]);

  const duplicateField = useCallback((fieldId: string) => {
    const fieldToDuplicate = fields.find(field => field.id === fieldId);
    if (!fieldToDuplicate) return;

    const duplicatedField: FormField = {
      ...fieldToDuplicate,
      id: generateId(),
      label: fieldToDuplicate.label + ' (Copy)',
      order: fields.length,
    };

    const updatedFields = [...fields, duplicatedField];
    setFields(updatedFields);
    setSelectedField(duplicatedField);
    options.onFieldsChange?.(updatedFields);
  }, [fields, options]);

  const reorderFields = useCallback((startIndex: number, endIndex: number) => {
    const result = Array.from(fields);
    const [removed] = result.splice(startIndex, 1);
    result.splice(endIndex, 0, removed);

    // Update order property
    const updatedFields = result.map((field, index) => ({
      ...field,
      order: index,
    }));

    setFields(updatedFields);
    options.onFieldsChange?.(updatedFields);
  }, [fields, options]);

  const addFieldOption = useCallback((fieldId: string) => {
    const field = fields.find(f => f.id === fieldId);
    if (!field || !field.options) return;

    const newOption: FieldOption = {
      id: generateId(),
      label: `Option ${field.options.length + 1}`,
      value: `option${field.options.length + 1}`,
    };

    updateField(fieldId, {
      options: [...field.options, newOption],
    });
  }, [fields, updateField]);

  const updateFieldOption = useCallback((fieldId: string, optionId: string, updates: Partial<FieldOption>) => {
    const field = fields.find(f => f.id === fieldId);
    if (!field || !field.options) return;

    const updatedOptions = field.options.map(option =>
      option.id === optionId ? { ...option, ...updates } : option
    );

    updateField(fieldId, { options: updatedOptions });
  }, [fields, updateField]);

  const removeFieldOption = useCallback((fieldId: string, optionId: string) => {
    const field = fields.find(f => f.id === fieldId);
    if (!field || !field.options || field.options.length <= 1) return;

    const updatedOptions = field.options.filter(option => option.id !== optionId);
    updateField(fieldId, { options: updatedOptions });
  }, [fields, updateField]);

  const clearFields = useCallback(() => {
    setFields([]);
    setSelectedField(null);
    options.onFieldsChange?.([]);
  }, [options]);

  return {
    fields,
    selectedField,
    draggedField,
    setSelectedField,
    setDraggedField,
    addField,
    updateField,
    removeField,
    duplicateField,
    reorderFields,
    addFieldOption,
    updateFieldOption,
    removeFieldOption,
    clearFields,
  };
}

function getDefaultLabel(type: FieldType): string {
  const labels: Record<FieldType, string> = {
    text: 'Text Input',
    textarea: 'Text Area',
    email: 'Email Address',
    number: 'Number Input',
    multiple_choice: 'Multiple Choice',
    checkbox: 'Checkbox',
    rating: 'Rating',
    date: 'Date',
  };
  return labels[type];
}

function getDefaultPlaceholder(type: FieldType): string {
  const placeholders: Record<FieldType, string> = {
    text: 'Enter your answer...',
    textarea: 'Type your response here...',
    email: 'your.email@example.com',
    number: '0',
    multiple_choice: '',
    checkbox: '',
    rating: '',
    date: '',
  };
  return placeholders[type];
}

function getDefaultValidation(type: FieldType): ValidationRule {
  const validations: Record<FieldType, ValidationRule> = {
    text: { required: false, minLength: 0, maxLength: 255 },
    textarea: { required: false, minLength: 0, maxLength: 1000 },
    email: { required: false },
    number: { required: false, min: 0, max: 100 },
    multiple_choice: { required: false },
    checkbox: { required: false },
    rating: { required: false, min: 1, max: 5 },
    date: { required: false },
  };
  return validations[type];
}
