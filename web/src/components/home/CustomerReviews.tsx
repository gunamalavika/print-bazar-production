'use client';

import React, { useState } from 'react';
import { Star, ExternalLink } from 'lucide-react';

export const GOOGLE_REVIEW_URL = 'https://share.google/Kl0mPEUMSCXz8MDZF';

// Official 4-color Google G icon
function GoogleGIcon({ className = 'w-3.5 h-3.5' }: { className?: string }) {
  return (
    <svg className={`${className} shrink-0`} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.14-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98Z"
      />
    </svg>
  );
}

// Elegant quotation mark icon
function QuoteIcon({ className = 'w-5 h-5 text-neutral-200' }: { className?: string }) {
  return (
    <svg className={`${className} fill-current shrink-0`} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
    </svg>
  );
}

// Authentic Google Reviews from Print Bazzar's verified Google Business listing
export const GOOGLE_REVIEWS = [
  {
    id: 'rev-kavi',
    name: 'Kavi Raj',
    initials: 'KR',
    color: 'bg-[#0E7490]', // deep cyan / teal
    rating: 5,
    comment:
      'Very professional and quality-focused printing service. I worked with them for printing multiple film pitch decks and the output was outstanding. The color accuracy and paper texture were spot on.',
  },
  {
    id: 'rev-edward',
    name: 'Edward Joseph',
    initials: 'EJ',
    color: 'bg-[#047857]', // emerald green
    rating: 5,
    comment:
      'We recently used a new fabric printing technology for our exhibition display, and the results were truly impressive. The colors were vibrant and sharp. Highly satisfied with their team!',
  },
  {
    id: 'rev-romuald',
    name: 'Romuald Belwin',
    initials: 'RB',
    color: 'bg-[#2563EB]', // royal blue
    rating: 5,
    comment:
      'Had a very great experience collaborating with Print Bazzar. Quick turnaround, professional staff, and excellent output quality. Best printing partner for corporate and brand needs.',
  },
  {
    id: 'rev-tejaswini',
    name: 'Tejaswini',
    initials: 'T',
    color: 'bg-[#D97706]', // amber orange
    rating: 5,
    comment:
      'Lightning fast delivery! Affordable stickers with top-notch quality. I was really impressed by how accurately the colors and fine details were printed. Will definitely order again!',
  },
  {
    id: 'rev-sana',
    name: 'Sana SC',
    initials: 'SC',
    color: 'bg-[#E11D48]', // coral red
    rating: 5,
    comment:
      'I recently got marketing collateral printed with this company, and I am extremely happy with the results. Quality finishes, crisp borders, and on-time delivery.',
  },
  {
    id: 'rev-bharathan',
    name: 'Bharathan Yogi',
    initials: 'BY',
    color: 'bg-[#7C3AED]', // violet
    rating: 5,
    comment:
      'Awesome experience with Print Bazzar. Their printing solutions are not only budget friendly but also impressively crafted. The team’s professionalism and quick turnaround time impressed me. Trichy’s best printing choice!',
  },
  {
    id: 'rev-devs',
    name: 'DEV’S NATURALS',
    initials: 'DN',
    color: 'bg-[#059669]', // forest green
    rating: 5,
    comment:
      'Awesome experience with Print Bazzar. Their packaging solutions and product labels are budget friendly and impressively crafted. Truly reliable printing partner for our brand.',
  },
  {
    id: 'rev-ijaz',
    name: 'Ijaz Ahamed',
    initials: 'IA',
    color: 'bg-[#0284C7]', // sky blue
    rating: 5,
    comment:
      'Great designs are done here! They finished my logo work and shop stickering very perfect. Don’t hesitate to go, this is the best shop for all kind of designing and printing needs.',
  },
  {
    id: 'rev-honeytha',
    name: 'Honeytha N',
    initials: 'HN',
    color: 'bg-[#DB2777]', // pink
    rating: 5,
    comment:
      'Excellent service! The team patiently did everything we asked for, delivered right on time, and the pricing was super affordable too. Totally worth it!',
  },
  {
    id: 'rev-jeny',
    name: 'Jeny Leon Lopez',
    initials: 'JL',
    color: 'bg-[#EA580C]', // deep orange
    rating: 5,
    comment:
      'I came from Bangalore to attend an international conference and had to print my business cards in a hurry. Print Bazzar got it printed and delivered directly to my venue. Thank you!',
  },
  {
    id: 'rev-subhanandh',
    name: 'Subhanandh Ramasamy',
    initials: 'SR',
    color: 'bg-[#0D9488]', // teal
    rating: 5,
    comment:
      'Best experience! On or before time delivery. The staff was super helpful in finalizing the design and giving suggestions. Promised 7 days for delivery but got it in 3 days.',
  },
  {
    id: 'rev-mohamed',
    name: 'Mohamed Iqsaan',
    initials: 'MI',
    color: 'bg-[#4338CA]', // indigo
    rating: 5,
    comment:
      'Versatility in design, the quality of their editing is top-notch with great attention to detail and clear understanding of what I needed. Reliable in completing the work in the given time.',
  },
];

export function CustomerReviews() {
  const [isPaused, setIsPaused] = useState(false);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  const toggleExpand = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setExpandedCard((prev) => (prev === id ? null : id));
  };

  // Duplicate reviews array for seamless infinite marquee loop
  const marqueeReviews = [...GOOGLE_REVIEWS, ...GOOGLE_REVIEWS];

  return (
    <section
      aria-label="Google Customer Reviews"
      className="bg-white py-12 sm:py-16 lg:py-20 border-b border-neutral-200/70 w-full max-w-full overflow-hidden"
    >
      {/* Strictly Boxed Container (max-w-7xl, not full width) */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header: Title + Google Verified Rating badge on Left, 'View all reviews' on Right */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 sm:gap-4 mb-6 sm:mb-8">
          <div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
              <h2 className="text-xl sm:text-2xl lg:text-[26px] font-bold text-neutral-900 tracking-tight font-sans">
                What Our Customers Say
              </h2>
              {/* Official Google Rating Pill */}
              <a
                href={GOOGLE_REVIEW_URL}
                target="_blank"
                rel="noopener noreferrer"
                title="View verified 4.9/5.0 reviews for Print Bazzar on Google"
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-neutral-100 hover:bg-neutral-200/90 text-[11px] font-semibold text-neutral-800 transition-colors cursor-pointer border border-neutral-200/60"
              >
                <GoogleGIcon className="w-3.5 h-3.5" />
                <span>4.9 / 5.0 Rating</span>
              </a>
            </div>
            <p className="text-xs sm:text-sm text-neutral-500 font-medium mt-1 font-sans">
              Real people. Real experiences. Verified on Google.
            </p>
          </div>

          {/* View all Google reviews external link */}
          <a
            href={GOOGLE_REVIEW_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-neutral-700 hover:text-black transition-colors self-start sm:self-auto"
          >
            <span>View all reviews</span>
            <ExternalLink className="w-3.5 h-3.5 stroke-[2] transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </a>
        </div>

        {/* Boxed Marquee Track: 1 full review on Mobile, auto-marquee, pauses on hover / touch */}
        <div
          className="w-full overflow-hidden relative group-marquee py-2 rounded-2xl"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          onTouchStart={() => setIsPaused(true)}
          onTouchEnd={() => setIsPaused(false)}
        >
          {/* Subtle Fade Edges for the Boxed Track */}
          <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-6 sm:w-12 bg-gradient-to-r from-white to-transparent z-10 hidden sm:block" />
          <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-6 sm:w-12 bg-gradient-to-l from-white to-transparent z-10 hidden sm:block" />

          <div
            className="flex gap-3 sm:gap-4 lg:gap-5 animate-reviews-marquee w-max"
            style={{
              animationPlayState: isPaused || expandedCard !== null ? 'paused' : 'running',
            }}
          >
            {marqueeReviews.map((review, idx) => {
              const isExpanded = expandedCard === `${review.id}-${idx}`;

              return (
                <div
                  key={`${review.id}-${idx}`}
                  className="shrink-0 w-[calc(100vw-32px)] min-w-[calc(100vw-32px)] max-w-[calc(100vw-32px)] sm:w-[320px] sm:min-w-[320px] sm:max-w-[320px] lg:w-[360px] lg:min-w-[360px] lg:max-w-[360px] bg-white rounded-2xl border border-neutral-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.04)] hover:shadow-md hover:border-neutral-300 transition-all duration-300 p-4 sm:p-5 lg:p-6 flex flex-col justify-between select-none"
                >
                  <div>
                    {/* Card Header: Initials Avatar + Reviewer Name + Google Review Subtitle + Top-Right Quote Icon */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                        {/* Initials Avatar */}
                        <div
                          className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-bold text-white text-xs sm:text-sm shrink-0 shadow-2xs ${review.color}`}
                        >
                          {review.initials}
                        </div>

                        <div className="min-w-0 flex-1">
                          <h4 className="text-sm sm:text-[14.5px] lg:text-[15px] font-bold text-neutral-900 font-sans tracking-tight truncate leading-tight">
                            {review.name}
                          </h4>
                          <div className="flex items-center gap-1 mt-0.5">
                            <GoogleGIcon className="w-3 h-3" />
                            <span className="text-[10.5px] sm:text-[11.5px] text-neutral-400 font-sans truncate">
                              Google Review
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Subtle Quotation Mark Icon */}
                      <QuoteIcon className="w-5 h-5 text-neutral-200" />
                    </div>

                    {/* 5 Yellow Stars */}
                    <div className="flex items-center gap-0.5 mt-3 mb-2">
                      {[...Array(review.rating)].map((_, i) => (
                        <Star
                          key={i}
                          className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-[#FBBC04] text-[#FBBC04]"
                        />
                      ))}
                    </div>

                    {/* Review Comment Text */}
                    <p
                      className={`text-neutral-600 text-xs sm:text-[13px] lg:text-[13.5px] leading-relaxed font-sans ${
                        isExpanded ? '' : 'line-clamp-3 sm:line-clamp-4'
                      }`}
                    >
                      {review.comment}
                    </p>

                    {/* "Read more" trigger */}
                    {review.comment.length > 90 && (
                      <button
                        type="button"
                        onClick={(e) => toggleExpand(`${review.id}-${idx}`, e)}
                        className="text-[#1A73E8] hover:underline text-[11px] sm:text-xs font-semibold mt-1 inline-block cursor-pointer"
                      >
                        {isExpanded ? 'Read less ▲' : 'Read more ▼'}
                      </button>
                    )}
                  </div>

                  {/* Card Footer: Official Google G icon + "Posted on Google" link */}
                  <a
                    href={GOOGLE_REVIEW_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-[11px] sm:text-[12px] text-neutral-400 hover:text-neutral-700 font-medium font-sans mt-3.5 pt-2.5 border-t border-neutral-100 transition-colors w-fit"
                    title="Open Print Bazzar on Google Reviews"
                  >
                    <GoogleGIcon className="w-3.5 h-3.5" />
                    <span>Posted on Google</span>
                  </a>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
