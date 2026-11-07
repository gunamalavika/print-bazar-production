'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Printer,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Mail,
  Zap,
  Loader2,
  Sparkles,
  Lock,
  Compass,
  User,
  Phone,
  CheckCircle2,
  Info,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui';

function isSafeReturnUrl(url?: string | null): boolean {
  if (!url) return false;
  return url.startsWith('/') && !url.startsWith('//') && !url.includes(':');
}

function GoogleIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  );
}

interface SeedAccount {
  role: string;
  title: string;
  email: string;
  destination: string;
  badge: string;
  badgeColor: string;
  description: string;
}

const SEED_ACCOUNTS: SeedAccount[] = [
  {
    role: 'ADMIN_MANAGER',
    title: 'Admin / Manager',
    email: 'admin@printbazzar.com',
    destination: '/admin/dashboard',
    badge: 'Executive',
    badgeColor: 'bg-[#FEFCE8] text-[#854D0E] border-yellow-200',
    description: 'Full ERP & workflow control',
  },
  {
    role: 'OPERATIONAL_MANAGER',
    title: 'Operational Coordinator (OE)',
    email: 'operations@printbazzar.com',
    destination: '/operations',
    badge: 'Operations',
    badgeColor: 'bg-[#FEFCE8] text-[#854D0E] border-yellow-300',
    description: 'Central order coordination & assignments',
  },
  {
    role: 'PRODUCTION_OPERATOR',
    title: 'Production Operator',
    email: 'operator@printbazzar.com',
    destination: '/production/queue',
    badge: 'Shop Floor',
    badgeColor: 'bg-[#F0F9FF] text-[#075985] border-sky-200',
    description: 'Machine queue & job execution',
  },
  {
    role: 'DESIGNER_PREPRESS',
    title: 'Prepress Designer',
    email: 'prepress@printbazzar.com',
    destination: '/prepress/artwork',
    badge: 'Prepress',
    badgeColor: 'bg-[#FAF5FF] text-[#6B21A8] border-purple-200',
    description: 'Artwork proofs & preflight check',
  },
  {
    role: 'FINAL_QC_INSPECTOR',
    title: 'Final QC Inspector',
    email: 'finalqc@printbazzar.com',
    destination: '/qc/inspection',
    badge: 'Final QC',
    badgeColor: 'bg-[#F0FDF4] text-[#166534] border-green-200',
    description: 'Finished goods quality clearance',
  },
  {
    role: 'PACKING_OPERATOR',
    title: 'Packing Specialist',
    email: 'packing@printbazzar.com',
    destination: '/packing/station',
    badge: 'Fulfillment',
    badgeColor: 'bg-[#EEF2FF] text-[#3730A3] border-indigo-200',
    description: 'Boxing, barcode scan & labels',
  },
  {
    role: 'DISPATCH_LOGISTICS',
    title: 'Logistics / Dispatch',
    email: 'dispatch@printbazzar.com',
    destination: '/dispatch/manifest',
    badge: 'Shipping',
    badgeColor: 'bg-[#F0F9FF] text-[#075985] border-sky-200',
    description: 'Carrier manifest & tracking',
  },
  {
    role: 'SALES_OFFICE',
    title: 'Sales Office',
    email: 'sales@printbazzar.com',
    destination: '/sales/orders',
    badge: 'Commercial',
    badgeColor: 'bg-[#F0FDF4] text-[#166534] border-green-200',
    description: 'Quotes, custom pricing & orders',
  },
  {
    role: 'ACCOUNTS',
    title: 'Finance / Accounts',
    email: 'accounts@printbazzar.com',
    destination: '/finance/payments',
    badge: 'Finance',
    badgeColor: 'bg-[#F0FDF4] text-[#166534] border-green-200',
    description: 'Invoices, ledger & payments',
  },
  {
    role: 'CUSTOMER',
    title: 'Customer (B2B Buyer)',
    email: 'customer@acme.com',
    destination: '/account',
    badge: 'Client Portal',
    badgeColor: 'bg-[#F5F5F5] text-[#525252] border-[#E5E5E5]',
    description: 'Direct self-service orders & tracking',
  },
];

const DEFAULT_DEV_PASSWORD = 'Admin@12345';

function AuthContainer() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get('returnTo');
  const initialTab = searchParams.get('tab') === 'register' ? 'register' : 'signin';

  const { isAuthenticated, user, login, register, getRoleDestination, isLoading: authLoading } = useAuth();

  const [activeTab, setActiveTab] = useState<'signin' | 'register'>(initialTab);

  // Sign In States
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Register States
  const [regFullName, setRegFullName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);

  // Global / Action States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittingAction, setSubmittingAction] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showGoogleNotice, setShowGoogleNotice] = useState(false);

  // If already authenticated, redirect immediately
  useEffect(() => {
    if (!authLoading && isAuthenticated && user) {
      if (isSafeReturnUrl(returnTo)) {
        router.replace(returnTo!);
      } else {
        router.replace(getRoleDestination(user.role));
      }
    }
  }, [authLoading, isAuthenticated, user, returnTo, router, getRoleDestination]);

  // Execute Auto-Login for a given role account
  const handleAutoLogin = async (acc: SeedAccount) => {
    if (isSubmitting) return;

    setIdentifier(acc.email);
    setPassword(DEFAULT_DEV_PASSWORD);
    setErrorMessage('');
    setSuccessMessage('');
    setShowGoogleNotice(false);
    setIsSubmitting(true);
    setSubmittingAction(`role-${acc.email}`);

    try {
      const authenticatedUser = await login(acc.email, DEFAULT_DEV_PASSWORD);
      if (isSafeReturnUrl(returnTo)) {
        router.push(returnTo!);
      } else {
        router.push(getRoleDestination(authenticatedUser.role));
      }
    } catch {
      setErrorMessage(`Failed to auto-login as ${acc.email}. Please verify credentials.`);
      setIsSubmitting(false);
      setSubmittingAction(null);
    }
  };

  // Sign in with Email / Mobile
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setErrorMessage('');
    setSuccessMessage('');
    setShowGoogleNotice(false);

    const cleanIdentifier = identifier.trim();
    if (!cleanIdentifier || !password) {
      setErrorMessage('Please enter both your email/mobile and password.');
      return;
    }

    setIsSubmitting(true);
    setSubmittingAction('signin');

    try {
      const authenticatedUser = await login(cleanIdentifier, password);
      if (isSafeReturnUrl(returnTo)) {
        router.push(returnTo!);
      } else {
        router.push(getRoleDestination(authenticatedUser.role));
      }
    } catch {
      setErrorMessage('Invalid email/mobile or password.');
      setIsSubmitting(false);
      setSubmittingAction(null);
    }
  };

  // Create new account
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setErrorMessage('');
    setSuccessMessage('');
    setShowGoogleNotice(false);

    const cleanFullName = regFullName.trim();
    const cleanEmail = regEmail.trim();

    if (!cleanFullName || !cleanEmail || !regPassword) {
      setErrorMessage('Please fill in your name, email, and password.');
      return;
    }

    if (regPassword.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }

    setIsSubmitting(true);
    setSubmittingAction('register');

    try {
      const newUser = await register({
        fullName: cleanFullName,
        email: cleanEmail,
        password: regPassword,
        phone: regPhone.trim() || undefined,
      });

      setSuccessMessage('Account created successfully! Redirecting...');
      if (isSafeReturnUrl(returnTo)) {
        router.push(returnTo!);
      } else {
        router.push(getRoleDestination(newUser.role));
      }
    } catch (err: any) {
      const msg = err?.message || 'Registration failed. Email might already be registered.';
      setErrorMessage(msg);
      setIsSubmitting(false);
      setSubmittingAction(null);
    }
  };

  // Handler for Google Auth notice
  const handleGoogleAuth = () => {
    setShowGoogleNotice(true);
    setErrorMessage('');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* Left Column: Traditional Auth Form (Sign In & Register) */}
      <div className="lg:col-span-5 space-y-6">
        <div className="bg-white border border-[#E5E5E5] rounded-[8px] p-6 sm:p-8 shadow-xs">
          {/* Navigation Tabs (Sign In / Register) */}
          <div className="flex rounded-[8px] bg-[#F5F5F5] p-1 mb-6">
            <button
              type="button"
              onClick={() => {
                setActiveTab('signin');
                setErrorMessage('');
                setShowGoogleNotice(false);
              }}
              className={`flex-1 py-2 text-[13px] font-semibold rounded-[6px] transition-all ${
                activeTab === 'signin'
                  ? 'bg-white text-black shadow-xs'
                  : 'text-[#525252] hover:text-black'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('register');
                setErrorMessage('');
                setShowGoogleNotice(false);
              }}
              className={`flex-1 py-2 text-[13px] font-semibold rounded-[6px] transition-all ${
                activeTab === 'register'
                  ? 'bg-white text-black shadow-xs'
                  : 'text-[#525252] hover:text-black'
              }`}
            >
              Create Account
            </button>
          </div>

          <div className="mb-5">
            <h2 className="text-[20px] font-semibold tracking-tight text-black font-sans">
              {activeTab === 'signin' ? 'Welcome Back' : 'Create an Account'}
            </h2>
            <p className="text-[13px] text-[#525252] mt-1">
              {activeTab === 'signin'
                ? 'Sign in to access your orders, proofs, and print console.'
                : 'Join Print Bazzar to place orders, upload artwork, and track jobs.'}
            </p>
          </div>

          {/* Google OAuth Notice Banner */}
          {showGoogleNotice && (
            <div className="mb-5 p-3.5 rounded-[8px] bg-[#FEFCE8] border border-yellow-200 text-xs text-[#854D0E] animate-in fade-in flex items-start gap-2.5">
              <Info className="h-4 w-4 text-[#854D0E] flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-semibold block">Google OAuth Ready</span>
                <p className="text-[12px] text-[#854D0E] leading-relaxed">
                  Google Client credentials can be configured in your environment. For testing right now, please sign in with email/password or use the 1-Click Role Switcher on the right.
                </p>
              </div>
            </div>
          )}

          {/* Error Alert */}
          {errorMessage && (
            <div className="mb-5 p-3 rounded-[8px] bg-[#FEF2F2] border border-red-200 flex items-start gap-2.5 text-[13px] text-[#B91C1C] animate-in fade-in">
              <AlertCircle className="h-4 w-4 text-[#B91C1C] flex-shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Success Alert */}
          {successMessage && (
            <div className="mb-5 p-3 rounded-[8px] bg-[#F0FDF4] border border-green-200 flex items-start gap-2.5 text-[13px] text-[#166534] animate-in fade-in">
              <CheckCircle2 className="h-4 w-4 text-[#166534] flex-shrink-0 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Google Single Sign-On Button */}
          <button
            type="button"
            onClick={handleGoogleAuth}
            disabled={isSubmitting}
            className="w-full h-10 border border-[#E5E5E5] hover:bg-[#F5F5F5] text-black font-medium text-[13px] rounded-[8px] flex items-center justify-center gap-2.5 transition shadow-xs group cursor-pointer"
          >
            <GoogleIcon className="h-4 w-4 group-hover:scale-105 transition-transform" />
            <span>
              {activeTab === 'signin' ? 'Continue with Google' : 'Sign up with Google'}
            </span>
          </button>

          {/* Divider */}
          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#E5E5E5]" />
            </div>
            <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-wider">
              <span className="bg-white px-3 text-[#737373] font-mono">
                or with email
              </span>
            </div>
          </div>

          {/* Tab 1: SIGN IN FORM */}
          {activeTab === 'signin' && (
            <form onSubmit={handleSignIn} className="space-y-4">
              <div>
                <label
                  htmlFor="identifier"
                  className="block text-[13px] font-medium text-black mb-1.5 font-sans"
                >
                  Email or Mobile Number
                </label>
                <div className="relative">
                  <input
                    id="identifier"
                    type="text"
                    autoComplete="username"
                    required
                    disabled={isSubmitting}
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="name@company.com or +91 9876543210"
                    className="w-full h-10 pl-3.5 pr-10 text-[14px] font-normal bg-white text-black border border-[#E5E5E5] rounded-[8px] focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition"
                  />
                  <Mail className="h-4 w-4 text-[#737373] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="password"
                    className="block text-[13px] font-medium text-black font-sans"
                  >
                    Password
                  </label>
                  <a
                    href="#forgot-password"
                    onClick={(e) => {
                      e.preventDefault();
                      alert('Default seeded account password is: Admin@12345');
                    }}
                    className="text-[12px] font-medium text-[#525252] hover:text-black hover:underline"
                  >
                    Forgot password?
                  </a>
                </div>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    disabled={isSubmitting}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full h-10 pl-3.5 pr-10 text-[14px] font-normal bg-white text-black border border-[#E5E5E5] rounded-[8px] focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#737373] hover:text-black focus:outline-none cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="w-full shadow-xs text-black font-semibold tracking-wide"
                  disabled={isSubmitting}
                  isLoading={isSubmitting && submittingAction === 'signin'}
                >
                  <span>SIGN IN TO CONSOLE</span>
                  <ArrowRight className="h-4 w-4 ml-1.5" />
                </Button>
              </div>

              <div className="text-center pt-2">
                <p className="text-[13px] text-[#525252]">
                  Don't have an account?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('register');
                      setErrorMessage('');
                    }}
                    className="font-semibold text-black hover:underline cursor-pointer"
                  >
                    Create Account
                  </button>
                </p>
              </div>
            </form>
          )}

          {/* Tab 2: REGISTER FORM */}
          {activeTab === 'register' && (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label
                  htmlFor="regFullName"
                  className="block text-[13px] font-medium text-black mb-1.5 font-sans"
                >
                  Full Name
                </label>
                <div className="relative">
                  <input
                    id="regFullName"
                    type="text"
                    autoComplete="name"
                    required
                    disabled={isSubmitting}
                    value={regFullName}
                    onChange={(e) => setRegFullName(e.target.value)}
                    placeholder="e.g. Rahul Sharma"
                    className="w-full h-10 pl-3.5 pr-10 text-[14px] font-normal bg-white text-black border border-[#E5E5E5] rounded-[8px] focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition"
                  />
                  <User className="h-4 w-4 text-[#737373] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              <div>
                <label
                  htmlFor="regEmail"
                  className="block text-[13px] font-medium text-black mb-1.5 font-sans"
                >
                  Work or Personal Email
                </label>
                <div className="relative">
                  <input
                    id="regEmail"
                    type="email"
                    autoComplete="email"
                    required
                    disabled={isSubmitting}
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="name@company.com"
                    className="w-full h-10 pl-3.5 pr-10 text-[14px] font-normal bg-white text-black border border-[#E5E5E5] rounded-[8px] focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition"
                  />
                  <Mail className="h-4 w-4 text-[#737373] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              <div>
                <label
                  htmlFor="regPhone"
                  className="block text-[13px] font-medium text-black mb-1.5 font-sans"
                >
                  Mobile Number <span className="text-[#737373] font-normal lowercase">(optional)</span>
                </label>
                <div className="relative">
                  <input
                    id="regPhone"
                    type="tel"
                    autoComplete="tel"
                    disabled={isSubmitting}
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    placeholder="+91 9876543210"
                    className="w-full h-10 pl-3.5 pr-10 text-[14px] font-normal bg-white text-black border border-[#E5E5E5] rounded-[8px] focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition"
                  />
                  <Phone className="h-4 w-4 text-[#737373] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              <div>
                <label
                  htmlFor="regPassword"
                  className="block text-[13px] font-medium text-black mb-1.5 font-sans"
                >
                  Create Password
                </label>
                <div className="relative">
                  <input
                    id="regPassword"
                    type={showRegPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    minLength={6}
                    disabled={isSubmitting}
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    className="w-full h-10 pl-3.5 pr-10 text-[14px] font-normal bg-white text-black border border-[#E5E5E5] rounded-[8px] focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowRegPassword(!showRegPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#737373] hover:text-black focus:outline-none cursor-pointer"
                  >
                    {showRegPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="w-full shadow-xs text-black font-semibold tracking-wide"
                  disabled={isSubmitting}
                  isLoading={isSubmitting && submittingAction === 'register'}
                >
                  <span>CREATE YOUR ACCOUNT</span>
                  <ArrowRight className="h-4 w-4 ml-1.5" />
                </Button>
              </div>

              <div className="text-center pt-2">
                <p className="text-[13px] text-[#525252]">
                  Already registered?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('signin');
                      setErrorMessage('');
                    }}
                    className="font-semibold text-black hover:underline cursor-pointer"
                  >
                    Sign In
                  </button>
                </p>
              </div>
            </form>
          )}

          <div className="mt-6 pt-5 border-t border-[#E5E5E5] flex items-center justify-between text-[12px] text-[#525252]">
            <Link href="/" className="hover:text-black flex items-center gap-1 font-normal">
              <span>← Return to Storefront</span>
            </Link>
            <div className="flex items-center gap-1.5 text-[#166534] font-medium">
              <ShieldCheck className="h-4 w-4" />
              <span>256-Bit SSL Auth</span>
            </div>
          </div>
        </div>

        <div className="bg-[#F5F5F5] border border-[#E5E5E5] rounded-[8px] p-3 text-[12px] text-[#525252] flex items-center gap-2.5">
          <Lock className="h-4 w-4 text-[#737373] flex-shrink-0" />
          <span>
            Enterprise role-based permissions are enforced automatically upon login.
          </span>
        </div>
      </div>

      {/* Right Column: Quick Login Role Switcher (Seeded Accounts) */}
      <div className="lg:col-span-7">
        <div className="bg-white border border-[#E5E5E5] rounded-[8px] p-6 sm:p-7 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4 pb-4 border-b border-[#E5E5E5]">
            <div>
              <div className="flex items-center gap-2">
                <div className="p-1 rounded bg-[#FEFCE8] text-[#854D0E]">
                  <Zap className="h-4 w-4 fill-[#FFED00] text-black" />
                </div>
                <h3 className="text-[16px] font-semibold tracking-tight text-black font-sans">
                  Quick Login Role Switcher
                </h3>
              </div>
              <p className="text-[13px] text-[#525252] mt-1">
                Click any role card below to <span className="font-semibold text-black">instantly auto-login</span> into that department's console.
              </p>
            </div>

            <div className="flex items-center gap-1.5 bg-[#F5F5F5] px-2.5 py-1 rounded-[6px] text-[11px] font-mono text-[#525252] self-start sm:self-auto border border-[#E5E5E5]">
              <Sparkles className="h-3 w-3 text-[#854D0E]" />
              <span>1-Click Auto Login</span>
            </div>
          </div>

          {/* Seeded Accounts Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {SEED_ACCOUNTS.map((acc) => {
              const isCurrentLoggingIn = isSubmitting && submittingAction === `role-${acc.email}`;
              const isSelected = identifier === acc.email;

              return (
                <button
                  key={acc.role}
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleAutoLogin(acc)}
                  className={`group relative p-3 rounded-[8px] border text-left transition-all duration-150 flex flex-col justify-between ${
                    isCurrentLoggingIn
                      ? 'border-black bg-[#FEFCE8] ring-1 ring-black shadow-xs'
                      : isSelected
                      ? 'border-black bg-[#F5F5F5] ring-1 ring-black'
                      : 'border-[#E5E5E5] bg-white hover:border-black hover:bg-[#F5F5F5] hover:shadow-xs'
                  } ${isSubmitting && !isCurrentLoggingIn ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="font-semibold text-[13px] text-black group-hover:text-black truncate">
                        {acc.title}
                      </span>
                      <span
                        className={`text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded border uppercase tracking-wider ${acc.badgeColor}`}
                      >
                        {acc.badge}
                      </span>
                    </div>

                    <p className="text-[12px] text-[#525252] line-clamp-1 mb-2">
                      {acc.description}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-[#E5E5E5] flex items-center justify-between gap-2 mt-auto">
                    <span className="text-[11px] font-mono text-[#737373] truncate">
                      {acc.email}
                    </span>

                    <div className="flex items-center gap-1 text-[11px] font-medium text-black flex-shrink-0">
                      {isCurrentLoggingIn ? (
                        <span className="flex items-center gap-1 text-[#854D0E]">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          <span>Logging in...</span>
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 group-hover:translate-x-0.5 transition-transform text-[#525252] group-hover:text-black">
                          <span>Login</span>
                          <ArrowRight className="h-3 w-3" />
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-4 pt-3.5 border-t border-[#E5E5E5] flex items-center justify-between text-[12px] text-[#525252]">
            <div className="flex items-center gap-1.5">
              <Compass className="h-3.5 w-3.5 text-[#737373]" />
              <span>Default Dev Password: <code className="font-mono bg-[#F5F5F5] border border-[#E5E5E5] px-1.5 py-0.5 rounded text-black font-semibold">{DEFAULT_DEV_PASSWORD}</code></span>
            </div>
            <span className="hidden sm:inline text-[#737373] font-mono text-[10px]">
              Ready for immediate testing
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[#F8F8F8] flex flex-col justify-center py-10 sm:px-6 lg:px-8 blueprint-grid">
      {/* Top Header & Branding */}
      <div className="sm:mx-auto sm:w-full sm:max-w-4xl text-center mb-8">
        <Link href="/" className="inline-flex flex-col items-center gap-2 group" aria-label="Print Bazzar Home">
          <Image
            src="/brand-logo.png"
            alt="Print Bazzar"
            width={240}
            height={46}
            priority
            style={{ width: 'auto', height: 'auto' }}
            className="h-10 sm:h-12 w-auto object-contain transition-transform duration-200 group-hover:scale-102"
          />
          <div className="flex items-center gap-2">
            <span className="bg-black text-[#FFED00] text-[10px] font-mono font-bold px-1.5 py-0.5 rounded">
              2.0
            </span>
            <span className="text-[10px] font-mono font-semibold text-[#737373] uppercase tracking-widest">
              Unified Authentication Hub
            </span>
          </div>
        </Link>
      </div>

      {/* Main Content Area */}
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Suspense
          fallback={
            <div className="bg-white rounded-[8px] border border-[#E5E5E5] p-8 text-center text-xs font-mono text-[#737373]">
              Loading Authentication Hub...
            </div>
          }
        >
          <AuthContainer />
        </Suspense>
      </div>
    </div>
  );
}

