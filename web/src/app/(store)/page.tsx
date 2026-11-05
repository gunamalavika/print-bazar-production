import { HeroSection } from '@/components/home/HeroSection';
import { CategoryShowcase } from '@/components/home/CategoryShowcase';
import { FeaturedProducts } from '@/components/home/FeaturedProducts';
import { CustomTshirtBanner } from '@/components/home/CustomTshirtBanner';
import { BestSellers } from '@/components/home/BestSellers';
import { TrustFeaturesBar } from '@/components/home/TrustFeaturesBar';
import { CustomerReviews } from '@/components/home/CustomerReviews';
import { FAQSection } from '@/components/home/FAQSection';

export default function HomePage() {
  return (
    <div className="flex flex-col bg-white w-full max-w-full overflow-x-clip">
      {/* 1. Hero Section */}
      <HeroSection />

      {/* 2. Shop by Category (Horizontal Scrollable, 8 in a row) */}
      <CategoryShowcase />

      {/* 3. Trending Products */}
      <FeaturedProducts />

      {/* 4. Custom T-Shirts Special Offer Banner (Exactly below Trending Products) */}
      <CustomTshirtBanner />

      {/* 5. Best Sellers */}
      <BestSellers />

      {/* 6. Trust / Value Proposition Features Bar (Exactly below Best Sellers) */}
      <TrustFeaturesBar />

      {/* 7. Customer Reviews (Google Reviews Carousel - Auto-scroll 5s) */}
      <CustomerReviews />

      {/* 8. Frequently Asked Questions (FAQ Section) */}
      <FAQSection />
    </div>
  );
}
