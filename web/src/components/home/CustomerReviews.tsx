'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Star, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';

export const GOOGLE_REVIEW_URL = 'https://share.google/Q9iRiKvrUqlJVR0Wj';

// Real Google Reviews from Print Bazzar's verified Google Business listing
export const GOOGLE_REVIEWS = [
  {
    id: 'rev-1',
    name: 'Bharathan Yogi',
    role: 'Local Business Client',
    rating: 5,
    avatar: '/images/reviews/google/bharathan-yogi.jpg',
    fallbackAvatar:
      'https://lh3.googleusercontent.com/a-/ALV-UjU6lF7ZHuPLUlSw5RSeoD4DHAQSnRk1Iw-NFx5G3Bl7p9uM-XQ=w120-h120-p-rp-mo-ba2-br100',
    comment:
      'Awesome experience with Print Bazzar. Their printing solutions are not only budget friendly but also impressively crafted. The team’s professionalism and quick turnaround time impressed me. Trichy’s best printing choice! Mr. Rajak was so kind in his services.',
    relativeTime: 'Google Review',
  },
  {
    id: 'rev-2',
    name: 'DEV’S NATURALS',
    role: 'Brand & Packaging Order',
    rating: 5,
    avatar: '/images/reviews/google/devs-naturals.jpg',
    fallbackAvatar:
      'https://lh3.googleusercontent.com/a-/ALV-UjWx65SfHK9IS0ANKlP0NzyXMmkw3RtV7Al_8t6kEagdYfY-hh5i=w120-h120-p-rp-mo-br100',
    comment:
      'Awesome experience with Print Bazzar. Their printing solutions are not only budget friendly but also impressively crafted. The team’s professionalism and quick turnaround time impressed me. Truly reliable printing partner.',
    relativeTime: 'Google Review',
  },
  {
    id: 'rev-3',
    name: 'Ijaz Ahamed',
    role: 'Branding & Logo Design',
    rating: 5,
    avatar: '/images/reviews/google/ijaz-ahamed.jpg',
    fallbackAvatar:
      'https://lh3.googleusercontent.com/a-/ALV-UjXJkcUQ0ha4siIqLB3ZvGVl3kZK7F5EcRQ2u5AHegbCx5-b3SHL=w120-h120-p-rp-mo-br100',
    comment:
      'Great designs are done here! They finished my logo work and shop stickering very perfect. Don’t hesitate to go, this is the best shop for all kind of designing and printing needs.',
    relativeTime: 'Google Review',
  },
  {
    id: 'rev-4',
    name: 'Honeytha N',
    role: 'Custom Print Customer',
    rating: 5,
    avatar: '/images/reviews/google/honeytha-n.jpg',
    fallbackAvatar:
      'https://lh3.googleusercontent.com/a-/ALV-UjVrmegZjk2w8nywH8KgdDAEitEwZ4QekGH4mExAZF4ovRGD1nA=w120-h120-p-rp-mo-br100',
    comment:
      'Excellent service! The team patiently did everything we asked for, delivered right on time, and the pricing was super affordable too. Totally worth it!',
    relativeTime: 'Google Review',
  },
  {
    id: 'rev-5',
    name: 'Jeny Leon Lopez (Jen)',
    role: 'Conference Business Cards',
    rating: 5,
    avatar: '/images/reviews/google/jeny-leon-lopez.jpg',
    fallbackAvatar:
      'https://lh3.googleusercontent.com/a-/ALV-UjXXxyZWAD182F-OT-qS9kRvWHZqY5JdiAxx_nSjx_PDdo5TERQ=w120-h120-p-rp-mo-ba3-br100',
    comment:
      'I came from Bangalore to attend an international conference and had to print my business cards in a hurry. I approached Rajak of Print Bazzar at night and he got it printed and delivered directly to my venue. Thank you!',
    relativeTime: 'Google Review',
  },
  {
    id: 'rev-6',
    name: 'Subhanandh Ramasamy',
    role: 'Custom Marketing Collateral',
    rating: 5,
    avatar: '/images/reviews/google/bharathan-yogi.jpg',
    fallbackAvatar:
      'https://lh3.googleusercontent.com/a/default-user=w120-h120',
    comment:
      'Best experience! On or before time delivery. Harris was super helpful in finalizing the design and giving suggestions. Promised 7 days for delivery but got it in 3 days. Super flexible in design!',
    relativeTime: 'Google Review',
  },
  {
    id: 'rev-7',
    name: 'Mohamed Iqsaan',
    role: 'Creative Editing & Print',
    rating: 5,
    avatar: '/images/reviews/google/mohamed-iqsaan.jpg',
    fallbackAvatar:
      'https://lh3.googleusercontent.com/a-/ALV-UjU77kL8ezjC_w6eqii1l1kZtb3GH1_tBuwrCyqOMKdNn4_guOnW=w120-h120-p-rp-mo-br100',
    comment:
      'Versatility in design, the quality of their editing is top-notch with great attention to detail and clear understanding of what I needed. Reliable in completing the work in the given time.',
    relativeTime: 'Google Review',
  },
  {
    id: 'rev-8',
    name: 'M. Nather Basha',
    role: 'Custom Photo Frames',
    rating: 5,
    avatar: '/images/reviews/google/m-nather-basha.jpg',
    fallbackAvatar:
      'https://lh3.googleusercontent.com/a-/ALV-UjUlal0X7hsYdu8_cpcg6eVY3MLvncuSzZ46YkgpnT_mucAKri84wQ=w120-h120-p-rp-mo-br100',
    comment:
      'Recently ordered photo frames in Print Bazzar, they delivered super fast with ultimate service. Fully satisfied with the output and creative design finishing.',
    relativeTime: 'Google Review',
  },
  {
    id: 'rev-9',
    name: 'Gowri Shankar',
    role: 'Corporate Print & Design',
    rating: 5,
    avatar: '/images/reviews/google/gowri-shankar.jpg',
    fallbackAvatar:
      'https://lh3.googleusercontent.com/a-/ALV-UjXZajqxH1ZHZButrLav29JyxgVOkJLsX7pcyr9aF43zmw3ObUjo5A=w120-h120-p-rp-mo-br100',
    comment:
      'Nice designing work and fast service. You can blindly explain your concept and the designing team will understand and design accordingly.',
    relativeTime: 'Google Review',
  },
  {
    id: 'rev-10',
    name: 'Suji’s Life Style',
    role: 'Express Delivery Client',
    rating: 5,
    avatar: '/images/reviews/google/sujis-lifestyle.jpg',
    fallbackAvatar:
      'https://lh3.googleusercontent.com/a-/ALV-UjV7WkJ3ZwkzGK2LbQDXR9jQZSiT9G2LGvGz-H_WE46Cn4WgCbwgWQ=w120-h120-p-rp-mo-br100',
    comment:
      'Print Bazzar, no words to explain their service! I had an amazing experience and super fast delivery for all our customized printed items.',
    relativeTime: 'Google Review',
  },
  {
    id: 'rev-11',
    name: 'Monisha Raja',
    role: 'Branding & Creatives',
    rating: 5,
    avatar: '/images/reviews/google/monisha-raja.jpg',
    fallbackAvatar:
      'https://lh3.googleusercontent.com/a-/ALV-UjX-qAGfN2v0s-5YvttU2N8tIbnG_rKEsoyGnrSykH91PhzsIMgf=w120-h120-p-rp-mo-br100',
    comment:
      'Congratulations on your remarkable work! Your dedication and perseverance have truly paid off. Ur creativity and designing ideas are awesome. All the best!',
    relativeTime: 'Google Review',
  },
  {
    id: 'rev-12',
    name: 'Aoushaf Ahamed',
    role: 'Event & Project Printing',
    rating: 5,
    avatar: '/images/reviews/google/aoushaf-ahamed.jpg',
    fallbackAvatar:
      'https://lh3.googleusercontent.com/a-/ALV-UjWnrUZzKFN14glPs03J4o_hrJun_R1BcqI0cHJv42sPlpgk9t0F=w120-h120-p-rp-mo-br100',
    comment:
      'I recently had the pleasure of working with Print Bazzar for a project. Extremely satisfied with the good quality of work and will return for another event works.',
    relativeTime: 'Google Review',
  },
];

export function CustomerReviews() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-advance every 5 seconds (5000ms), pausing on hover or touch
  useEffect(() => {
    if (isPaused) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % GOOGLE_REVIEWS.length);
    }, 5000);

    return () => clearInterval(timer);
  }, [isPaused]);

  // Center the active card in the scroll view
  useEffect(() => {
    if (scrollRef.current) {
      const container = scrollRef.current;
      const card = container.children[currentIndex] as HTMLElement | undefined;
      if (card) {
        const scrollLeft =
          card.offsetLeft - (container.clientWidth - card.clientWidth) / 2;
        container.scrollTo({
          left: Math.max(0, scrollLeft),
          behavior: 'smooth',
        });
      }
    }
  }, [currentIndex]);

  const handlePrev = useCallback(() => {
    setCurrentIndex((prev) =>
      prev === 0 ? GOOGLE_REVIEWS.length - 1 : prev - 1
    );
  }, []);

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % GOOGLE_REVIEWS.length);
  }, []);

  return (
    <section
      aria-label="Google Customer Reviews"
      className="bg-white py-12 sm:py-16 lg:py-20 border-b border-neutral-200/70 w-full max-w-full overflow-hidden"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header: Title + Google Verified Rating badge on Left, 'View all reviews' on Right */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-7 sm:mb-9">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
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
                {/* Official 4-color Google G icon */}
                <svg
                  className="w-3.5 h-3.5 shrink-0"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
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
                <span>4.9 / 5.0 Rating</span>
              </a>
            </div>
            <p className="text-xs sm:text-sm text-neutral-500 font-medium mt-1 font-sans">
              Real Google reviews from verified customers in Trichy & pan-India.
            </p>
          </div>

          {/* View all Google reviews external link */}
          <a
            href={GOOGLE_REVIEW_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-neutral-700 hover:text-black transition-colors"
          >
            <span>View all Google reviews</span>
            <ExternalLink className="w-3.5 h-3.5 stroke-[2] transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </a>
        </div>

        {/* Carousel Container with Controls */}
        <div
          className="relative"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          onTouchStart={() => setIsPaused(true)}
          onTouchEnd={() => setIsPaused(false)}
        >
          {/* Navigation Button Left */}
          <button
            type="button"
            onClick={handlePrev}
            aria-label="Previous Google review"
            className="absolute -left-3 sm:-left-5 top-1/2 -translate-y-1/2 z-20 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white border border-neutral-200/90 shadow-sm hover:shadow-md hover:bg-neutral-50 flex items-center justify-center text-neutral-700 hover:text-black transition-all cursor-pointer active:scale-95"
          >
            <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.2]" />
          </button>

          {/* Navigation Button Right */}
          <button
            type="button"
            onClick={handleNext}
            aria-label="Next Google review"
            className="absolute -right-3 sm:-right-5 top-1/2 -translate-y-1/2 z-20 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white border border-neutral-200/90 shadow-sm hover:shadow-md hover:bg-neutral-50 flex items-center justify-center text-neutral-700 hover:text-black transition-all cursor-pointer active:scale-95"
          >
            <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.2]" />
          </button>

          {/* Reviews Track: 3 cards desktop, 2 cards tablet, 1 card mobile */}
          <div
            ref={scrollRef}
            className="flex items-stretch gap-4 sm:gap-5 overflow-x-auto scrollbar-none scroll-smooth pb-3 pt-1 touch-pan-x px-1"
            style={{
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
            }}
          >
            {GOOGLE_REVIEWS.map((review, idx) => {
              const isActive = idx === currentIndex;
              return (
                <div
                  key={review.id}
                  onClick={() => setCurrentIndex(idx)}
                  className={`shrink-0 w-[290px] sm:w-[340px] lg:w-[calc((100%-2*20px)/3)] bg-white rounded-2xl border transition-all duration-300 p-5 sm:p-6 flex flex-col justify-between cursor-pointer ${
                    isActive
                      ? 'border-neutral-400 shadow-md ring-1 ring-[#FFED00]'
                      : 'border-neutral-200/80 shadow-2xs hover:border-neutral-300 hover:shadow-sm'
                  }`}
                >
                  <div>
                    {/* Reviewer Header: Avatar + Name + 5 Stars */}
                    <div className="flex items-center gap-3 sm:gap-3.5">
                      <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full overflow-hidden bg-neutral-100 border border-neutral-200/80 shrink-0">
                        <img
                          src={review.avatar}
                          alt={review.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              review.fallbackAvatar;
                          }}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-sm sm:text-[15px] font-bold text-neutral-900 font-sans tracking-tight truncate">
                          {review.name}
                        </h4>
                        {/* 5 Stars in Yellow */}
                        <div className="flex items-center gap-0.5 mt-0.5">
                          {[...Array(review.rating)].map((_, i) => (
                            <Star
                              key={i}
                              className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-[#FACC15] text-[#FACC15]"
                            />
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Review Quote text */}
                    <p className="text-xs sm:text-[13px] text-neutral-600 font-normal leading-relaxed font-sans mt-3.5 sm:mt-4 italic line-clamp-4">
                      &ldquo;{review.comment}&rdquo;
                    </p>
                  </div>

                  {/* Footer note: Google Verified + Link directly to Google Business Profile */}
                  <div className="flex items-center justify-between text-[11px] text-neutral-400 mt-4 pt-3 border-t border-neutral-100 font-sans">
                    <span className="flex items-center gap-1 font-medium text-neutral-600">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Google Verified
                    </span>
                    <a
                      href={GOOGLE_REVIEW_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-neutral-500 hover:text-black font-semibold inline-flex items-center gap-1 transition-colors"
                      title="Open Print Bazzar on Google"
                    >
                      <span>Google Review</span>
                      <ExternalLink className="w-3 h-3 stroke-[2]" />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination Indicators (Active Yellow Pill + Inactive Gray Dots) */}
          <div className="flex items-center justify-center gap-1.5 mt-6">
            {GOOGLE_REVIEWS.map((_, dotIdx) => (
              <button
                key={dotIdx}
                type="button"
                onClick={() => setCurrentIndex(dotIdx)}
                aria-label={`Go to review ${dotIdx + 1}`}
                className={`transition-all duration-300 rounded-full cursor-pointer ${
                  dotIdx === currentIndex
                    ? 'w-6 h-2 bg-[#FFED00]'
                    : 'w-2 h-2 bg-neutral-200 hover:bg-neutral-300'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
