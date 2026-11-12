import { HeroSection } from '@/components/home/HeroSection';
import { CategoryShowcase } from '@/components/home/CategoryShowcase';
import { FeaturedProducts } from '@/components/home/FeaturedProducts';
import { BestSellers } from '@/components/home/BestSellers';
import { TrustFeaturesBar } from '@/components/home/TrustFeaturesBar';
import { CustomerReviews } from '@/components/home/CustomerReviews';
import { FAQSection } from '@/components/home/FAQSection';
import { api } from '@/lib/api';
import { DEFAULT_SITE_SETTINGS, SiteSettings } from '@/lib/site-settings';

async function getInitialSettings(): Promise<SiteSettings> {
  try {
    const remote = await api.getSiteSettings();
    if (remote && typeof remote === 'object') {
      return {
        ...DEFAULT_SITE_SETTINGS,
        ...remote,
        heroImages:
          Array.isArray(remote.heroImages) && remote.heroImages.length > 0
            ? remote.heroImages
            : DEFAULT_SITE_SETTINGS.heroImages,
        marqueeItems:
          Array.isArray(remote.marqueeItems)
            ? remote.marqueeItems
            : DEFAULT_SITE_SETTINGS.marqueeItems,
      };
    }
  } catch {
    // Keep defaults if backend call fails
  }
  return DEFAULT_SITE_SETTINGS;
}

export default async function HomePage() {
  const initialSettings = await getInitialSettings();

  return (
    <div className="flex flex-col bg-white w-full max-w-full overflow-x-clip">
      {/* 1. Hero Section (Preloaded with server-side settings to prevent layout shift) */}
      <HeroSection initialSettings={initialSettings} />

      {/* 2. Value Proposition / Trust Features Bar (Immediately below Hero Section) */}
      <TrustFeaturesBar />

      {/* 3. Shop by Category (Horizontal Scrollable, 8 in a row) */}
      <CategoryShowcase />

      {/* 4. Trending Products */}
      <FeaturedProducts />

      {/* 5. Best Sellers */}
      <BestSellers />

      {/* 6. Customer Reviews (Google Reviews Carousel - Auto-scroll 5s) */}
      <CustomerReviews />

      {/* 7. Frequently Asked Questions (FAQ Section) */}
      <FAQSection />
    </div>
  );
}
