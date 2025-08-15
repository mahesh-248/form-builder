'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Navigation } from '@/components/Navigation';
import { Plus, Eye, Edit, Trash2, BarChart3, Copy, Share } from 'lucide-react';
import { Form } from '@/types';
import { apiClient } from '@/lib/api';
import { formatDate, formatRelativeTime } from '@/lib/utils';

export default function FormsPage() {
  const [forms, setForms] = useState<Form[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadForms();
  }, []);

  const loadForms = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getForms();
      setForms(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load forms');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteForm = async (formId: string) => {
    if (!confirm('Are you sure you want to delete this form? This action cannot be undone.')) {
      return;
    }

    try {
      await apiClient.deleteForm(formId);
      setForms(forms.filter(form => form.id !== formId));
    } catch (err) {
      alert('Failed to delete form: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const handleDuplicateForm = async (formId: string) => {
    try {
      const duplicatedForm = await apiClient.duplicateForm(formId);
      setForms([duplicatedForm, ...forms]);
    } catch (err) {
      alert('Failed to duplicate form: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const handleTogglePublish = async (form: Form) => {
    try {
      const result = await apiClient.publishForm(form.id, !form.is_published);
      setForms(forms.map(f => f.id === form.id ? result.form : f));
    } catch (err) {
      alert('Failed to update form: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const copyShareLink = (shareToken: string) => {
    const shareUrl = `${window.location.origin}/f/${shareToken}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      alert('Share link copied to clipboard!');
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-8"></div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <Card key={i}>
                  <CardHeader>
                    <div className="h-6 bg-gray-200 rounded"></div>
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  </CardHeader>
                  <CardContent>
                    <div className="h-4 bg-gray-200 rounded mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b">
          <div className="container mx-auto px-4 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">My Forms</h1>
                <p className="text-gray-600 mt-2">
                  Create, manage, and analyze your forms
                </p>
              </div>
            <Link href="/forms/new">
              <Button size="lg">
                <Plus className="w-4 h-4 mr-2" />
                Create New Form
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">{error}</p>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={loadForms}
              className="mt-2"
            >
              Try Again
            </Button>
          </div>
        )}

        {forms.length === 0 && !loading && !error ? (
          <div className="text-center py-16">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Plus className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No forms yet
            </h3>
            <p className="text-gray-600 mb-6">
              Get started by creating your first form
            </p>
            <Link href="/forms/new">
              <Button size="lg">
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Form
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {forms.map((form) => (
              <Card key={form.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg line-clamp-2">
                        {form.title}
                      </CardTitle>
                      {form.description && (
                        <CardDescription className="mt-2 line-clamp-2">
                          {form.description}
                        </CardDescription>
                      )}
                    </div>
                    <div className="flex items-center space-x-1 ml-2">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        form.is_published 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {form.is_published ? 'Published' : 'Draft'}
                      </span>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center text-sm text-gray-600">
                      <span>{form.fields.length} fields</span>
                      <span className="mx-2">•</span>
                      <span>Created {formatRelativeTime(form.created_at)}</span>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t">
                      <div className="flex items-center space-x-2">
                        <Link href={`/forms/${form.id}/edit`}>
                          <Button variant="outline" size="sm">
                            <Edit className="w-4 h-4 mr-1" />
                            Edit
                          </Button>
                        </Link>
                        
                        {form.is_published && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => copyShareLink(form.share_token)}
                          >
                            <Share className="w-4 h-4 mr-1" />
                            Share
                          </Button>
                        )}
                      </div>

                      <div className="flex items-center space-x-1">
                        <Link href={`/forms/${form.id}/analytics`}>
                          <Button variant="ghost" size="sm">
                            <BarChart3 className="w-4 h-4" />
                          </Button>
                        </Link>
                        
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleDuplicateForm(form.id)}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                        
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleDeleteForm(form.id)}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <Button
                        variant={form.is_published ? "secondary" : "default"}
                        size="sm"
                        onClick={() => handleTogglePublish(form)}
                        className="flex-1 mr-2"
                      >
                        {form.is_published ? 'Unpublish' : 'Publish'}
                      </Button>
                      
                      {form.is_published && (
                        <Link href={`/f/${form.share_token}`} target="_blank">
                          <Button variant="outline" size="sm">
                            <Eye className="w-4 h-4 mr-1" />
                            View
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
      </div>
    </>
  );
}
