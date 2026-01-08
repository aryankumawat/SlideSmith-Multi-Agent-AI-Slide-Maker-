'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, Sparkles, Download, Share, Zap, Palette, BarChart3 } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header */}
      <header className="container mx-auto px-4 py-6">
        <nav className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Sparkles className="h-8 w-8 text-blue-600" />
            <span className="text-2xl font-bold text-gray-900 dark:text-white">SlideSmith</span>
          </div>
          <div className="flex items-center space-x-4">
            <Link href="/studio-new">
              <Button>Get Started</Button>
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6">
            AI-Powered
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
              {' '}Slide Creation
            </span>
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
            Transform any topic into stunning, animated slide decks with live widgets, 
            automatic theming, and seamless export to PDF or PPTX.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/studio-new">
              <Button size="lg" className="w-full sm:w-auto">
                <Sparkles className="mr-2 h-5 w-5" />
                Try It Now
              </Button>
            </Link>
            <Button size="lg" variant="outline" className="w-full sm:w-auto">
              <Download className="mr-2 h-5 w-5" />
              View Demo
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Everything you need for perfect presentations
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            From AI generation to live widgets, SlideSmith has all the tools you need.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center mb-4">
                <Zap className="h-6 w-6 text-blue-600" />
              </div>
              <CardTitle>AI Generation</CardTitle>
              <CardDescription>
                Generate complete slide decks from any topic with intelligent content creation.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardHeader>
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center mb-4">
                <Palette className="h-6 w-6 text-purple-600" />
              </div>
              <CardTitle>Beautiful Themes</CardTitle>
              <CardDescription>
                Choose from 5 stunning themes including DeepSpace, Ultraviolet, and more.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardHeader>
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center mb-4">
                <BarChart3 className="h-6 w-6 text-green-600" />
              </div>
              <CardTitle>Live Widgets</CardTitle>
              <CardDescription>
                Add real-time charts, tickers, countdowns, maps, and more to your slides.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardHeader>
              <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900 rounded-lg flex items-center justify-center mb-4">
                <Download className="h-6 w-6 text-orange-600" />
              </div>
              <CardTitle>Export Options</CardTitle>
              <CardDescription>
                Download your presentations as PDF or PPTX with perfect formatting.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardHeader>
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900 rounded-lg flex items-center justify-center mb-4">
                <Share className="h-6 w-6 text-red-600" />
              </div>
              <CardTitle>Easy Sharing</CardTitle>
              <CardDescription>
                Share your presentations via URL or save them locally for offline access.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardHeader>
              <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900 rounded-lg flex items-center justify-center mb-4">
                <Sparkles className="h-6 w-6 text-indigo-600" />
              </div>
              <CardTitle>Smart Editing</CardTitle>
              <CardDescription>
                Edit slides inline with WYSIWYG editing and real-time preview.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      {/* Demo Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            See SlideSmith in action
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Watch how easy it is to create professional presentations with AI.
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-8 text-center">
            <div className="text-6xl mb-4">🎬</div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Demo Video Coming Soon
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              We're working on a comprehensive demo video that shows SlideSmith's capabilities.
            </p>
            <Link href="/studio-new">
              <Button size="lg">
                Try It Yourself
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-12 text-center text-white">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to create amazing presentations?
          </h2>
          <p className="text-xl mb-8 opacity-90">
            Join thousands of users who are already using SlideSmith to create stunning presentations.
          </p>
          <Link href="/studio-new">
            <Button size="lg" variant="secondary" className="bg-white text-blue-600 hover:bg-gray-100">
              <Sparkles className="mr-2 h-5 w-5" />
              Start Creating Now
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-12 border-t border-gray-200 dark:border-gray-700">
        <div className="text-center text-gray-600 dark:text-gray-400">
          <p>&copy; 2024 SlideSmith.</p>
        </div>
      </footer>
    </div>
  );
}