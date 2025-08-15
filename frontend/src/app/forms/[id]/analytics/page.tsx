'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Navigation } from '@/components/Navigation';
import { 
  ArrowLeft, 
  Users, 
  TrendingUp, 
  BarChart3, 
  Calendar,
  Star,
  Download,
  RefreshCw,
  Eye
} from 'lucide-react';
import { Form, FormResponse, FormField } from '@/types';
import { useWebSocket } from '@/hooks/useWebSocket';

interface Analytics {
  total_responses: number;
  completion_rate: number;
  average_completion_time: number;
  response_trends: {
    date: string;
    count: number;
  }[];
  field_analytics: {
    field_id: string;
    field_label: string;
    field_type: string;
    response_rate: number;
    unique_responses: number;
    common_responses: any[];
    average_rating?: number;
    skip_rate: number;
  }[];
}

export default function AnalyticsPage() {
  const params = useParams();
  const formId = params.id as string;
  
  const [form, setForm] = useState<Form | null>(null);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [responses, setResponses] = useState<FormResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // WebSocket for real-time updates
  const { isConnected, subscribeToForm } = useWebSocket({
    onMessage: (event: string, data: any) => {
      console.log('Analytics WebSocket message:', event, data);
      
      if (event === 'response_submitted' && data?.form_id === formId) {
        console.log('New response submitted, refreshing analytics');
        loadAnalytics();
        setLastUpdated(new Date());
      }
    }
  });

  useEffect(() => {
    if (isConnected && formId) {
      console.log('Subscribing to form updates for:', formId);
      subscribeToForm(formId);
    }
  }, [isConnected, formId, subscribeToForm]);

  const loadForm = async () => {
    try {
      const response = await fetch(`http://localhost:8081/api/v1/forms/${formId}`);
      if (!response.ok) throw new Error('Failed to fetch form');
      const formData = await response.json();
      setForm(formData);
    } catch (err) {
      console.error('Error loading form:', err);
      setError('Failed to load form');
    }
  };

  const loadAnalytics = async () => {
    try {
      const [analyticsResponse, responsesResponse] = await Promise.all([
        fetch(`http://localhost:8081/api/v1/forms/${formId}/analytics`),
        fetch(`http://localhost:8081/api/v1/forms/${formId}/responses`)
      ]);

      if (!analyticsResponse.ok || !responsesResponse.ok) {
        throw new Error('Failed to fetch analytics');
      }

      const analyticsData = await analyticsResponse.json();
      const responsesData = await responsesResponse.json();

      setAnalytics(analyticsData);
      // Handle responses being wrapped in an object with pagination
      setResponses(responsesData.responses || []);
    } catch (err) {
      console.error('Error loading analytics:', err);
      setError('Failed to load analytics');
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([loadForm(), loadAnalytics()]);
      setLoading(false);
    };

    if (formId) {
      loadData();
    }
  }, [formId]);

  const handleRefresh = async () => {
    await loadAnalytics();
    setLastUpdated(new Date());
  };

  const getFieldAnalytics = (fieldId: string) => {
    return analytics?.field_analytics?.find(fa => fa.field_id === fieldId);
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const getResponsesForField = (fieldId: string) => {
    return responses
      .map(response => response.responses[fieldId])
      .filter(value => value !== undefined && value !== null && value !== '');
  };

  const getMostCommonResponses = (fieldId: string, limit = 5) => {
    const fieldResponses = getResponsesForField(fieldId);
    const counts: Record<string, number> = {};
    
    fieldResponses.forEach(response => {
      const value = Array.isArray(response) ? response.join(', ') : String(response);
      counts[value] = (counts[value] || 0) + 1;
    });

    return Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit)
      .map(([value, count]) => ({ value, count, percentage: (count / fieldResponses.length) * 100 }));
  };

  const getAverageRating = (fieldId: string) => {
    const ratings = getResponsesForField(fieldId).filter(r => typeof r === 'number');
    if (ratings.length === 0) return 0;
    return ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length;
  };

  if (loading) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading analytics...</p>
          </div>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <Card className="w-full max-w-md">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-red-600 mb-4">{error}</p>
                <Link href="/forms">
                  <Button>Back to Forms</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
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
                  <h1 className="text-xl font-semibold">Analytics Dashboard</h1>
                  <p className="text-sm text-gray-600">
                    {form?.title}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <div className="flex items-center space-x-2 text-sm text-gray-500">
                  <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                  <span>{isConnected ? 'Live' : 'Offline'}</span>
                  <span>•</span>
                  <span>Updated {lastUpdated.toLocaleTimeString()}</span>
                </div>
                <Button onClick={handleRefresh} variant="outline" size="sm">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh
                </Button>
                <Link href={`/f/${form?.share_token}`} target="_blank">
                  <Button variant="outline" size="sm">
                    <Eye className="w-4 h-4 mr-2" />
                    View Form
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-6">
          {/* Overview Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Responses</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics?.total_responses || 0}</div>
                <p className="text-xs text-muted-foreground">
                  +{responses.filter(r => new Date(r.created_at) > new Date(Date.now() - 24 * 60 * 60 * 1000)).length} today
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {analytics?.completion_rate ? `${Math.round(analytics.completion_rate)}%` : '0%'}
                </div>
                <p className="text-xs text-muted-foreground">
                  {analytics?.completion_rate && analytics.completion_rate > 80 ? 'Excellent' : 
                   analytics?.completion_rate && analytics.completion_rate > 60 ? 'Good' : 'Needs improvement'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg. Completion Time</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {analytics?.average_completion_time ? formatDuration(analytics.average_completion_time) : '0m 0s'}
                </div>
                <p className="text-xs text-muted-foreground">
                  Time to complete form
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Form Fields</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{form?.fields.length || 0}</div>
                <p className="text-xs text-muted-foreground">
                  Total form fields
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Response Trends */}
          {analytics?.response_trends && analytics.response_trends.length > 0 && (
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>Response Trends</CardTitle>
                <CardDescription>Daily response submissions over the last 7 days</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-end space-x-2">
                  {analytics.response_trends.map((trend, index) => (
                    <div key={index} className="flex-1 flex flex-col items-center">
                      <div 
                        className="w-full bg-blue-500 rounded-t"
                        style={{ 
                          height: `${Math.max(trend.count * 20, 8)}px`,
                          maxHeight: '200px'
                        }}
                      ></div>
                      <div className="text-xs text-gray-600 mt-2">{trend.count}</div>
                      <div className="text-xs text-gray-400">
                        {new Date(trend.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Field Analytics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {form?.fields.map((field) => {
              const fieldAnalytics = getFieldAnalytics(field.id);
              const commonResponses = getMostCommonResponses(field.id);
              const averageRating = field.type === 'rating' ? getAverageRating(field.id) : null;
              
              return (
                <Card key={field.id}>
                  <CardHeader>
                    <CardTitle className="text-lg">{field.label}</CardTitle>
                    <CardDescription>
                      {field.type.charAt(0).toUpperCase() + field.type.slice(1)} Field
                      {field.required && ' • Required'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Field Stats */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-sm text-gray-600">Response Rate</div>
                        <div className="text-lg font-semibold">
                          {fieldAnalytics?.response_rate ? `${Math.round(fieldAnalytics.response_rate)}%` : '0%'}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">Skip Rate</div>
                        <div className="text-lg font-semibold">
                          {fieldAnalytics?.skip_rate ? `${Math.round(fieldAnalytics.skip_rate)}%` : '0%'}
                        </div>
                      </div>
                    </div>

                    {/* Average Rating for rating fields */}
                    {field.type === 'rating' && averageRating !== null && (
                      <div>
                        <div className="text-sm text-gray-600 mb-2">Average Rating</div>
                        <div className="flex items-center space-x-2">
                          <div className="flex">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`h-5 w-5 ${
                                  star <= averageRating
                                    ? 'text-yellow-400 fill-current'
                                    : 'text-gray-300'
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-lg font-semibold">
                            {averageRating.toFixed(1)} / 5.0
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Common Responses */}
                    {commonResponses.length > 0 && (
                      <div>
                        <div className="text-sm text-gray-600 mb-2">Most Common Responses</div>
                        <div className="space-y-2">
                          {commonResponses.map((response, index) => (
                            <div key={index} className="flex items-center justify-between text-sm">
                              <span className="truncate flex-1 mr-2">{response.value}</span>
                              <div className="flex items-center space-x-2">
                                <span className="text-gray-600">{response.count}x</span>
                                <span className="text-gray-500">({Math.round(response.percentage)}%)</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Response Rate Bar */}
                    <div>
                      <div className="flex justify-between text-sm text-gray-600 mb-1">
                        <span>Response Coverage</span>
                        <span>{fieldAnalytics?.response_rate ? `${Math.round(fieldAnalytics.response_rate)}%` : '0%'}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{ width: `${fieldAnalytics?.response_rate || 0}%` }}
                        ></div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Recent Responses */}
          {responses.length > 0 && (
            <Card className="mt-8">
              <CardHeader>
                <CardTitle>Recent Responses</CardTitle>
                <CardDescription>Latest form submissions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {responses.slice(0, 5).map((response) => (
                    <div key={response.id} className="border rounded-lg p-4 bg-gray-50">
                      <div className="flex justify-between items-start mb-3">
                        <span className="text-sm font-medium">Response #{response.id.slice(-8)}</span>
                        <span className="text-xs text-gray-500">
                          {new Date(response.created_at).toLocaleString()}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        {Object.entries(response.responses).map(([fieldId, value]) => {
                          const field = form?.fields.find(f => f.id === fieldId);
                          if (!field) return null;
                          
                          return (
                            <div key={fieldId}>
                              <span className="text-gray-600">{field.label}:</span>
                              <span className="ml-2 font-medium">
                                {Array.isArray(value) ? value.join(', ') : String(value)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
