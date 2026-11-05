'use client';

import React, { useState } from 'react';
import {
  RiLock2Line,
  RiMailLine,
  RiPhoneLine,
  RiUser3Line,
  RiKeyLine,
  RiCloseLine,
  RiLoader4Line,
  RiShieldCheckLine,
  RiAlertLine,
  RiArrowRightLine,
} from 'react-icons/ri';
import { useAuth } from '@/lib/auth-context';
import { AuthenticatedUser } from '@/lib/api';
import { Button, Input, Modal } from '@/components/ui';

export interface CustomerAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (user: AuthenticatedUser) => void;
  initialMode?: 'LOGIN' | 'REGISTER';
  title?: string;
  subtitle?: string;
  zIndex?: string;
}

export function CustomerAuthModal({
  isOpen,
  onClose,
  onSuccess,
  initialMode = 'LOGIN',
  title,
  subtitle,
  zIndex = 'z-[200]',
}: CustomerAuthModalProps) {
  const { login, register } = useAuth();

  const [mode, setMode] = useState<'LOGIN' | 'REGISTER'>(initialMode);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Login Form State
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register Form State
  const [regFullName, setRegFullName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');

  if (!isOpen) return null;

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const identifier = loginIdentifier.trim();
    const password = loginPassword;

    if (!identifier || !password) {
      setErrorMessage('Please enter your email or mobile and password.');
      return;
    }

    setIsSubmitting(true);
    try {
      const user = await login(identifier, password);

      if (user.role && user.role !== 'CUSTOMER') {
        setErrorMessage(
          `Signed in as staff member (${user.role.replace(/_/g, ' ')}). Customer checkout requires a customer account.`,
        );
        setIsSubmitting(false);
        return;
      }

      onSuccess?.(user);
      onClose();
    } catch (err: any) {
      setErrorMessage(
        err?.message === 'Unauthorized' || err?.message?.includes('Invalid')
          ? 'Invalid email/mobile or password. Please try again.'
          : err?.message || 'Authentication failed. Please check your credentials.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const fullName = regFullName.trim();
    const email = regEmail.trim().toLowerCase();
    const phone = regPhone.trim();
    const password = regPassword;

    if (!fullName || !email || !password) {
      setErrorMessage('Please fill in your name, email, and password.');
      return;
    }

    if (password !== regConfirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      const user = await register({ email, password, fullName, phone });
      onSuccess?.(user);
      onClose();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Registration failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const defaultTitle = mode === 'LOGIN' ? 'Customer Sign In' : 'Create B2B Account';
  const defaultSubtitle =
    mode === 'LOGIN'
      ? 'Sign in to access real-time order tracking, saved specs, and tax invoices.'
      : 'Create an account for automated preflight checks and instant corporate quotes.';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title || defaultTitle}
      subtitle={subtitle || defaultSubtitle}
      maxWidth="md"
      zIndex={zIndex}
    >
      <div className="space-y-4">
        {/* Toggle Mode Pills */}
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/60">
          <button
            type="button"
            onClick={() => {
              setMode('LOGIN');
              setErrorMessage(null);
            }}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
              mode === 'LOGIN'
                ? 'bg-white text-slate-900 shadow-xs font-black'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('REGISTER');
              setErrorMessage(null);
            }}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
              mode === 'REGISTER'
                ? 'bg-white text-slate-900 shadow-xs font-black'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Register New Account
          </button>
        </div>

        {errorMessage && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs font-bold text-rose-700 flex items-start gap-2">
            <RiAlertLine className="h-4 w-4 text-rose-600 flex-shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {mode === 'LOGIN' ? (
          <form onSubmit={handleLoginSubmit} className="space-y-3.5">
            <Input
              label="Email or Mobile Number"
              required
              value={loginIdentifier}
              onChange={(e) => setLoginIdentifier(e.target.value)}
              placeholder="customer@acme.com or +91 9876543210"
            />
            <Input
              label="Password"
              type="password"
              required
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              placeholder="••••••••••••"
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full shadow-brand mt-2"
              disabled={isSubmitting}
              isLoading={isSubmitting}
            >
              <span>Sign In & Continue</span>
              <RiArrowRightLine className="h-4 w-4 ml-1.5" />
            </Button>

            <div className="pt-2 text-center text-xs text-slate-500">
              <span>Demo Customer Login: </span>
              <button
                type="button"
                onClick={() => {
                  setLoginIdentifier('customer@acme.com');
                  setLoginPassword('Admin@12345');
                }}
                className="font-mono font-bold text-slate-900 underline hover:text-amber-800"
              >
                Autofill customer@acme.com
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleRegisterSubmit} className="space-y-3">
            <Input
              label="Full Name / Authorized Contact"
              required
              value={regFullName}
              onChange={(e) => setRegFullName(e.target.value)}
              placeholder="e.g. Ramesh Patel"
            />
            <Input
              label="Business Email"
              type="email"
              required
              value={regEmail}
              onChange={(e) => setRegEmail(e.target.value)}
              placeholder="ramesh@acmelogistics.in"
            />
            <Input
              label="Mobile Phone"
              type="tel"
              value={regPhone}
              onChange={(e) => setRegPhone(e.target.value)}
              placeholder="+91 98765 43210"
            />
            <div className="grid grid-cols-2 gap-2">
              <Input
                label="Password"
                type="password"
                required
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                placeholder="••••••••"
              />
              <Input
                label="Confirm"
                type="password"
                required
                value={regConfirmPassword}
                onChange={(e) => setRegConfirmPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full shadow-brand mt-2"
              disabled={isSubmitting}
              isLoading={isSubmitting}
            >
              <span>Create Account & Continue</span>
              <RiArrowRightLine className="h-4 w-4 ml-1.5" />
            </Button>
          </form>
        )}
      </div>
    </Modal>
  );
}
