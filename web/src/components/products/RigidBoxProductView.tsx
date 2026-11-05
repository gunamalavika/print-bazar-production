'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  RiShoppingCart2Line,
  RiUploadCloud2Line,
  RiCustomerService2Line,
  RiCheckLine,
  RiCheckboxCircleLine,
  RiInformationLine,
  RiShieldCheckLine,
  RiTruckLine,
  RiAwardLine,
  RiTimeLine,
  RiBox3Line,
  RiStarFill,
  RiArrowLeftSLine,
  RiArrowRightSLine,
  RiCloseLine,
  RiLoader4Line,
  RiFileTextLine,
  RiArrowRightLine,
  RiShoppingBag3Line,
  RiGiftLine,
  RiSparklingFill,
  RiPaletteLine,
  RiCompass3Line,
} from 'react-icons/ri';
import { api, DynamicProduct } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { CartDrawer, CartDrawerItem } from '@/components/cart/CartDrawer';
import { CustomerAuthModal } from '@/components/auth/CustomerAuthModal';
import { useAuth } from '@/lib/auth-context';

interface PresetDimension {
  id: string;
  name: string;
  length: number;
  width: number;
  height: number;
}

const PRESET_DIMENSIONS: PresetDimension[] = [
  { id: 'jewellery', name: 'Jewellery', length: 100, width: 100, height: 40 },
  { id: 'a5', name: 'A5 Presentation', length: 220, width: 160, height: 60 },
  { id: 'apparel', name: 'Apparel', length: 300, width: 220, height: 80 },
  { id: 'perfume', name: 'Perfume', length: 120, width: 120, height: 140 },
  { id: 'custom', name: 'Custom Size', length: 220, width: 160, height: 60 },
];

const BOX_STYLES = [
  { id: 'lid_base', title: 'Lid & Base', subtitle: '(2-Piece)' },
  { id: 'neck_shoulder', title: 'Neck & Shoulder', subtitle: '(3-Piece)' },
  { id: 'book_style', title: 'Book-Style', subtitle: '(Magnetic Flap)' },
  { id: 'drawer', title: 'Slide-Out Drawer', subtitle: '(Matchbox)' },
];

const BOARD_THICKNESSES = [
  { id: '1000gsm', gsm: '1000 GSM', mm: '1.5 mm' },
  { id: '1200gsm', gsm: '1200 GSM', mm: '2.0 mm' },
  { id: '1500gsm', gsm: '1500 GSM', mm: '2.5 mm' },
  { id: '1800gsm', gsm: '1800 GSM', mm: '3.0 mm' },
];

const OUTER_WRAPS = [
  { id: 'coated_art', title: 'Coated Art Paper', subtitle: '(157 GSM)' },
  { id: 'wibalin_linen', title: 'Wibalin Linen', subtitle: '(Textured)' },
  { id: 'kraft_paper', title: 'Kraft Paper', subtitle: '(Natural)' },
  { id: 'pearl_metallic', title: 'Pearl Metallic', subtitle: '(Shimmer)' },
  { id: 'soft_touch', title: 'Soft Touch', subtitle: '(Luxury Matte)' },
];

const FINISHING_OPTIONS = [
  { id: 'none', title: 'None' },
  { id: 'hot_foil', title: 'Hot Foil Stamping' },
  { id: 'embossing', title: 'Embossing' },
  { id: 'debossing', title: 'Debossing' },
  { id: 'matte_lam', title: 'Matte Lamination' },
  { id: 'gloss_lam', title: 'Gloss Lamination' },
];

const INSERT_OPTIONS = [
  { id: 'none', title: 'None' },
  { id: 'foam', title: 'Foam Insert' },
  { id: 'velvet_foam', title: 'Velvet Foam' },
  { id: 'cardboard_divider', title: 'Cardboard Divider' },
  { id: 'custom_insert', title: 'Custom Insert' },
];

interface QuantityTier {
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

const QUANTITY_TIERS: QuantityTier[] = [
  { quantity: 50, unitPrice: 65.0, totalPrice: 3250 },
  { quantity: 100, unitPrice: 58.0, totalPrice: 5800 },
  { quantity: 250, unitPrice: 51.0, totalPrice: 12750 },
  { quantity: 500, unitPrice: 45.0, totalPrice: 22500 },
  { quantity: 1000, unitPrice: 40.0, totalPrice: 40000 },
];

const PRODUCT_IMAGES = [
  {
    url: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&w=1000&q=85',
    alt: 'Custom Luxury Rigid Box - Angled View with Gold Interior',
  },
  {
    url: 'https://images.unsplash.com/photo-1584824486509-112e4181ff6b?auto=format&fit=crop&w=1000&q=85',
    alt: 'Custom Rigid Box - Open Lid View with Gold Foil Monogram',
  },
  {
    url: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=1000&q=85',
    alt: 'Custom Rigid Box - Closed Box with Luxury Ribbon Accent',
  },
  {
    url: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=1000&q=85',
    alt: 'Custom Rigid Box - Matchbox Slide Out Drawer Style',
  },
  {
    url: 'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?auto=format&fit=crop&w=1000&q=85',
    alt: 'Custom Rigid Box - Hot Foil Stamped Logo Close-Up',
  },
];

interface RigidBoxProductViewProps {
  product: DynamicProduct;
}

export function RigidBoxProductView({ product }: RigidBoxProductViewProps) {
  const router = useRouter();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Gallery State
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [is3DModalOpen, setIs3DModalOpen] = useState(false);
  const [isDesignerModalOpen, setIsDesignerModalOpen] = useState(false);

  // Configuration State
  const [selectedBoxStyle, setSelectedBoxStyle] = useState('lid_base');
  const [length, setLength] = useState(220);
  const [width, setWidth] = useState(160);
  const [height, setHeight] = useState(60);
  const [selectedPreset, setSelectedPreset] = useState('a5');
  const [selectedThickness, setSelectedThickness] = useState('1000gsm');
  const [selectedOuterWrap, setSelectedOuterWrap] = useState('coated_art');
  const [selectedFinishing, setSelectedFinishing] = useState('none');
  const [selectedInsert, setSelectedInsert] = useState('none');
  const [selectedQuantity, setSelectedQuantity] = useState(50);

  // Artwork State
  const [uploadedArtwork, setUploadedArtwork] = useState<{
    fileUrl: string;
    originalFileName: string;
    fileSize: number;
    mimeType?: string;
    storageKey?: string;
  } | null>(null);
  const [isUploadingArtwork, setIsUploadingArtwork] = useState(false);
  const [artworkUploadError, setArtworkUploadError] = useState<string | null>(null);

  // Authoritative Pricing State
  const [serverUnitPrice, setServerUnitPrice] = useState<number>(65.0);
  const [serverSubtotal, setServerSubtotal] = useState<number>(3250.0);
  const [serverTax, setServerTax] = useState<number>(585.0);
  const [serverGrandTotal, setServerGrandTotal] = useState<number>(3835.0);
  const [isCalculatingPrice, setIsCalculatingPrice] = useState(false);

  // Cart Drawer State
  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState(false);
  const [activeCartItem, setActiveCartItem] = useState<CartDrawerItem | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Volume Calculation (Mathematical volume in mm³)
  const volume = useMemo(() => {
    return Math.max(0, length * width * height);
  }, [length, width, height]);

  // Recalculate price through authoritative backend service
  useEffect(() => {
    let isCancelled = false;

    async function fetchServerQuote() {
      setIsCalculatingPrice(true);
      try {
        const quote = await api.calculateQuote({
          productId: product.id || 'custom-rigid-box',
          quantity: selectedQuantity,
          fieldValues: {
            box_style: selectedBoxStyle,
            length_mm: length,
            width_mm: width,
            height_mm: height,
            board_thickness: selectedThickness,
            outer_wrap: selectedOuterWrap,
            finishing: selectedFinishing,
            insert: selectedInsert,
          },
        });

        if (!isCancelled) {
          const uPrice = quote.unitPrice ?? (quote.subtotal / selectedQuantity);
          const sTotal = quote.subtotal ?? (uPrice * selectedQuantity);
          const tax = quote.totalTax ?? Math.round(sTotal * 0.18 * 100) / 100;
          const gTotal = quote.grandTotal ?? (sTotal + tax);

          setServerUnitPrice(uPrice);
          setServerSubtotal(sTotal);
          setServerTax(tax);
          setServerGrandTotal(gTotal);
        }
      } catch (err) {
        // Fallback to exact tier rate matching approved specifications
        if (!isCancelled) {
          const tier = QUANTITY_TIERS.find((t) => t.quantity === selectedQuantity) || QUANTITY_TIERS[0];
          setServerUnitPrice(tier.unitPrice);
          setServerSubtotal(tier.totalPrice);
          setServerTax(Math.round(tier.totalPrice * 0.18 * 100) / 100);
          setServerGrandTotal(tier.totalPrice + Math.round(tier.totalPrice * 0.18 * 100) / 100);
        }
      } finally {
        if (!isCancelled) {
          setIsCalculatingPrice(false);
        }
      }
    }

    fetchServerQuote();

    return () => {
      isCancelled = true;
    };
  }, [
    product.id,
    selectedQuantity,
    selectedBoxStyle,
    length,
    width,
    height,
    selectedThickness,
    selectedOuterWrap,
    selectedFinishing,
    selectedInsert,
  ]);

  // Handle Preset Dimension Click
  const handleSelectPreset = (preset: PresetDimension) => {
    setSelectedPreset(preset.id);
    if (preset.id !== 'custom') {
      setLength(preset.length);
      setWidth(preset.width);
      setHeight(preset.height);
    }
  };

  const handleCustomDimensionChange = (type: 'L' | 'W' | 'H', val: number) => {
    setSelectedPreset('custom');
    if (type === 'L') setLength(val);
    if (type === 'W') setWidth(val);
    if (type === 'H') setHeight(val);
  };

  // Build the Authoritative Cart Item
  const buildCurrentCartItem = (): CartDrawerItem => {
    const boxStyleObj = BOX_STYLES.find((b) => b.id === selectedBoxStyle);
    const thicknessObj = BOARD_THICKNESSES.find((t) => t.id === selectedThickness);
    const wrapObj = OUTER_WRAPS.find((w) => w.id === selectedOuterWrap);
    const finishObj = FINISHING_OPTIONS.find((f) => f.id === selectedFinishing);
    const insertObj = INSERT_OPTIONS.find((i) => i.id === selectedInsert);

    const specificationsSnapshot: Record<string, any> = {
      boxStyle: `${boxStyleObj?.title || 'Lid & Base'} ${boxStyleObj?.subtitle || ''}`.trim(),
      length,
      width,
      height,
      dimensions: `${length} × ${width} × ${height} mm`,
      volumeMm3: volume,
      boardThickness: `${thicknessObj?.gsm || '1000 GSM'} (${thicknessObj?.mm || '1.5 mm'})`,
      outerWrap: `${wrapObj?.title || 'Coated Art Paper'} ${wrapObj?.subtitle || ''}`.trim(),
      finishing: finishObj?.title || 'None',
      insert: insertObj?.title || 'None',
      quantity: selectedQuantity,
    };

    return {
      productId: product.id,
      productName: product.name || 'Custom Luxury Rigid Box',
      sku: product.sku || 'PRD-PKG-002',
      quantity: selectedQuantity,
      unitPrice: serverUnitPrice,
      totalPrice: serverSubtotal,
      subtotal: serverSubtotal,
      taxAmount: serverTax,
      grandTotal: serverGrandTotal,
      specificationsSnapshot,
      selectedOptionsSummary: [
        { fieldLabel: 'Box Style', value: specificationsSnapshot.boxStyle },
        { fieldLabel: 'Dimensions', value: specificationsSnapshot.dimensions },
        { fieldLabel: 'Board Thickness', value: specificationsSnapshot.boardThickness },
        { fieldLabel: 'Outer Wrap', value: specificationsSnapshot.outerWrap },
        { fieldLabel: 'Finishing', value: specificationsSnapshot.finishing },
        { fieldLabel: 'Insert', value: specificationsSnapshot.insert },
      ],
      artworkConfig: {
        status: (product.artworkRequirement as any) || 'REQUIRED',
        allowedFormats: product.artworkFileFormats || ['PDF', 'AI', 'PSD', 'EPS', 'TIFF', 'PNG', 'JPG', 'ZIP'],
        maxFileSizeMb: product.maxArtworkFileSizeMb || 50,
        slots: [
          {
            slotKey: 'slot_1_rigid_box_dieline',
            label: 'Box Die-line & Artwork',
            isRequired: product.artworkRequirement !== 'OPTIONAL' && product.artworkRequirement !== 'DISABLED',
          },
        ],
      },
      artworkFile: uploadedArtwork,
      paymentMode: 'FULL',
    };
  };

  // Add to Cart — Opens Side Drawer (Does not redirect!)
  const handleAddToCart = () => {
    const item = buildCurrentCartItem();

    // Persist to local cart storage without duplicating line if already present
    try {
      const raw = localStorage.getItem('pb2_cart');
      let cart = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(cart)) cart = [];

      const existingIndex = cart.findIndex(
        (it: any) => it.sku === item.sku || it.productId === item.productId
      );
      if (existingIndex >= 0) {
        cart[existingIndex] = item;
      } else {
        cart.push(item);
      }
      localStorage.setItem('pb2_cart', JSON.stringify(cart));
      sessionStorage.setItem('pb2_active_cart', JSON.stringify(item));
      window.dispatchEvent(new Event('cart-updated'));
    } catch (e) {
      console.warn('Storage error on Add to Cart', e);
    }

    setActiveCartItem(item);
    setIsCartDrawerOpen(true);
  };

  // Artwork Upload Handler
  const handleDirectArtworkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 50 * 1024 * 1024) {
      setArtworkUploadError('File size exceeds 50 MB limit.');
      return;
    }

    setIsUploadingArtwork(true);
    setArtworkUploadError(null);

    try {
      const res = await api.uploadArtwork(file, product.id);
      const art = {
        fileUrl: res.fileUrl,
        originalFileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        storageKey: res.storageKey,
      };
      setUploadedArtwork(art);

      // If drawer is open, update drawer item
      if (activeCartItem) {
        const updated = { ...activeCartItem, artworkFile: art };
        setActiveCartItem(updated);
      }
    } catch (err: any) {
      setArtworkUploadError(err?.message || 'Upload failed. Please try again.');
    } finally {
      setIsUploadingArtwork(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* ======================================================== */}
      {/* BREADCRUMBS                                              */}
      {/* ======================================================== */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-4 pb-2">
        <nav className="flex items-center gap-1.5 text-xs text-slate-500 font-medium tracking-tight">
          <Link href="/" className="hover:text-black transition-colors">
            Home
          </Link>
          <span className="text-slate-400">&gt;</span>
          <Link href="/products" className="hover:text-black transition-colors">
            Products
          </Link>
          <span className="text-slate-400">&gt;</span>
          <Link href="/products?category=packaging" className="hover:text-black transition-colors">
            Custom Packaging
          </Link>
          <span className="text-slate-400">&gt;</span>
          <span className="text-slate-900 font-semibold truncate">
            Custom Luxury Rigid Box
          </span>
        </nav>
      </div>

      {/* ======================================================== */}
      {/* MAIN TWO-COLUMN LAYOUT                                   */}
      {/* ======================================================== */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          {/* ====================================================== */}
          {/* LEFT COLUMN: GALLERY & PRODUCT HIGHLIGHTS (~5 Cols)     */}
          {/* ====================================================== */}
          <div className="lg:col-span-5 space-y-8">
            {/* Main Product Showcase Box */}
            <div className="relative rounded-2xl overflow-hidden bg-[#EAE8E4] border border-slate-200/90 shadow-sm aspect-square flex items-center justify-center group">
              {/* Premium Quality Badge */}
              <div className="absolute top-4 left-4 z-10 bg-[#FFED00] text-black text-[11px] font-black uppercase tracking-wider px-3 py-1 rounded-md shadow-xs border border-amber-300">
                PREMIUM QUALITY
              </div>

              {/* Product Image */}
              <img
                src={PRODUCT_IMAGES[activeImageIdx].url}
                alt={PRODUCT_IMAGES[activeImageIdx].alt}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-102"
              />

              {/* Prev / Next Carousel Arrows */}
              <button
                type="button"
                onClick={() =>
                  setActiveImageIdx((prev) => (prev > 0 ? prev - 1 : PRODUCT_IMAGES.length - 1))
                }
                className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 hover:bg-white text-slate-800 flex items-center justify-center shadow-md transition-all cursor-pointer"
                aria-label="Previous image"
              >
                <RiArrowLeftSLine className="w-5 h-5" />
              </button>

              <button
                type="button"
                onClick={() =>
                  setActiveImageIdx((prev) => (prev < PRODUCT_IMAGES.length - 1 ? prev + 1 : 0))
                }
                className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 hover:bg-white text-slate-800 flex items-center justify-center shadow-md transition-all cursor-pointer"
                aria-label="Next image"
              >
                <RiArrowRightSLine className="w-5 h-5" />
              </button>

              {/* View 3D Button */}
              <button
                type="button"
                onClick={() => setIs3DModalOpen(true)}
                className="absolute bottom-4 right-4 z-10 bg-white/95 hover:bg-white text-slate-900 text-xs font-bold px-3.5 py-1.5 rounded-lg shadow-sm border border-slate-200 flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <RiBox3Line className="w-4 h-4 text-amber-500" />
                <span>View 3D</span>
              </button>
            </div>

            {/* 5 Thumbnails Row */}
            <div className="grid grid-cols-5 gap-3">
              {PRODUCT_IMAGES.map((img, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveImageIdx(idx)}
                  className={`rounded-xl overflow-hidden aspect-square border-2 transition-all cursor-pointer bg-slate-100 ${
                    activeImageIdx === idx
                      ? 'border-[#FFED00] shadow-sm scale-98'
                      : 'border-slate-200/80 hover:border-slate-400 opacity-80 hover:opacity-100'
                  }`}
                >
                  <img src={img.url} alt={img.alt} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>

            {/* Feature Highlights Block */}
            <div className="space-y-4 pt-2">
              <div>
                <h3 className="text-base font-bold text-slate-950 font-display">
                  Custom Packaging. Elevated.
                </h3>
                <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                  Luxury rigid boxes crafted for brands that value detail, quality and impact.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-1.5">
                  <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
                    <RiBox3Line className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs font-bold text-slate-900">Premium Materials</h4>
                  <p className="text-[11px] text-slate-500 leading-tight">
                    High-quality rigid greyboard & speciality papers
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-1.5">
                  <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
                    <RiPaletteLine className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs font-bold text-slate-900">Customisation</h4>
                  <p className="text-[11px] text-slate-500 leading-tight">
                    Multiple sizes, styles, finishes & add-ons
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-1.5">
                  <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
                    <RiTimeLine className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs font-bold text-slate-900">Fast Turnaround</h4>
                  <p className="text-[11px] text-slate-500 leading-tight">
                    5 working days production SLA
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-1.5">
                  <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
                    <RiCustomerService2Line className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs font-bold text-slate-900">Expert Support</h4>
                  <p className="text-[11px] text-slate-500 leading-tight">
                    Design & packaging consultation
                  </p>
                </div>
              </div>
            </div>

            {/* Need Help Designing Banner */}
            <div className="relative rounded-2xl p-6 bg-slate-50 border border-slate-200/90 overflow-hidden flex items-center justify-between">
              <div className="space-y-2 z-10 max-w-[65%]">
                <h3 className="text-sm font-black text-slate-950 font-display">
                  Need Help Designing?
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Our packaging experts are here to help you find the perfect solution for your brand.
                </p>
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => setIsDesignerModalOpen(true)}
                    className="inline-flex items-center gap-1 px-4 py-2 bg-[#FFED00] hover:bg-[#F2E100] text-black text-xs font-bold rounded-lg border border-amber-300 shadow-2xs transition-colors cursor-pointer"
                  >
                    <span>Contact Designer</span>
                    <RiArrowRightLine className="w-3.5 h-3.5 stroke-[2]" />
                  </button>
                </div>
              </div>

              {/* Decorative Right Image */}
              <div className="w-28 h-28 flex-shrink-0 relative opacity-95">
                <img
                  src="https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&w=300&q=80"
                  alt="Packaging Support"
                  className="w-full h-full object-cover rounded-xl shadow-xs"
                />
              </div>
            </div>

            {/* Product Highlights Section */}
            <div className="space-y-3 pt-2">
              <h3 className="text-sm font-bold text-slate-950 uppercase tracking-wider text-[11px]">
                Product Highlights
              </h3>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5 text-center">
                  <div className="rounded-xl overflow-hidden aspect-square border border-slate-200">
                    <img
                      src="https://images.unsplash.com/photo-1589829085413-56de8ae18c73?auto=format&fit=crop&w=400&q=80"
                      alt="Premium Branding"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <span className="text-[11px] font-bold text-slate-800 block">
                    Premium Branding
                  </span>
                </div>

                <div className="space-y-1.5 text-center">
                  <div className="rounded-xl overflow-hidden aspect-square border border-slate-200">
                    <img
                      src="https://images.unsplash.com/photo-1584824486509-112e4181ff6b?auto=format&fit=crop&w=400&q=80"
                      alt="Luxury Presentation"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <span className="text-[11px] font-bold text-slate-800 block">
                    Luxury Presentation
                  </span>
                </div>

                <div className="space-y-1.5 text-center">
                  <div className="rounded-xl overflow-hidden aspect-square border border-slate-200">
                    <img
                      src="https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=400&q=80"
                      alt="Perfect for Gifting"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <span className="text-[11px] font-bold text-slate-800 block">
                    Perfect for Gifting
                  </span>
                </div>
              </div>
            </div>

            {/* Ideal For Section */}
            <div className="space-y-3 pt-2">
              <h3 className="text-sm font-bold text-slate-950 uppercase tracking-wider text-[11px]">
                Ideal For
              </h3>
              <div className="grid grid-cols-5 gap-2 text-center">
                <div className="space-y-1 flex flex-col items-center">
                  <div className="w-10 h-10 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-700">
                    <RiShoppingBag3Line className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] text-slate-600 font-medium leading-tight">
                    Retail Packaging
                  </span>
                </div>

                <div className="space-y-1 flex flex-col items-center">
                  <div className="w-10 h-10 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-700">
                    <RiGiftLine className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] text-slate-600 font-medium leading-tight">
                    Gift Boxes
                  </span>
                </div>

                <div className="space-y-1 flex flex-col items-center">
                  <div className="w-10 h-10 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-700">
                    <RiSparklingFill className="w-4 h-4 text-amber-500" />
                  </div>
                  <span className="text-[10px] text-slate-600 font-medium leading-tight">
                    Premium Products
                  </span>
                </div>

                <div className="space-y-1 flex flex-col items-center">
                  <div className="w-10 h-10 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-700">
                    <RiAwardLine className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] text-slate-600 font-medium leading-tight">
                    Corporate Gifting
                  </span>
                </div>

                <div className="space-y-1 flex flex-col items-center">
                  <div className="w-10 h-10 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-700">
                    <RiBox3Line className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] text-slate-600 font-medium leading-tight">
                    Beauty & Cosmetics
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ====================================================== */}
          {/* RIGHT COLUMN: CONFIGURATION ENGINE (~7 Cols)           */}
          {/* ====================================================== */}
          <div className="lg:col-span-7 space-y-6">
            {/* Header Title & Badges */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="bg-[#FFED00] text-black text-[11px] font-black uppercase px-2.5 py-0.5 rounded-full border border-amber-300">
                  PACKAGING & BOXES
                </span>
                <span className="text-xs font-mono font-medium text-slate-400">
                  SKU: {product.sku || 'PRD-PKG-002'}
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight font-display">
                {product.name || 'Custom Luxury Rigid Box'}
              </h1>

              {/* Rating & Stock */}
              <div className="flex items-center gap-3 pt-0.5 text-xs">
                <div className="flex items-center gap-1 text-amber-500 font-semibold">
                  <div className="flex items-center">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <RiStarFill key={star} className="w-3.5 h-3.5 fill-amber-400" />
                    ))}
                  </div>
                  <span className="text-slate-800 ml-1 font-bold">4.8</span>
                  <span className="text-slate-400">(124 reviews)</span>
                </div>

                <span className="text-slate-300">•</span>

                <div className="flex items-center gap-1 text-emerald-700 font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>In Stock</span>
                </div>
              </div>

              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed pt-1">
                {product.description ||
                  'Premium custom rigid boxes for high-end packaging and presentation.'}
              </p>
            </div>

            {/* Checklist: 6 points in 2 columns */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-700 py-1">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <RiCheckLine className="w-4 h-4 text-amber-500 stroke-[2] flex-shrink-0" />
                  <span>157 GSM outer wrap & rigid greyboard core</span>
                </div>
                <div className="flex items-center gap-2">
                  <RiCheckLine className="w-4 h-4 text-amber-500 stroke-[2] flex-shrink-0" />
                  <span>Multiple box styles & sizes</span>
                </div>
                <div className="flex items-center gap-2">
                  <RiCheckLine className="w-4 h-4 text-amber-500 stroke-[2] flex-shrink-0" />
                  <span>Custom finishes: hot foil stamping, embossing, UV</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <RiCheckLine className="w-4 h-4 text-amber-500 stroke-[2] flex-shrink-0" />
                  <span>Velvet, foam & custom inserts</span>
                </div>
                <div className="flex items-center gap-2">
                  <RiCheckLine className="w-4 h-4 text-amber-500 stroke-[2] flex-shrink-0" />
                  <span>Low MOQ & bulk discounts</span>
                </div>
                <div className="flex items-center gap-2">
                  <RiCheckLine className="w-4 h-4 text-amber-500 stroke-[2] flex-shrink-0" />
                  <span>Design support from experts</span>
                </div>
              </div>
            </div>

            {/* 3 Metric Cards */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl text-center space-y-1">
                <RiTruckLine className="w-4 h-4 text-slate-700 mx-auto" />
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">
                  Production Time
                </span>
                <span className="text-xs font-bold text-slate-900 block">5 working days</span>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl text-center space-y-1">
                <RiBox3Line className="w-4 h-4 text-slate-700 mx-auto" />
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">MOQ</span>
                <span className="text-xs font-bold text-slate-900 block">50 units</span>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl text-center space-y-1">
                <RiCustomerService2Line className="w-4 h-4 text-slate-700 mx-auto" />
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">
                  Free Design Support
                </span>
                <span className="text-xs font-bold text-slate-900 block">Our team will help you</span>
              </div>
            </div>

            {/* 4-Step Indicator Bar */}
            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-[11px] font-medium overflow-x-auto no-scrollbar gap-2">
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <span className="w-5 h-5 rounded-full bg-[#FFED00] text-black font-bold flex items-center justify-center text-[10px] shadow-2xs">
                  1
                </span>
                <span className="font-bold text-slate-900">Specifications</span>
                <span className="text-slate-400 hidden sm:inline">: Define size & style</span>
              </div>

              <div className="flex items-center gap-1.5 flex-shrink-0 text-slate-500">
                <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-600 font-bold flex items-center justify-center text-[10px]">
                  2
                </span>
                <span>Material & Finish</span>
              </div>

              <div className="flex items-center gap-1.5 flex-shrink-0 text-slate-500">
                <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-600 font-bold flex items-center justify-center text-[10px]">
                  3
                </span>
                <span>Inserts & Extras</span>
              </div>

              <div className="flex items-center gap-1.5 flex-shrink-0 text-slate-500">
                <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-600 font-bold flex items-center justify-center text-[10px]">
                  4
                </span>
                <span>Quantity & Review</span>
              </div>
            </div>

            {/* ====================================================== */}
            {/* 1. BOX STYLE                                           */}
            {/* ====================================================== */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <span>1. Box Style</span>
                  <RiInformationLine className="w-3.5 h-3.5 text-slate-400" />
                </label>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {BOX_STYLES.map((style) => {
                  const isSelected = selectedBoxStyle === style.id;
                  return (
                    <button
                      key={style.id}
                      type="button"
                      onClick={() => setSelectedBoxStyle(style.id)}
                      className={`relative p-3 rounded-xl border text-center transition-all cursor-pointer ${
                        isSelected
                          ? 'border-2 border-[#FFED00] bg-amber-50/20 shadow-xs'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      {isSelected && (
                        <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-[#FFED00] text-black flex items-center justify-center">
                          <RiCheckLine className="w-3 h-3 stroke-[2.5]" />
                        </div>
                      )}
                      <span className="text-xs font-bold text-slate-900 block">
                        {style.title}
                      </span>
                      <span className="text-[11px] text-slate-500 block mt-0.5">
                        {style.subtitle}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ====================================================== */}
            {/* 2. DIMENSIONS (MM)                                     */}
            {/* ====================================================== */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <span>2. Dimensions (mm)</span>
                  <RiInformationLine className="w-3.5 h-3.5 text-slate-400" />
                </label>

                <div className="text-right">
                  <span className="text-xs font-mono font-bold text-slate-900">
                    Volume: {volume.toLocaleString()} mm³
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono block">
                    ({length} × {width} × {height})
                  </span>
                </div>
              </div>

              {/* 3 Numeric Input Boxes */}
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-500">Length (L)</span>
                  <input
                    type="number"
                    min="50"
                    max="600"
                    value={length}
                    onChange={(e) => handleCustomDimensionChange('L', parseInt(e.target.value) || 0)}
                    className="w-full h-9 px-3 text-xs font-mono bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
                  />
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-500">Width (W)</span>
                  <input
                    type="number"
                    min="50"
                    max="600"
                    value={width}
                    onChange={(e) => handleCustomDimensionChange('W', parseInt(e.target.value) || 0)}
                    className="w-full h-9 px-3 text-xs font-mono bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
                  />
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-500">Height (H)</span>
                  <input
                    type="number"
                    min="20"
                    max="300"
                    value={height}
                    onChange={(e) => handleCustomDimensionChange('H', parseInt(e.target.value) || 0)}
                    className="w-full h-9 px-3 text-xs font-mono bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
                  />
                </div>
              </div>

              {/* Dimension Preset Pills */}
              <div className="flex flex-wrap gap-2 pt-1">
                {PRESET_DIMENSIONS.map((preset) => {
                  const isSelected = selectedPreset === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleSelectPreset(preset)}
                      className={`px-3 py-1 text-xs rounded-lg transition-colors cursor-pointer font-medium ${
                        isSelected
                          ? 'bg-[#FFED00] text-black font-bold border border-amber-300 shadow-2xs'
                          : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
                      }`}
                    >
                      {preset.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ====================================================== */}
            {/* 3. BOARD THICKNESS                                     */}
            {/* ====================================================== */}
            <div className="space-y-2.5">
              <label className="text-xs font-bold text-slate-900 block">
                3. Board Thickness
              </label>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {BOARD_THICKNESSES.map((thick) => {
                  const isSelected = selectedThickness === thick.id;
                  return (
                    <button
                      key={thick.id}
                      type="button"
                      onClick={() => setSelectedThickness(thick.id)}
                      className={`relative p-3 rounded-xl border text-center transition-all cursor-pointer ${
                        isSelected
                          ? 'border-2 border-[#FFED00] bg-amber-50/20 shadow-xs'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      {isSelected && (
                        <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-[#FFED00] text-black flex items-center justify-center">
                          <RiCheckLine className="w-3 h-3 stroke-[2.5]" />
                        </div>
                      )}
                      <span className="text-xs font-bold text-slate-900 block">{thick.gsm}</span>
                      <span className="text-[11px] text-slate-500 block mt-0.5">{thick.mm}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ====================================================== */}
            {/* 4. OUTER WRAP MATERIAL                                 */}
            {/* ====================================================== */}
            <div className="space-y-2.5">
              <label className="text-xs font-bold text-slate-900 block">
                4. Outer Wrap Material
              </label>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {OUTER_WRAPS.map((wrap) => {
                  const isSelected = selectedOuterWrap === wrap.id;
                  return (
                    <button
                      key={wrap.id}
                      type="button"
                      onClick={() => setSelectedOuterWrap(wrap.id)}
                      className={`relative p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                        isSelected
                          ? 'border-2 border-[#FFED00] bg-amber-50/20 shadow-xs'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <span className="text-xs font-bold text-slate-900 block leading-tight">
                        {wrap.title}
                      </span>
                      <span className="text-[10px] text-slate-500 block mt-0.5">
                        {wrap.subtitle}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ====================================================== */}
            {/* 5. FINISHING OPTIONS                                   */}
            {/* ====================================================== */}
            <div className="space-y-2.5">
              <label className="text-xs font-bold text-slate-900 block">
                5. Finishing Options
              </label>

              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {FINISHING_OPTIONS.map((fin) => {
                  const isSelected = selectedFinishing === fin.id;
                  return (
                    <button
                      key={fin.id}
                      type="button"
                      onClick={() => setSelectedFinishing(fin.id)}
                      className={`relative py-2.5 px-2 rounded-xl border text-center transition-all cursor-pointer ${
                        isSelected
                          ? 'border-2 border-[#FFED00] bg-amber-50/20 shadow-xs'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      {isSelected && (
                        <div className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-[#FFED00] text-black flex items-center justify-center">
                          <RiCheckLine className="w-2.5 h-2.5 stroke-[2.5]" />
                        </div>
                      )}
                      <span className="text-xs font-bold text-slate-900 block leading-tight">
                        {fin.title}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ====================================================== */}
            {/* 6. INSERT OPTIONS                                      */}
            {/* ====================================================== */}
            <div className="space-y-2.5">
              <label className="text-xs font-bold text-slate-900 block">
                6. Insert Options
              </label>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {INSERT_OPTIONS.map((ins) => {
                  const isSelected = selectedInsert === ins.id;
                  return (
                    <button
                      key={ins.id}
                      type="button"
                      onClick={() => setSelectedInsert(ins.id)}
                      className={`relative p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                        isSelected
                          ? 'border-2 border-[#FFED00] bg-amber-50/20 shadow-xs'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <span className="text-xs font-bold text-slate-900 block leading-tight">
                        {ins.title}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ====================================================== */}
            {/* 7. QUANTITY & PRICING                                  */}
            {/* ====================================================== */}
            <div className="space-y-2.5 pt-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <span>7. Quantity & Pricing</span>
                  <RiInformationLine className="w-3.5 h-3.5 text-slate-400" />
                </label>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedQuantity(50);
                    setSelectedBoxStyle('lid_base');
                    setSelectedPreset('a5');
                    setLength(220);
                    setWidth(160);
                    setHeight(60);
                    setSelectedThickness('1000gsm');
                    setSelectedOuterWrap('coated_art');
                    setSelectedFinishing('none');
                    setSelectedInsert('none');
                  }}
                  className="text-xs text-slate-500 hover:text-black hover:underline cursor-pointer"
                >
                  Clear Selection
                </button>
              </div>

              {/* 5 Quantity Pricing Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                {QUANTITY_TIERS.map((tier) => {
                  const isSelected = selectedQuantity === tier.quantity;
                  return (
                    <button
                      key={tier.quantity}
                      type="button"
                      onClick={() => setSelectedQuantity(tier.quantity)}
                      className={`relative p-3 rounded-xl border text-center transition-all cursor-pointer ${
                        isSelected
                          ? 'border-2 border-[#FFED00] bg-amber-50/20 shadow-xs'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      {isSelected && (
                        <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-[#FFED00] text-black flex items-center justify-center">
                          <RiCheckLine className="w-3 h-3 stroke-[2.5]" />
                        </div>
                      )}
                      <span className="text-xs font-bold text-slate-800 block">
                        {tier.quantity} units
                      </span>
                      <span className="text-sm font-black text-slate-950 font-mono block mt-0.5">
                        {formatCurrency(tier.totalPrice)}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono block mt-0.5">
                        ₹{tier.unitPrice.toFixed(2)} / unit
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Green Bulk Savings Banner */}
              <div className="p-2.5 bg-emerald-50 border border-emerald-200/90 rounded-xl flex items-center gap-2 text-xs text-emerald-900 font-medium">
                <RiCheckboxCircleLine className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>Higher quantity gives you lower per unit cost and better savings.</span>
              </div>
            </div>

            {/* ====================================================== */}
            {/* PRIMARY & SECONDARY CTA BUTTONS                        */}
            {/* ====================================================== */}
            <div className="space-y-3 pt-3">
              {/* Primary Add to Cart Button */}
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={isCalculatingPrice}
                className="w-full h-12 bg-[#FFED00] hover:bg-[#F2E100] text-black font-bold text-sm rounded-xl border border-black/10 shadow-xs flex items-center justify-center gap-2 transition-transform active:scale-[0.99] cursor-pointer"
              >
                <RiShoppingCart2Line className="w-5 h-5" />
                <span>Add to Cart</span>
              </button>

              {/* Secondary Action Buttons */}
              <div>
                <button
                  type="button"
                  onClick={() => setIsDesignerModalOpen(true)}
                  className="w-full h-11 px-4 bg-white hover:bg-slate-50 text-slate-900 text-xs font-bold rounded-xl border border-slate-300 flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-2xs"
                >
                  <RiCustomerService2Line className="w-4 h-4 text-slate-700" />
                  <span>No Design? Contact Designer</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* BOTTOM TRUST FOOTER STRIP                                */}
      {/* ======================================================== */}
      <div className="border-t border-slate-200 bg-slate-50/70 py-6 mt-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-xs text-slate-700">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-900 shadow-2xs">
                <RiShieldCheckLine className="w-5 h-5 text-slate-800" />
              </div>
              <div>
                <span className="font-bold text-slate-900 block">Secure Payments</span>
                <span className="text-[11px] text-slate-500">100% secure & encrypted</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-900 shadow-2xs">
                <RiAwardLine className="w-5 h-5 text-slate-800" />
              </div>
              <div>
                <span className="font-bold text-slate-900 block">Professional Production</span>
                <span className="text-[11px] text-slate-500">Advanced printing technology</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-900 shadow-2xs">
                <RiCheckboxCircleLine className="w-5 h-5 text-slate-800" />
              </div>
              <div>
                <span className="font-bold text-slate-900 block">Quality Assurance</span>
                <span className="text-[11px] text-slate-500">Strict quality checks</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-900 shadow-2xs">
                <RiTruckLine className="w-5 h-5 text-slate-800" />
              </div>
              <div>
                <span className="font-bold text-slate-900 block">On-Time Delivery</span>
                <span className="text-[11px] text-slate-500">Across India</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* CART SIDE DRAWER                                         */}
      {/* ======================================================== */}
      <CartDrawer
        isOpen={isCartDrawerOpen}
        onClose={() => setIsCartDrawerOpen(false)}
        activeItem={activeCartItem}
        onUpdateItem={(updated) => setActiveCartItem(updated)}
        onProceedToCheckout={(finalItem?: CartDrawerItem) => {
          const itemToPersist = finalItem || activeCartItem;
          if (itemToPersist) {
            setActiveCartItem(itemToPersist);
            sessionStorage.setItem('pb2_active_cart', JSON.stringify(itemToPersist));
          }
          if (user) {
            router.push('/checkout');
          } else {
            setIsAuthModalOpen(true);
          }
        }}
      />

      {/* Checkout Authentication Gate Modal */}
      <CustomerAuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={() => {
          setIsAuthModalOpen(false);
          setIsCartDrawerOpen(false);
          router.push('/checkout');
        }}
        zIndex="z-[200]"
      />

      {/* 3D View Modal */}
      {is3DModalOpen && (
        <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <RiBox3Line className="w-5 h-5 text-amber-500" />
                <h3 className="text-sm font-bold text-slate-900">
                  Interactive 3D Preview: {BOX_STYLES.find((b) => b.id === selectedBoxStyle)?.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIs3DModalOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <RiCloseLine className="w-5 h-5" />
              </button>
            </div>

            <div className="aspect-square bg-gradient-to-b from-slate-100 to-slate-200 rounded-xl flex flex-col items-center justify-center p-6 text-center space-y-3 relative overflow-hidden">
              <img
                src={PRODUCT_IMAGES[0].url}
                alt="3D Box View"
                className="w-48 h-48 object-contain drop-shadow-2xl transition-transform hover:scale-105"
              />
              <div className="space-y-1">
                <p className="text-xs font-mono font-bold text-slate-800">
                  {length} × {width} × {height} mm ({volume.toLocaleString()} mm³)
                </p>
                <p className="text-[11px] text-slate-500">
                  Rigid Greyboard Core: {BOARD_THICKNESSES.find((t) => t.id === selectedThickness)?.gsm} •{' '}
                  {OUTER_WRAPS.find((w) => w.id === selectedOuterWrap)?.title}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIs3DModalOpen(false)}
              className="w-full h-10 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-lg transition-colors"
            >
              Close 3D View
            </button>
          </div>
        </div>
      )}

      {/* Designer Support Modal */}
      {isDesignerModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <RiCustomerService2Line className="w-5 h-5 text-amber-500" />
                <h3 className="text-sm font-bold text-slate-900">Contact Packaging Engineer</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsDesignerModalOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <RiCloseLine className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Need custom die-lines, structural inserts, or artwork layout assistance for your{' '}
              <strong>Custom Luxury Rigid Box</strong>? Our packaging specialists are available for consultation.
            </p>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-xs">
              <p className="font-semibold text-slate-800">Packaging Desk Direct Helpline:</p>
              <p className="text-amber-800 font-mono font-bold">+91 (022) 2940-2100</p>
              <p className="text-slate-500 text-[11px]">Email: packaging@printbazzar.in (Mon-Sat 9AM-8PM IST)</p>
            </div>

            <button
              type="button"
              onClick={() => setIsDesignerModalOpen(false)}
              className="w-full h-10 bg-[#FFED00] hover:bg-[#F2E100] text-black text-xs font-bold rounded-lg transition-colors border border-amber-300"
            >
              Understood
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
