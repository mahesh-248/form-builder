'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Navigation } from '@/components/Navigation';
import { ArrowLeft, Save, Eye, Settings, Plus, Trash2, GripVertical } from 'lucide-react';
import { FormField, FieldType, UpdateFormRequest, Form } from '@/types';
import { apiClient } from '@/lib/api';

const FIELD_TYPES: { type: FieldType; label: string; description: string }[] = [
  { type: 'text', label: 'Text Input', description: 'Single line text input' },
  { type: 'textarea', label: 'Text Area', description: 'Multi-line text input' },
  { type: 'email', label: 'Email', description: 'Email address input' },
  { type: 'number', label: 'Number', description: 'Numeric input' },
  { type: 'multiple_choice', label: 'Multiple Choice', description: 'Radio button selection' },
  { type: 'checkbox', label: 'Checkbox', description: 'Multiple selections' },
  { type: 'rating', label: 'Rating', description: '1-5 star rating' },
  { type: 'date', label: 'Date', description: 'Date picker' },
];

export default function EditFormPage() {
  const router = useRouter();
  const params = useParams();
  const formId = params.id as string;
  
  const [form, setForm] = useState<Form | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedField, setSelectedField] = useState<FormField | null>(null);
  
  const [formData, setFormData] = useState({
    title: '',
    description: ''
  });
  const [fields, setFields] = useState<FormField[]>([]);

  // Load existing form data
  useEffect(() => {
    const loadForm = async () => {
      try {
        const response = await fetch(`http://localhost:8081/api/v1/forms/${formId}`);
        if (!response.ok) throw new Error('Failed to fetch form');
        const formData = await response.json();
        
        setForm(formData);
        setFormData({
          title: formData.title,
          description: formData.description || ''
        });
        setFields(formData.fields || []);
        setLoading(false);
      } catch (err) {
        console.error('Error loading form:', err);
        setError('Failed to load form');
        setLoading(false);
      }
    };

    if (formId) {
      loadForm();
    }
  }, [formId]);

  const generateFieldId = () => {
    return `field_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  const addField = (type: FieldType) => {
    const newField: FormField = {
      id: generateFieldId(),
      type,
      label: `${type.charAt(0).toUpperCase() + type.slice(1)} Field`,
      required: false,
      validation: { required: false },
      order: fields.length,
      ...(type === 'multiple_choice' || type === 'checkbox' ? { 
        options: [{
          id: 'opt_1',
          label: 'Option 1',
          value: 'option_1'
        }] 
      } : {})
    };
    
    setFields(prev => [...prev, newField]);
    return newField;
  };

  const updateField = (fieldId: string, updates: Partial<FormField>) => {
    setFields(prev => prev.map(field => 
      field.id === fieldId ? { ...field, ...updates } : field
    ));
  };

  const removeField = (fieldId: string) => {
    setFields(prev => prev.filter(field => field.id !== fieldId));
  };

  const handleSave = async (publish = false) => {
    if (!formData.title.trim()) {
      setError('Form title is required');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const updateData: UpdateFormRequest = {
        title: formData.title,
        description: formData.description,
        fields: fields,
        is_published: publish
      };

      const response = await fetch(`http://localhost:8081/api/v1/forms/${formId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData)
      });

      if (!response.ok) throw new Error('Failed to update form');
      
      if (publish) {
        router.push('/forms');
      }
    } catch (err) {
      console.error('Error saving form:', err);
      setError('Failed to save form');
    } finally {
      setSaving(false);
    }
  };

  const handleAddField = (type: FieldType) => {
    const newField = addField(type);
    setSelectedField(newField);
  };

  const handleFieldSelect = (field: FormField) => {
    setSelectedField(field);
  };

  const handleFieldUpdate = (fieldId: string, updates: Partial<FormField>) => {
    updateField(fieldId, updates);
    if (selectedField?.id === fieldId) {
      setSelectedField({ ...selectedField, ...updates });
    }
  };

  const handleFieldDelete = (fieldId: string) => {
    removeField(fieldId);
    if (selectedField?.id === fieldId) {
      setSelectedField(null);
    }
  };

  if (loading) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading form...</p>
          </div>
        </div>
      </>
    );
  }

  if (error && !form) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <p className="text-red-600">{error}</p>
            <Link href="/forms">
              <Button className="mt-4">Back to Forms</Button>
            </Link>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Link href="/forms">
                  <Button variant="ghost" size="sm">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Forms
                  </Button>
                </Link>
                <div>
                  <h1 className="text-xl font-semibold">Edit Form</h1>
                  <p className="text-sm text-gray-600">
                    Editing: {form?.title}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Button
                  onClick={() => handleSave(false)}
                  disabled={saving}
                  variant="outline"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {saving ? 'Saving...' : 'Save Draft'}
                </Button>
                <Button
                  onClick={() => handleSave(true)}
                  disabled={saving}
                >
                  <Eye className="w-4 h-4 mr-2" />
                  {saving ? 'Publishing...' : 'Save & Publish'}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="container mx-auto px-4 py-2">
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          </div>
        )}

        <div className="container mx-auto px-4 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Left Sidebar - Field Types */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Add Fields</CardTitle>
                  <CardDescription>
                    Drag and drop field types to build your form
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {FIELD_TYPES.map((fieldType) => (
                      <Button
                        key={fieldType.type}
                        variant="outline"
                        className="w-full justify-start h-auto p-3"
                        onClick={() => handleAddField(fieldType.type)}
                      >
                        <div className="text-left">
                          <div className="font-medium">{fieldType.label}</div>
                          <div className="text-xs text-gray-500 mt-1">
                            {fieldType.description}
                          </div>
                        </div>
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Center - Form Builder */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Form Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="title">Form Title</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="Enter form title..."
                    />
                  </div>
                  <div>
                    <Label htmlFor="description">Description (Optional)</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Enter form description..."
                      rows={3}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Form Preview */}
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle>Form Preview</CardTitle>
                  <CardDescription>
                    {fields.length === 0 ? 'Add fields to see preview' : `${fields.length} field(s)`}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {fields.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <Plus className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p>No fields added yet</p>
                      <p className="text-sm">Add fields from the sidebar to start building your form</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {fields.map((field, index) => (
                        <div
                          key={field.id}
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.setData('text/plain', index.toString());
                            e.dataTransfer.effectAllowed = 'move';
                          }}
                          onDragOver={(e) => {
                            e.preventDefault();
                            e.dataTransfer.dropEffect = 'move';
                          }}
                          onDrop={(e) => {
                            e.preventDefault();
                            const startIndex = parseInt(e.dataTransfer.getData('text/plain'));
                            if (!isNaN(startIndex) && startIndex !== index) {
                              setFields(prev => {
                                const copy = [...prev];
                                const [removed] = copy.splice(startIndex, 1);
                                copy.splice(index, 0, removed);
                                return copy.map((f,i)=>({...f, order: i}));
                              });
                            }
                          }}
                          className={`group relative border rounded-lg p-4 cursor-pointer transition-all ${
                            selectedField?.id === field.id
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                          onClick={() => handleFieldSelect(field)}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-2">
                                <GripVertical className="w-4 h-4 text-gray-400" />
                                <span className="text-sm font-medium text-gray-600">
                                  {FIELD_TYPES.find(t => t.type === field.type)?.label}
                                </span>
                              </div>
                              
                              <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-700">
                                  {field.label}
                                  {field.required && <span className="text-red-500 ml-1">*</span>}
                                </label>
                                
                                {field.description && (
                                  <p className="text-xs text-gray-500">{field.description}</p>
                                )}

                                {/* Field Preview */}
                                {field.type === 'text' && (
                                  <input
                                    type="text"
                                    placeholder={field.placeholder}
                                    className="w-full p-2 border border-gray-300 rounded text-sm"
                                    disabled
                                  />
                                )}
                                {field.type === 'textarea' && (
                                  <textarea
                                    placeholder={field.placeholder}
                                    className="w-full p-2 border border-gray-300 rounded text-sm"
                                    rows={3}
                                    disabled
                                  />
                                )}
                                {field.type === 'email' && (
                                  <input
                                    type="email"
                                    placeholder={field.placeholder || 'Enter email address'}
                                    className="w-full p-2 border border-gray-300 rounded text-sm"
                                    disabled
                                  />
                                )}
                                {field.type === 'number' && (
                                  <input
                                    type="number"
                                    placeholder={field.placeholder}
                                    className="w-full p-2 border border-gray-300 rounded text-sm"
                                    disabled
                                  />
                                )}
                                {field.type === 'multiple_choice' && field.options && (
                                  <div className="space-y-2">
                                    {field.options.map((option, optionIndex) => (
                                      <label key={optionIndex} className="flex items-center space-x-2">
                                        <input type="radio" disabled />
                                        <span className="text-sm">{option.label}</span>
                                      </label>
                                    ))}
                                  </div>
                                )}
                                {field.type === 'checkbox' && field.options && (
                                  <div className="space-y-2">
                                    {field.options.map((option, optionIndex) => (
                                      <label key={optionIndex} className="flex items-center space-x-2">
                                        <input type="checkbox" disabled />
                                        <span className="text-sm">{option.label}</span>
                                      </label>
                                    ))}
                                  </div>
                                )}
                                {field.type === 'rating' && (
                                  <div className="flex space-x-1">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                      <span key={star} className="text-gray-300 text-xl">★</span>
                                    ))}
                                  </div>
                                )}
                                {field.type === 'date' && (
                                  <input
                                    type="date"
                                    className="w-full p-2 border border-gray-300 rounded text-sm"
                                    disabled
                                  />
                                )}
                              </div>
                            </div>

                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleFieldDelete(field.id);
                              }}
                              className="opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right Sidebar - Field Properties */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Field Properties</CardTitle>
                  <CardDescription>
                    {selectedField ? 'Configure the selected field' : 'Select a field to configure'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {selectedField ? (
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="field-label">Label</Label>
                        <Input
                          id="field-label"
                          value={selectedField.label}
                          onChange={(e) => handleFieldUpdate(selectedField.id, { label: e.target.value })}
                        />
                      </div>

                      <div>
                        <Label htmlFor="field-description">Description</Label>
                        <Textarea
                          id="field-description"
                          value={selectedField.description || ''}
                          onChange={(e) => handleFieldUpdate(selectedField.id, { description: e.target.value })}
                          rows={2}
                        />
                      </div>

                      {['text', 'textarea', 'email', 'number'].includes(selectedField.type) && (
                        <div>
                          <Label htmlFor="field-placeholder">Placeholder</Label>
                          <Input
                            id="field-placeholder"
                            value={selectedField.placeholder || ''}
                            onChange={(e) => handleFieldUpdate(selectedField.id, { placeholder: e.target.value })}
                          />
                        </div>
                      )}

                      {['multiple_choice', 'checkbox'].includes(selectedField.type) && (
                        <div>
                          <Label>Options</Label>
                          <div className="space-y-2 mt-2">
                            {(selectedField.options || []).map((option, index) => (
                              <div key={index} className="flex items-center space-x-2">
                                <Input
                                  value={option.label}
                                  onChange={(e) => {
                                    const newOptions = [...(selectedField.options || [])];
                                    newOptions[index] = {
                                      ...option,
                                      label: e.target.value,
                                      value: e.target.value.toLowerCase().replace(/\s+/g, '_')
                                    };
                                    handleFieldUpdate(selectedField.id, { options: newOptions });
                                  }}
                                />
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    const newOptions = (selectedField.options || []).filter((_, i) => i !== index);
                                    handleFieldUpdate(selectedField.id, { options: newOptions });
                                  }}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            ))}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const newOptions = [...(selectedField.options || [])];
                                const newIndex = newOptions.length + 1;
                                newOptions.push({
                                  id: `opt_${newIndex}`,
                                  label: `Option ${newIndex}`,
                                  value: `option_${newIndex}`
                                });
                                handleFieldUpdate(selectedField.id, { options: newOptions });
                              }}
                            >
                              <Plus className="w-4 h-4 mr-2" />
                              Add Option
                            </Button>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="field-required"
                          checked={selectedField.required || false}
                          onChange={(e) => handleFieldUpdate(selectedField.id, { required: e.target.checked })}
                        />
                        <Label htmlFor="field-required">Required field</Label>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center text-gray-500 py-8">
                      <Settings className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p>Select a field to configure its properties</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
