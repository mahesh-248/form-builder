'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Star } from 'lucide-react';

export default function DemoPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Home
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Demo Form</h1>
                <p className="text-gray-600">Experience our form builder in action</p>
              </div>
            </div>
            <Link href="/forms/new">
              <Button>Create Your Own Form</Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Demo Form */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Customer Feedback Survey</CardTitle>
              <CardDescription>
                Help us improve our services by sharing your experience
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name *
                </label>
                <Input placeholder="Enter your full name" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address *
                </label>
                <Input type="email" placeholder="your@email.com" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  How would you rate our service? *
                </label>
                <div className="flex items-center space-x-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      className="text-yellow-400 hover:text-yellow-500 text-2xl"
                    >
                      <Star className="w-6 h-6" />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Which services did you use? (Select all that apply)
                </label>
                <div className="space-y-2">
                  {['Customer Support', 'Product Delivery', 'Online Platform', 'Mobile App'].map((service) => (
                    <div key={service} className="flex items-center space-x-2">
                      <input type="checkbox" id={service} />
                      <label htmlFor={service} className="text-sm">{service}</label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  How did you hear about us?
                </label>
                <div className="space-y-2">
                  {['Social Media', 'Search Engine', 'Word of Mouth', 'Advertisement', 'Other'].map((source) => (
                    <div key={source} className="flex items-center space-x-2">
                      <input type="radio" name="source" id={source} />
                      <label htmlFor={source} className="text-sm">{source}</label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Additional Comments
                </label>
                <Textarea
                  placeholder="Tell us more about your experience..."
                  rows={4}
                />
              </div>

              <div className="flex items-center justify-between pt-4 border-t">
                <div className="text-sm text-gray-600">
                  * Required fields
                </div>
                <Button size="lg" disabled>
                  Submit Feedback (Demo)
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Demo Info */}
          <div className="mt-8 text-center">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-blue-900 mb-2">
                This is a Demo Form
              </h3>
              <p className="text-blue-700 mb-4">
                This form demonstrates the types of fields and interactions you can create with our form builder. 
                The form includes text inputs, email validation, star ratings, checkboxes, radio buttons, and text areas.
              </p>
              <div className="flex items-center justify-center space-x-4">
                <Link href="/forms/new">
                  <Button>
                    Create Your Own Form
                  </Button>
                </Link>
                <Link href="/forms">
                  <Button variant="outline">
                    View All Forms
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          {/* Features Highlight */}
          <div className="mt-8 grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Real-time Analytics</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 text-sm">
                  Track responses as they come in with live charts showing response distribution, 
                  average ratings, and completion rates.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Easy Sharing</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 text-sm">
                  Generate unique shareable links for your forms. Share via email, social media, 
                  or embed directly into your website.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
