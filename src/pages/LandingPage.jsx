import React from 'react';
import { Link } from 'react-router-dom';
import {
  TrendingUp, Shield, Zap, BarChart3, Brain, Bell,
  ArrowRight, CheckCircle, Star, IndianRupee
} from 'lucide-react';

const FEATURES = [
  { icon: Brain, title: 'AI Receipt Scanner', desc: 'Upload receipts and let AI extract all details automatically.' },
  { icon: BarChart3, title: 'Smart Analytics', desc: 'Visualize spending patterns with beautiful charts and insights.' },
  { icon: Target, title: 'Budget Tracking', desc: 'Set monthly budgets per category and track progress in real-time.' },
  { icon: Bell, title: 'Smart Alerts', desc: 'Get email alerts at 80%, 90%, and 100% of your budget usage.' },
  { icon: TrendingUp, title: 'Stock Picks', desc: 'AI-powered Indian stock and mutual fund recommendations.' },
  { icon: Shield, title: 'Secure & Private', desc: 'Bank-grade security with Supabase Auth and row-level security.' },
];

function Target(props) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>
    </svg>
  );
}

const TESTIMONIALS = [
  { name: 'Arjun Sharma', role: 'Software Engineer, Bangalore', text: 'Finally a finance app built for Indians! The Rs. tracking and budget alerts are spot on.' },
  { name: 'Priya Mehta', role: 'Freelance Designer, Mumbai', text: 'The AI receipt scanner saves me so much time. Just snap a photo and done!' },
  { name: 'Rahul Verma', role: 'MBA Student, Delhi', text: 'The stock recommendations based on my savings pattern are really insightful.' },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-surface-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-brand-600 rounded-xl flex items-center justify-center shadow-sm">
              <TrendingUp size={18} className="text-white" />
            </div>
            <div>
              <span className="font-bold text-surface-900 text-sm">FinTrack</span>
              <span className="text-brand-600 font-bold text-sm"> India</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login" className="btn-secondary text-sm py-2 px-4">Sign in</Link>
            <Link to="/login?tab=signup" className="btn-primary text-sm py-2 px-4">Get started free</Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-32 pb-20 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-brand-50 border border-brand-100 rounded-full text-brand-700 text-xs font-semibold mb-8 animate-fade-in">
            <Zap size={14} />
            <span>Powered by Groq AI - For Indian Users</span>
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-surface-900 leading-tight mb-6 animate-slide-up">
            Your Smart{' '}
            <span className="text-brand-600">Financial</span>{' '}
            <br className="hidden sm:block" />
            Command Center
          </h1>
          <p className="text-lg text-surface-500 mb-10 max-w-2xl mx-auto leading-relaxed animate-slide-up">
            Track income and expenses in Rs., scan receipts with AI, set budgets, get smart alerts,
            and receive personalized stock recommendations - all in one beautiful app.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-up">
            <Link to="/login?tab=signup" className="btn-primary py-3 px-8 text-base w-full sm:w-auto">
              Start for Free
              <ArrowRight size={18} />
            </Link>
            <Link to="/login" className="btn-secondary py-3 px-8 text-base w-full sm:w-auto">
              Sign in
            </Link>
          </div>
          <div className="flex items-center justify-center gap-6 mt-8 text-sm text-surface-400">
            {['No credit card required', 'Free forever', 'Bank-level security'].map((t) => (
              <div key={t} className="flex items-center gap-1.5">
                <CheckCircle size={14} className="text-success-500" />
                <span>{t}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="py-12 bg-surface-50 border-y border-surface-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
            {[
              { value: 'Rs.2.4 Cr+', label: 'Transactions Tracked' },
              { value: '12,000+', label: 'Active Users' },
              { value: '98.9%', label: 'Uptime SLA' },
              { value: '4.9*', label: 'User Rating' },
            ].map(({ value, label }) => (
              <div key={label}>
                <p className="text-2xl sm:text-3xl font-bold text-surface-900">{value}</p>
                <p className="text-sm text-surface-500 mt-1">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-surface-900 mb-4">Everything you need to master your finances</h2>
            <p className="text-surface-500 text-lg max-w-2xl mx-auto">Built specifically for Indian users with INR support, local categories, and Indian market insights.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="card-hover group">
                <div className="w-11 h-11 bg-brand-50 rounded-xl flex items-center justify-center mb-4 group-hover:bg-brand-100 transition-colors">
                  <Icon size={22} className="text-brand-600" />
                </div>
                <h3 className="font-semibold text-surface-900 mb-2">{title}</h3>
                <p className="text-surface-500 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Dashboard Preview */}
      <section className="py-16 px-4 sm:px-6 bg-gradient-to-br from-brand-600 to-brand-800">
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">A dashboard built for clarity</h2>
          <p className="text-brand-200 mb-10 max-w-xl mx-auto">Track all your finances at a glance with beautiful charts and real-time insights.</p>
          <div className="bg-white/10 backdrop-blur rounded-2xl p-6 border border-white/20 max-w-3xl mx-auto">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              {[
                { label: 'Income', value: 'Rs.85,000', color: 'text-success-300' },
                { label: 'Expenses', value: 'Rs.52,400', color: 'text-danger-300' },
                { label: 'Savings', value: 'Rs.32,600', color: 'text-brand-200' },
                { label: 'Budget', value: '71%', color: 'text-warning-300' },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-white/10 rounded-xl p-3 text-left">
                  <p className="text-white/60 text-xs mb-1">{label}</p>
                  <p className={`text-lg font-bold ${color}`}>{value}</p>
                </div>
              ))}
            </div>
            <div className="h-32 bg-white/10 rounded-xl flex items-center justify-center">
              <div className="flex items-end gap-3 h-20">
                {[65, 80, 45, 90, 60, 75].map((h, i) => (
                  <div key={i} className="w-8 bg-brand-300 rounded-t-md opacity-80" style={{ height: `${h}%` }} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 px-4 sm:px-6 bg-surface-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-surface-900 mb-4">Loved by Indian professionals</h2>
          </div>
          <div className="grid sm:grid-cols-3 gap-6">
            {TESTIMONIALS.map(({ name, role, text }) => (
              <div key={name} className="card">
                <div className="flex gap-0.5 mb-3">
                  {Array(5).fill(0).map((_, i) => (
                    <Star key={i} size={14} className="text-warning-500 fill-warning-500" />
                  ))}
                </div>
                <p className="text-surface-600 text-sm leading-relaxed mb-4">"{text}"</p>
                <div>
                  <p className="font-semibold text-surface-900 text-sm">{name}</p>
                  <p className="text-surface-400 text-xs">{role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 sm:px-6">
        <div className="max-w-2xl mx-auto text-center">
          <div className="w-14 h-14 bg-brand-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
            <IndianRupee size={26} className="text-white" />
          </div>
          <h2 className="text-3xl font-bold text-surface-900 mb-4">Start your financial journey today</h2>
          <p className="text-surface-500 mb-8">Join thousands of Indians who are taking control of their money with FinTrack India.</p>
          <Link to="/login?tab=signup" className="btn-primary py-3 px-10 text-base inline-flex">
            Create Free Account
            <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 sm:px-6 border-t border-surface-100 text-center">
        <p className="text-surface-400 text-sm">
          (c) 2025 FinTrack India. Built with React, Supabase, and Groq AI.
        </p>
      </footer>
    </div>
  );
}
