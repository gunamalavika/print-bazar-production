'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ChevronDown, ArrowRight, HelpCircle, MessageCircle } from 'lucide-react';

interface FAQItem {
  id: string;
  question: string;
  answer: React.ReactNode;
}

const FAQS_LEFT: FAQItem[] = [
  {
    id: 'faq-1',
    question: 'How long will my order take to reach me?',
    answer: (
      <p>
        Orders are printed and dispatched within{' '}
        <strong className="text-neutral-900 font-semibold">24 to 48 hours</strong>{' '}
        of order confirmation and digital artwork proof approval. After dispatch, standard
        delivery takes{' '}
        <strong className="text-neutral-900 font-semibold">2 to 4 working days</strong>{' '}
        in Tamil Nadu & South India, and{' '}
        <strong className="text-neutral-900 font-semibold">3 to 6 working days</strong>{' '}
        in metro cities across India. Same-day counter pickup is also available at our
        Trichy facility.
      </p>
    ),
  },
  {
    id: 'faq-3',
    question: 'Will I receive a design preview / proof of my order before printing?',
    answer: (
      <p>
        <strong className="text-neutral-900 font-semibold">Yes, 100%!</strong> Before
        sending any print job to our presses, our prepress team shares a calibrated,
        high-resolution digital proof on{' '}
        <strong className="text-neutral-900 font-semibold">WhatsApp and Email</strong>{' '}
        showing trim lines, bleed margins, and dimensions. We only begin printing once
        you explicitly confirm and approve.
      </p>
    ),
  },
  {
    id: 'faq-5',
    question: 'Can I cancel or change my order after placing it?',
    answer: (
      <p>
        You can update your artwork, change quantities, or edit specifications at any
        time <strong className="text-neutral-900 font-semibold">before proof approval</strong>.
        Once the proof is approved and the job enters the manufacturing pipeline,
        orders cannot be modified or cancelled due to custom substrate setup.
      </p>
    ),
  },
  {
    id: 'faq-7',
    question: 'What file formats do you accept for artwork?',
    answer: (
      <p>
        We accept{' '}
        <strong className="text-neutral-900 font-semibold">
          PDF (preferred, CMYK at 300+ DPI), CDR (CorelDraw), AI, PSD, and high-resolution PNG/JPG
        </strong>
        . If you don’t have ready artwork, our design studio can create clean,
        production-ready layouts for you.
      </p>
    ),
  },
];

const FAQS_RIGHT: FAQItem[] = [
  {
    id: 'faq-2',
    question: 'Do you provide Cash on Delivery (COD)?',
    answer: (
      <p>
        Because all our products (visiting cards, boxes, marketing collateral, customized apparel)
        are <strong className="text-neutral-900 font-semibold">custom manufactured with your personalized artwork</strong>,
        we accept secure online prepaid payments via{' '}
        <strong className="text-neutral-900 font-semibold">UPI (GPay, PhonePe, Paytm), Net Banking, Cards, and Razorpay</strong>.
        For customers choosing local store pickup at Trichy, counter payment is also available upon collection.
      </p>
    ),
  },
  {
    id: 'faq-4',
    question: 'Do you charge for shipping or offer free delivery?',
    answer: (
      <p>
        We offer{' '}
        <strong className="text-neutral-900 font-semibold">
          Free Shipping on all prepaid orders over ₹999
        </strong>{' '}
        anywhere in India! For orders below ₹999, a nominal standard courier fee of ₹60
        is added at checkout.
      </p>
    ),
  },
  {
    id: 'faq-6',
    question: 'What if I receive a damaged, wrong, or short delivery?',
    answer: (
      <p>
        Every order is backed by our{' '}
        <strong className="text-neutral-900 font-semibold">100% Quality & Satisfaction Guarantee</strong>.
        If there is any color defect, damage in transit, or missing item, simply contact
        our support team on WhatsApp (+91 96290 98565) within{' '}
        <strong className="text-neutral-900 font-semibold">48 hours of delivery</strong>.
        We will reprint and dispatch a replacement batch free of charge.
      </p>
    ),
  },
  {
    id: 'faq-8',
    question: 'Do you offer bulk wholesale pricing & GST tax invoices?',
    answer: (
      <p>
        <strong className="text-neutral-900 font-semibold">Yes!</strong> We provide
        tiered volume pricing for startups, corporate brands, agencies, and institutions.
        Every order includes an authorized B2B GST tax invoice with full input tax credit
        eligibility.
      </p>
    ),
  },
];

export function FAQSection() {
  // First item open by default like the reference image
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({
    'faq-1': true,
  });

  const toggleItem = (id: string) => {
    setOpenItems((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const renderFAQCard = (item: FAQItem) => {
    const isOpen = Boolean(openItems[item.id]);

    return (
      <div
        key={item.id}
        className={`bg-white rounded-2xl border transition-all duration-200 overflow-hidden ${
          isOpen
            ? 'border-neutral-300 shadow-sm ring-1 ring-[#FFED00]'
            : 'border-neutral-200/90 shadow-2xs hover:border-neutral-300'
        }`}
      >
        <button
          type="button"
          onClick={() => toggleItem(item.id)}
          aria-expanded={isOpen}
          className="w-full text-left p-5 sm:p-6 flex items-center justify-between gap-4 cursor-pointer focus:outline-none select-none group"
        >
          <span className="text-sm sm:text-[15px] font-bold text-neutral-900 leading-snug group-hover:text-black">
            {item.question}
          </span>
          <div
            className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center shrink-0 transition-all duration-200 ${
              isOpen
                ? 'bg-[#FFED00] text-black shadow-2xs'
                : 'bg-neutral-100 text-neutral-600 group-hover:bg-neutral-200/80 group-hover:text-black'
            }`}
          >
            <ChevronDown
              className={`w-4 h-4 stroke-[2.5] transition-transform duration-200 ${
                isOpen ? 'rotate-180' : 'rotate-0'
              }`}
            />
          </div>
        </button>

        {isOpen && (
          <div className="px-5 pb-5 sm:px-6 sm:pb-6 pt-0 text-xs sm:text-[13px] text-neutral-600 font-normal leading-relaxed font-sans border-t border-neutral-100 mt-0 pt-3.5 animate-in fade-in duration-200">
            {item.answer}
          </div>
        )}
      </div>
    );
  };

  return (
    <section
      aria-label="Frequently Asked Questions"
      className="bg-[#FAFAFA] py-14 sm:py-18 lg:py-22 border-b border-neutral-200/70 w-full max-w-full overflow-hidden"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header: Left Title & Description, Right Action Buttons */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5 sm:gap-6 mb-8 sm:mb-10">
          <div className="max-w-2xl">
            {/* Tag / Kicker with yellow dot */}
            <div className="inline-flex items-center gap-2 mb-2">
              <span className="w-2 h-2 rounded-full bg-[#FFED00] border border-black/30" />
              <span className="text-[11px] font-mono font-bold tracking-wider uppercase text-neutral-800">
                FAQ
              </span>
            </div>

            <h2 className="text-2xl sm:text-3xl lg:text-[34px] font-bold text-neutral-900 tracking-tight font-sans leading-tight">
              Everything You Need to Know
            </h2>

            <p className="text-xs sm:text-sm text-neutral-600 font-normal mt-2 leading-relaxed font-sans">
              Find quick answers about ordering, customisation, design approval,
              pricing, shipping, delivery and more.
            </p>
          </div>

          {/* Right Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 shrink-0">
            <Link
              href="/products"
              className="inline-flex items-center gap-1.5 px-4 sm:px-5 py-2.5 rounded-xl bg-[#FFED00] hover:bg-[#F2E100] text-black font-bold text-xs sm:text-[13px] transition-all duration-150 shadow-xs hover:shadow active:scale-98 border border-neutral-300/80"
            >
              <span>Shop Now</span>
              <ArrowRight className="w-4 h-4 stroke-[2.2]" />
            </Link>

            <a
              href="https://wa.me/+919629098565?text=Hi%20Print%20Bazzar%2C%20I%20have%20a%20question%20about%20custom%20printing."
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 sm:px-5 py-2.5 rounded-xl bg-white hover:bg-neutral-50 text-neutral-900 font-bold text-xs sm:text-[13px] transition-all duration-150 shadow-2xs hover:shadow-xs active:scale-98 border border-neutral-300"
            >
              <MessageCircle className="w-4 h-4 text-emerald-600 stroke-[2.2]" />
              <span>Ask on WhatsApp</span>
            </a>
          </div>
        </div>

        {/* 2-Column Responsive FAQ Accordion Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 items-start">
          <div className="space-y-4 sm:space-y-5">
            {FAQS_LEFT.map((faq) => renderFAQCard(faq))}
          </div>

          <div className="space-y-4 sm:space-y-5">
            {FAQS_RIGHT.map((faq) => renderFAQCard(faq))}
          </div>
        </div>

        {/* Bottom Helper Bar */}
        <div className="mt-8 sm:mt-10 p-4 sm:p-5 rounded-2xl bg-white border border-neutral-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#FFED00]/20 flex items-center justify-center shrink-0">
              <HelpCircle className="w-5 h-5 text-neutral-800 stroke-[2]" />
            </div>
            <div>
              <p className="text-xs sm:text-sm font-bold text-neutral-900">
                Still have questions or need custom artwork help?
              </p>
              <p className="text-[11px] sm:text-xs text-neutral-500 mt-0.5">
                Our print specialists in Trichy are available Mon–Sat (10:00 AM – 8:00 PM).
              </p>
            </div>
          </div>

          <a
            href="https://wa.me/+919629098565"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-bold text-black hover:underline flex items-center gap-1 whitespace-nowrap"
          >
            Chat with Design Support ➔
          </a>
        </div>
      </div>
    </section>
  );
}

