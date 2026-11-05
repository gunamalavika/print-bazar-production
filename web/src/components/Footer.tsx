'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

export function Footer() {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      setSubscribed(true);
      setEmail('');
      setTimeout(() => setSubscribed(false), 4000);
    }
  };

  return (
    <footer className="w-full max-w-full overflow-hidden font-sans">
      {/* 1. Top Newsletter Yellow Banner (#FFED00) */}
      <div className="w-full bg-[#FFED00] py-5 sm:py-6 md:py-7">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 sm:gap-5">
            {/* Left: Outline Envelope Icon + Title & Subtitle */}
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="text-black flex-shrink-0">
                <svg
                  className="w-8 h-8 sm:w-10 sm:h-10 md:w-11 md:h-11 stroke-black stroke-[1.8] fill-none"
                  viewBox="0 0 24 24"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <rect x="2" y="4" width="20" height="16" rx="2" />
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                </svg>
              </div>
              <div>
                <h3 className="text-base sm:text-lg md:text-xl font-black text-black tracking-tight leading-tight">
                  Subscribe to Our Newsletter
                </h3>
                <p className="text-xs sm:text-[13px] md:text-sm text-neutral-800 font-medium mt-0.5 leading-snug">
                  Get exclusive offers, new arrivals and printing tips.
                </p>
              </div>
            </div>

            {/* Right: Email Input + Subscribe Button */}
            <div className="w-full md:w-auto">
              {subscribed ? (
                <div className="inline-flex items-center px-4 sm:px-5 py-2 sm:py-2.5 rounded-[8px] bg-black text-[#FFED00] font-bold text-xs sm:text-sm shadow-sm">
                  ✓ Thank you for subscribing!
                </div>
              ) : (
                <form
                  onSubmit={handleSubscribe}
                  className="flex w-full md:w-[380px] lg:w-[420px] items-center bg-white rounded-md sm:rounded-[8px] overflow-hidden p-1 shadow-xs border border-neutral-300/60"
                >
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email address"
                    required
                    className="flex-1 bg-transparent px-3 sm:px-3.5 py-1.5 sm:py-2 text-xs sm:text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none min-w-0"
                  />
                  <button
                    type="submit"
                    className="bg-black hover:bg-neutral-800 active:scale-[0.98] text-white font-bold text-xs sm:text-sm px-4 sm:px-6 py-2 sm:py-2 rounded-[6px] transition-all whitespace-nowrap cursor-pointer"
                  >
                    Subscribe
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Main Footer Body (#181A19 Charcoal/Dark) */}
      <div className="w-full bg-[#181A19] text-white pt-10 sm:pt-12 lg:pt-14 pb-10 sm:pb-12 lg:pb-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 lg:grid-cols-12 gap-8 lg:gap-6">
            {/* Col 1: Brand & Social */}
            <div className="col-span-2 sm:col-span-3 md:col-span-2 lg:col-span-3 pr-0 lg:pr-4">
              <Link href="/" className="inline-flex items-center group mb-2" aria-label="Print Bazzar Home">
                <Image
                  src="/brand-logo-white.png"
                  alt="Print Bazzar"
                  width={212}
                  height={40}
                  className="h-8 sm:h-9 md:h-10 w-auto object-contain transition-transform duration-200 group-hover:scale-102"
                />
              </Link>
              <p className="text-xs sm:text-[13px] text-neutral-400 font-medium mt-1.5">
                Custom Printing Services
              </p>

              {/* Social Icons */}
              <div className="flex items-center gap-3 sm:gap-3.5 mt-4 sm:mt-5 text-white">
                <a
                  href="https://facebook.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Facebook"
                  className="text-white hover:text-[#FFED00] transition-colors p-1"
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                </a>
                <a
                  href="https://instagram.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram"
                  className="text-white hover:text-[#FFED00] transition-colors p-1"
                >
                  <svg className="w-4 h-4 fill-none stroke-current stroke-2" viewBox="0 0 24 24" aria-hidden="true">
                    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                  </svg>
                </a>
                <a
                  href="https://youtube.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="YouTube"
                  className="text-white hover:text-[#FFED00] transition-colors p-1"
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                  </svg>
                </a>
                <a
                  href="https://pinterest.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Pinterest"
                  className="text-white hover:text-[#FFED00] transition-colors p-1"
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M12 0C5.373 0 0 5.372 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738.098.119.112.224.083.345-.09.375-.291 1.199-.334 1.357-.053.225-.172.271-.401.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.354-.629-2.758-1.379l-.749 2.848c-.269 1.045-1.004 2.352-1.498 3.146 1.123.345 2.306.535 3.55.535 6.627 0 12-5.373 12-12 0-6.628-5.373-12-12-12z" />
                  </svg>
                </a>
              </div>
            </div>

            {/* Col 2: Shop */}
            <div className="col-span-1 sm:col-span-1 md:col-span-1 lg:col-span-2">
              <h4 className="text-sm font-bold text-white tracking-tight mb-3 sm:mb-4">
                Shop
              </h4>
              <ul className="space-y-2 text-xs sm:text-[13px] text-neutral-400">
                <li>
                  <Link href="/products" className="hover:text-white transition-colors">
                    All Products
                  </Link>
                </li>
                <li>
                  <Link href="/products?category=corporate-apparel" className="hover:text-white transition-colors">
                    T-Shirts
                  </Link>
                </li>
                <li>
                  <Link href="/products?category=corporate-apparel" className="hover:text-white transition-colors">
                    Hoodies
                  </Link>
                </li>
                <li>
                  <Link href="/products?category=corporate-gifts" className="hover:text-white transition-colors">
                    Mugs
                  </Link>
                </li>
                <li>
                  <Link href="/products?category=corporate-gifts" className="hover:text-white transition-colors">
                    Bags
                  </Link>
                </li>
                <li>
                  <Link href="/products?category=corporate-apparel" className="hover:text-white transition-colors">
                    Caps
                  </Link>
                </li>
              </ul>
            </div>

            {/* Col 3: Custom Printing */}
            <div className="col-span-1 sm:col-span-1 md:col-span-1 lg:col-span-2">
              <h4 className="text-sm font-bold text-white tracking-tight mb-3 sm:mb-4">
                Custom Printing
              </h4>
              <ul className="space-y-2 text-xs sm:text-[13px] text-neutral-400">
                <li>
                  <Link href="/#how-it-works" className="hover:text-white transition-colors">
                    How It Works
                  </Link>
                </li>
                <li>
                  <Link href="/templates" className="hover:text-white transition-colors">
                    Design Templates
                  </Link>
                </li>
                <li>
                  <Link href="/upload" className="hover:text-white transition-colors">
                    Upload Your Design
                  </Link>
                </li>
                <li>
                  <Link href="/bulk-orders" className="hover:text-white transition-colors">
                    Bulk Orders
                  </Link>
                </li>
                <li>
                  <Link href="/calculator" className="hover:text-white transition-colors">
                    Price Calculator
                  </Link>
                </li>
              </ul>
            </div>

            {/* Col 4: Customer Service */}
            <div className="col-span-1 sm:col-span-1 md:col-span-1 lg:col-span-2">
              <h4 className="text-sm font-bold text-white tracking-tight mb-3 sm:mb-4">
                Customer Service
              </h4>
              <ul className="space-y-2 text-xs sm:text-[13px] text-neutral-400">
                <li>
                  <Link href="/tracking" className="hover:text-white transition-colors">
                    Track Order
                  </Link>
                </li>
                <li>
                  <Link href="/shipping-policy" className="hover:text-white transition-colors">
                    Shipping Policy
                  </Link>
                </li>
                <li>
                  <Link href="/return-policy" className="hover:text-white transition-colors">
                    Return Policy
                  </Link>
                </li>
                <li>
                  <Link href="/faqs" className="hover:text-white transition-colors">
                    FAQs
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className="hover:text-white transition-colors">
                    Contact Us
                  </Link>
                </li>
              </ul>
            </div>

            {/* Col 5: About Us */}
            <div className="col-span-1 sm:col-span-1 md:col-span-1 lg:col-span-1">
              <h4 className="text-sm font-bold text-white tracking-tight mb-3 sm:mb-4">
                About Us
              </h4>
              <ul className="space-y-2 text-xs sm:text-[13px] text-neutral-400">
                <li>
                  <Link href="/about" className="hover:text-white transition-colors">
                    Our Story
                  </Link>
                </li>
                <li>
                  <Link href="/#why-us" className="hover:text-white transition-colors">
                    Why Choose Us
                  </Link>
                </li>
                <li>
                  <Link href="/blog" className="hover:text-white transition-colors">
                    Blog
                  </Link>
                </li>
                <li>
                  <Link href="/careers" className="hover:text-white transition-colors">
                    Careers
                  </Link>
                </li>
              </ul>
            </div>

            {/* Col 6: Payment Methods */}
            <div className="col-span-2 sm:col-span-2 md:col-span-2 lg:col-span-2">
              <h4 className="text-sm font-bold text-white tracking-tight mb-3 sm:mb-4">
                Payment Methods
              </h4>
              {/* Payment Cards: 100% Crisp Vector SVGs (Never Blurred) */}
              <div className="flex flex-col gap-2">
                {/* Row 1: VISA, Mastercard, UPI */}
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <div
                    title="Visa"
                    className="bg-white rounded-[5px] h-7 sm:h-[30px] px-2 sm:px-2.5 flex items-center justify-center border border-white/20 shadow-2xs hover:scale-105 transition-transform"
                  >
                    <img
                      src="/images/payments/visa.svg"
                      alt="Visa"
                      className="h-[11px] sm:h-[13px] w-auto object-contain"
                    />
                  </div>
                  <div
                    title="Mastercard"
                    className="bg-white rounded-[5px] h-7 sm:h-[30px] px-2 sm:px-2.5 flex items-center justify-center border border-white/20 shadow-2xs hover:scale-105 transition-transform"
                  >
                    <img
                      src="/images/payments/mastercard.svg"
                      alt="Mastercard"
                      className="h-[15px] sm:h-[18px] w-auto object-contain"
                    />
                  </div>
                  <div
                    title="UPI"
                    className="bg-white rounded-[5px] h-7 sm:h-[30px] px-2 sm:px-2.5 flex items-center justify-center border border-white/20 shadow-2xs hover:scale-105 transition-transform"
                  >
                    <img
                      src="/images/payments/upi.svg"
                      alt="UPI"
                      className="h-[12px] sm:h-[14px] w-auto object-contain"
                    />
                  </div>
                </div>

                {/* Row 2: Razorpay, PayPal */}
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <div
                    title="Razorpay"
                    className="bg-white rounded-[5px] h-7 sm:h-[30px] px-2 sm:px-2.5 flex items-center justify-center border border-white/20 shadow-2xs hover:scale-105 transition-transform"
                  >
                    <img
                      src="/images/payments/razorpay.svg"
                      alt="Razorpay"
                      className="h-[12px] sm:h-[13px] w-auto object-contain"
                    />
                  </div>
                  <div
                    title="PayPal"
                    className="bg-white rounded-[5px] h-7 sm:h-[30px] px-2 sm:px-2.5 flex items-center justify-center border border-white/20 shadow-2xs hover:scale-105 transition-transform"
                  >
                    <img
                      src="/images/payments/paypal.svg"
                      alt="PayPal"
                      className="h-[12px] sm:h-[14px] w-auto object-contain"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Bottom Bar: Copyright 2026 & Legal Links (#1A1C1B) */}
      <div className="w-full bg-[#1A1C1B] border-t border-neutral-800/80 py-4 sm:py-5 text-neutral-400 text-xs sm:text-[13px] pb-24 sm:pb-20 md:pb-5">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
            <p className="text-neutral-400">
              © 2026 PrintBazaar. All rights reserved.
            </p>
            <div className="flex items-center gap-3">
              <Link href="/privacy-policy" className="hover:text-white transition-colors">
                Privacy Policy
              </Link>
              <span className="text-neutral-600">|</span>
              <Link href="/terms" className="hover:text-white transition-colors">
                Terms & Conditions
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

