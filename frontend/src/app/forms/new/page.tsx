'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Navigation } from '@/components/Navigation';
import { ArrowLeft, Save, Eye, Settings, Plus, GripVertical } from 'lucide-react';
import { FormField, FieldType, CreateFormRequest } from '@/types';
import { useFormBuilder } from '@/hooks/useFormBuilder';
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

export default function NewFormPage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    fields,
    selectedField,
    setSelectedField,
    addField,
    updateField,
    removeField,
    reorderFields,
  } = useFormBuilder();

  const handleSaveForm = async (publish: boolean = false) => {
    if (!title.trim()) {
      setError('Form title is required');
      return;
    }

    if (fields.length === 0) {
      setError('At least one field is required');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const formData: CreateFormRequest = {
        title: title.trim(),
        description: description.trim(),
        fields,
      };

      const newForm = await apiClient.createForm(formData);
      
      if (publish) {
        await apiClient.publishForm(newForm.id, true);
        router.push(`/forms/${newForm.id}/analytics`);
      } else {
        router.push('/forms');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save form');
    } finally {
      setSaving(false);
    }
  };

  const handleFieldSelect = (field: FormField) => {
    setSelectedField(field);
  };

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
                <h1 className="text-2xl font-bold text-gray-900">Create New Form</h1>
                <p className="text-gray-600">Build your form with drag-and-drop fields</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Button 
                variant="outline" 
                onClick={() => handleSaveForm(false)}
                disabled={saving}
              >
                <Save className="w-4 h-4 mr-2" />
                Save Draft
              </Button>
              <Button 
                onClick={() => handleSaveForm(true)}
                disabled={saving}
              >
                <Eye className="w-4 h-4 mr-2" />
                Save & Publish
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        <div className="grid lg:grid-cols-4 gap-6">
          {/* Form Settings */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Settings className="w-5 h-5 mr-2" />
                  Form Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Form Title *
                  </label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter form title..."
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe your form..."
                    rows={3}
                    className="w-full"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Field Types */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Plus className="w-5 h-5 mr-2" />
                  Add Fields
                </CardTitle>
                <CardDescription>
                  Click to add field types to your form
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {FIELD_TYPES.map((fieldType) => (
                    <Button
                      key={fieldType.type}
                      variant="outline"
                      size="sm"
                      onClick={() => addField(fieldType.type)}
                      className="w-full justify-start text-left h-auto py-3"
                    >
                      <div>
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

          {/* Form Builder */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Form Preview</CardTitle>
                <CardDescription>
                  {fields.length === 0 
                    ? 'Add fields from the sidebar to start building your form'
                    : `${fields.length} field${fields.length === 1 ? '' : 's'} added`
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                {fields.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-lg">
                    <Plus className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No fields added yet</p>
                    <p className="text-sm text-gray-500 mt-1">
                      Add fields from the sidebar to get started
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {title && (
                      <div className="border-b pb-4 mb-6">
                        <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
                        {description && (
                          <p className="text-gray-600 mt-2">{description}</p>
                        )}
                      </div>
                    )}
                    
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
                            reorderFields(startIndex, index);
                          }
                        }}
                        className={`group p-4 border rounded-lg cursor-pointer transition-colors ${
                          selectedField?.id === field.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => handleFieldSelect(field)}
                      >
                        <div className="absolute -left-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <GripVertical className="w-4 h-4 text-gray-400" />
                        </div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="block text-sm font-medium text-gray-700">
                            {field.label}
                            {field.required && <span className="text-red-500 ml-1">*</span>}
                          </label>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeField(field.id);
                            }}
                            className="text-red-500 hover:text-red-700"
                          >
                            Remove
                          </Button>
                        </div>
                        
                        {field.description && (
                          <p className="text-sm text-gray-600 mb-3">{field.description}</p>
                        )}

                        {/* Field Preview */}
                        <div className="space-y-2">
                          {field.type === 'text' || field.type === 'email' || field.type === 'number' ? (
                            <Input
                              placeholder={field.placeholder}
                              disabled
                              type={field.type === 'number' ? 'number' : field.type === 'email' ? 'email' : 'text'}
                            />
                          ) : field.type === 'textarea' ? (
                            <Textarea
                              placeholder={field.placeholder}
                              disabled
                              rows={3}
                            />
                          ) : field.type === 'multiple_choice' ? (
                            <div className="space-y-2">
                              {field.options?.map((option) => (
                                <div key={option.id} className="flex items-center space-x-2">
                                  <input type="radio" disabled />
                                  <span className="text-sm">{option.label}</span>
                                </div>
                              ))}
                            </div>
                          ) : field.type === 'checkbox' ? (
                            <div className="space-y-2">
                              {field.options?.map((option) => (
                                <div key={option.id} className="flex items-center space-x-2">
                                  <input type="checkbox" disabled />
                                  <span className="text-sm">{option.label}</span>
                                </div>
                              ))}
                            </div>
                          ) : field.type === 'rating' ? (
                            <div className="flex items-center space-x-1">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <span key={star} className="text-gray-300 text-lg">★</span>
                              ))}
                            </div>
                          ) : field.type === 'date' ? (
                            <Input type="date" disabled />
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Field Properties */}
          <div className="lg:col-span-1">
            {selectedField && (
              <Card>
                <CardHeader>
                  <CardTitle>Field Properties</CardTitle>
                  <CardDescription>
                    Configure the selected field
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Field Label
                    </label>
                    <Input
                      value={selectedField.label}
                      onChange={(e) => updateField(selectedField.id, { label: e.target.value })}
                      placeholder="Enter field label..."
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description
                    </label>
                    <Textarea
                      value={selectedField.description || ''}
                      onChange={(e) => updateField(selectedField.id, { description: e.target.value })}
                      placeholder="Field description..."
                      rows={2}
                    />
                  </div>

                  {(selectedField.type === 'text' || selectedField.type === 'textarea' || selectedField.type === 'email') && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Placeholder
                      </label>
                      <Input
                        value={selectedField.placeholder || ''}
                        onChange={(e) => updateField(selectedField.id, { placeholder: e.target.value })}
                        placeholder="Enter placeholder text..."
                      />
                    </div>
                  )}

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="required"
                      checked={selectedField.required}
                      onChange={(e) => updateField(selectedField.id, { required: e.target.checked })}
                    />
                    <label htmlFor="required" className="text-sm font-medium text-gray-700">
                      Required field
                    </label>
                  </div>

                  {(selectedField.type === 'multiple_choice' || selectedField.type === 'checkbox') && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Options
                      </label>
                      <div className="space-y-2">
                        {selectedField.options?.map((option, index) => (
                          <div key={option.id} className="flex items-center space-x-2">
                            <Input
                              value={option.label}
                              onChange={(e) => {
                                const updatedOptions = [...(selectedField.options || [])];
                                updatedOptions[index] = { ...option, label: e.target.value, value: e.target.value.toLowerCase() };
                                updateField(selectedField.id, { options: updatedOptions });
                              }}
                              placeholder={`Option ${index + 1}`}
                              className="flex-1"
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const updatedOptions = selectedField.options?.filter(o => o.id !== option.id);
                                updateField(selectedField.id, { options: updatedOptions });
                              }}
                              className="text-red-500"
                            >
                              ×
                            </Button>
                          </div>
                        ))}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const newOption = {
                              id: Date.now().toString(),
                              label: `Option ${(selectedField.options?.length || 0) + 1}`,
                              value: `option${(selectedField.options?.length || 0) + 1}`
                            };
                            updateField(selectedField.id, { 
                              options: [...(selectedField.options || []), newOption] 
                            });
                          }}
                          className="w-full"
                        >
                          Add Option
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
      </div>
    </>
  );
}
