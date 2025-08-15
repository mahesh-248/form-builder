'use client';

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Navigation } from "@/components/Navigation";
import { Plus, BarChart3, Users, Zap } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <Navigation />

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Build Dynamic Forms with
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600"> Real-time Analytics</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Create customizable forms, collect responses, and view live analytics. 
            Drag-and-drop interface with powerful validation and real-time updates.
          </p>
          <div className="flex items-center justify-center space-x-4">
            <Link href="/forms/new">
              <Button size="lg" className="text-lg px-8">
                <Plus className="w-5 h-5 mr-2" />
                Create Form Now
              </Button>
            </Link>
            {/* <Link href="/demo">
              <Button size="lg" variant="outline" className="text-lg px-8">
                View Demo
              </Button>
            </Link> */}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Everything you need to build amazing forms
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            From simple contact forms to complex surveys, our platform provides all the tools you need.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <Card className="text-center">
            <CardHeader>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Zap className="w-6 h-6 text-blue-600" />
              </div>
              <CardTitle>Drag & Drop Builder</CardTitle>
              <CardDescription>
                Create forms visually with our intuitive drag-and-drop interface. No coding required.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="w-6 h-6 text-green-600" />
              </div>
              <CardTitle>Real-time Analytics</CardTitle>
              <CardDescription>
                Track responses as they come in with live charts and detailed analytics dashboards.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
              <CardTitle>Easy Sharing</CardTitle>
              <CardDescription>
                Generate unique shareable links for your forms and collect responses from anywhere.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-20">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">
            Ready to get started?
          </h2>
          <p className="text-xl mb-8 opacity-90">
            Create your first form in minutes and start collecting responses immediately.
          </p>
          <Link href="/forms/new">
            <Button size="lg" variant="secondary" className="text-lg px-8">
              <Plus className="w-5 h-5 mr-2" />
              Create Form Now
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <div className="w-6 h-6 bg-gradient-to-br from-blue-600 to-purple-600 rounded flex items-center justify-center">
              <span className="text-white font-bold text-xs">FB</span>
            </div>
            <span className="font-semibold">Form Builder</span>
          </div>
          <p className="text-gray-400">
            Build dynamic forms with real-time analytics. © 2025 Form Builder.
          </p>
        </div>
      </footer>
    </div>
  );
}
