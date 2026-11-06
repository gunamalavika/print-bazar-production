export interface AuthenticatedUser {
  id: string;
  email: string;
  fullName: string;
  phone?: string | null;
  role:
    | 'CUSTOMER'
    | 'SALES_OFFICE'
    | 'DESIGNER_PREPRESS'
    | 'PRODUCTION_OPERATOR'
    | 'FINAL_QC_INSPECTOR'
    | 'PACKING_OPERATOR'
    | 'DISPATCH_LOGISTICS'
    | 'ACCOUNTS'
    | 'OPERATIONAL_MANAGER'
    | 'ADMIN_MANAGER';
  department?: string | null;
  customerId?: string | null;
  permissions: string[];
}

export interface LoginResponse {
  user: AuthenticatedUser;
  accessToken: string;
}

export interface KanbanCardDto {
  id: string;
  jobNumber: string;
  orderId: string;
  orderNumber: string;
  customerName: string;
  customerCompany?: string;
  productName: string;
  quantity: number;
  specifications: {
    paperGsm?: string;
    finish?: string;
    printMode?: string;
    dimensions?: string;
    sides?: string;
    selectedOptions?: Array<{ label: string; value: string }>;
    customerNotes?: string;
    raw?: Record<string, unknown>;
  };
  machine?: {
    id: string;
    name: string;
    code: string;
    type: string;
  } | null;
  operator?: {
    id: string;
    fullName: string;
    role: string;
  } | null;
  status: string;
  orderStatus: string;
  currentStation: string;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  dueAt: string;
  startedAt?: string | null;
  completedAt?: string | null;
  slaStatus: 'ON_TIME' | 'DUE_SOON' | 'OVERDUE';
  slaBadgeText: string;
  timeInfo: {
    label: string;
    text: string;
  };
  allowedTransitions: string[];
  allowedActions: string[];
  holdReason?: string;
  isHeld: boolean;
  version: number;
  artwork?: {
    id: string;
    storageKey: string;
    fileUrl: string;
    originalFileName: string;
    mimeType: string;
    fileSize: number;
    status: string;
    isApproved: boolean;
    proofUrl?: string | null;
  } | null;
}

export interface KanbanColumnDto {
  id: string;
  key: string;
  name: string;
  description?: string | null;
  type: 'SYSTEM' | 'CUSTOM' | 'HOLD' | 'ARCHIVED';
  sortOrder: number;
  color?: string | null;
  mappedStatus?: string | null;
  mappedStation?: string | null;
  cards: KanbanCardDto[];
  cardCount: number;
}

export interface ProductionBoardResponseDto {
  columns: KanbanColumnDto[];
  metrics: {
    activeJobs: number;
    printing: number;
    finishing: number;
    finalQc: number;
    packing: number;
    readyForDispatch: number;
    dispatched: number;
    onHold: number;
  };
  shiftInfo: {
    shiftName: string;
    liveStatus: string;
    activePressCount: number;
    operatorCount: number;
  };
  availableMachines: Array<{ id: string; name: string; code: string; type: string }>;
  availableOperators: Array<{ id: string; fullName: string; role: string; department?: string }>;
}

export interface ProductOption {
  id: string;
  groupId: string;
  label: string;
  value: string;
  priceModifierType: string;
  priceModifier: number | string;
  sortOrder: number;
  isDefault: boolean;
  isActive: boolean;
  fileCount?: number | null;
  fileSlotLabels?: string[];
  minMegapixels?: number | null;
  imageUrl?: string | null;
  includeImage?: boolean;
}

export interface ProductOptionGroup {
  id: string;
  productId: string;
  reusableGroupId?: string | null;
  name: string;
  code: string;
  inputType: string;
  selectionBehavior?: 'SINGLE' | 'MULTIPLE' | 'VARIANT_WISE' | string;
  description?: string | null;
  isRequired: boolean;
  isCustomerVisible: boolean;
  sortOrder: number;
  enableAdditionalPricing?: boolean;
  isActive: boolean;
  options: ProductOption[];
}

export interface ReusableOptionGroup {
  id: string;
  name: string;
  code: string;
  inputType:
    | 'SELECT'
    | 'RADIO'
    | 'CHECKBOX'
    | 'TOGGLE'
    | 'TEXT'
    | 'TEXTAREA'
    | 'NUMBER'
    | 'DATE'
    | 'EMAIL'
    | 'PHONE'
    | string;
  selectionBehavior?: 'SINGLE' | 'MULTIPLE' | 'VARIANT_WISE' | string;
  description?: string | null;
  defaultOptions?: Array<{
    label: string;
    value: string;
    priceModifier?: number;
    isDefault?: boolean;
    fileCount?: number;
    sortOrder?: number;
  }>;
  metadata?: any;
  sortOrder: number;
  enableAdditionalPricing?: boolean;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProductAdditionalPricingTier {
  id?: string;
  productId?: string;
  groupCode: string;
  optionValue: string;
  minQty: number;
  maxQty: number;
  unitPrice: number;
  chargeBasis?: 'PER_UNIT' | 'FIXED' | string;
  isExcluded?: boolean;
}

export interface ProductConfigurationRule {
  id: string;
  productId: string;
  name: string;
  conditionGroupCode: string;
  conditionOperator: string;
  conditionOptionValue: string;
  actionType: string;
  targetGroupCode?: string | null;
  targetOptionValue?: string | null;
  actionPayload?: any;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProductPricingSource {
  id: string;
  productId: string;
  sourceType: string;
  spreadsheetId?: string | null;
  worksheetName?: string | null;
  apiKey?: string | null;
  schemaVersion?: string;
  columnMapping?: Record<string, string> | null;
  lastSyncAt?: string | null;
  syncStatus: string;
  syncMessage?: string | null;
  syncRowCount: number;
  syncLogs?: ProductPricingSyncLog[];
}

export interface ProductPricingSyncLog {
  id: string;
  pricingSourceId: string;
  status: string;
  recordsParsed: number;
  recordsImported: number;
  errorMessage?: string | null;
  errorDetails?: any;
  triggeredBy?: string | null;
  createdAt: string;
}

export interface DynamicFieldOption {
  id: string;
  fieldId: string;
  label: string;
  value: string;
  priceModifierType: string;
  priceModifier: number | string;
  sortOrder: number;
  isDefault: boolean;
  isActive: boolean;
  imageUrl?: string | null;
  includeImage?: boolean;
  fileCount?: number | null;
  fileSlotLabels?: string[];
  minMegapixels?: number | null;
}

export interface DynamicField {
  id: string;
  productId: string;
  label: string;
  key: string;
  type:
    | 'TEXT'
    | 'TEXTAREA'
    | 'NUMBER'
    | 'EMAIL'
    | 'PHONE'
    | 'DATE'
    | 'TIME'
    | 'SELECT'
    | 'MULTI_SELECT'
    | 'RADIO'
    | 'CHECKBOX'
    | 'TOGGLE'
    | 'FILE'
    | 'IMAGE'
    | 'COLOR'
    | 'RANGE';
  description?: string;
  placeholder?: string;
  defaultValue?: string;
  isRequired: boolean;
  isCustomerVisible: boolean;
  isCustomerEditable: boolean;
  sortOrder: number;
  validationRules?: Record<string, any>;
  conditionalLogic?: {
    dependsOnFieldKey: string;
    operator: 'EQUALS' | 'NOT_EQUALS' | 'IN' | 'GREATER_THAN' | 'LESS_THAN';
    value: any;
  };
  options: DynamicFieldOption[];
}

export interface ProductImageItem {
  id: string;
  productId: string;
  url: string;
  storageKey?: string;
  altText?: string;
  caption?: string;
  sortOrder: number;
  isPrimary: boolean;
}

export interface ProductCategoryItem {
  id: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  sortOrder: number;
  isActive: boolean;
  parentId?: string | null;
  parent?: { id: string; name: string; slug: string } | null;
  children?: ProductCategoryItem[];
  _count?: { products: number; children?: number };
}

export type ProductOptionRequirement = 'REQUIRED' | 'OPTIONAL' | 'DISABLED';

export interface PricingRule {
  id: string;
  productId: string;
  minQty: number;
  maxQty: number;
  unitPrice: number;
  discountPercent?: number;
  label?: string;
  attributeCombination?: Record<string, any>;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreatePricingRuleDto {
  minQty: number;
  maxQty?: number | null;
  discountPercent?: number | null;
  unitPrice?: number | null;
  label?: string | null;
  attributeCombination?: Record<string, any> | null;
}

export interface ShippingGstSettings {
  id: string;
  baseShippingFee: number;
  gstRate: number;
  freeShippingThreshold: number;
  isFreeShippingEnabled: boolean;
  enableWeightCharges?: boolean;
  baseWeightKg?: number;
  weightRatePerKg?: number;
  enableQuantityCharges?: boolean;
  quantityStep?: number;
  quantitySurchargePerStep?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface ShippingZone {
  id: string;
  zoneName: string;
  pincodePrefix: string;
  shippingCharge: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ShippingTaxCalculationResult {
  subtotal: number;
  shippingFee: number;
  baseShippingFee: number;
  locationCharge?: number;
  weightCharge?: number;
  quantityCharge?: number;
  totalWeightKg?: number;
  totalQuantity?: number;
  calculationBasis?: string;
  isFreeShippingApplied: boolean;
  freeShippingThreshold: number;
  isFreeShippingEnabled: boolean;
  matchedZone: {
    id: string;
    zoneName: string;
    pincodePrefix: string;
    shippingCharge: number;
  } | null;
  gstRatePercent: number;
  gstAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
  deliveryMethod: string;
  grandTotal: number;
}

export interface DynamicProduct {
  id: string;
  categoryId: string;
  category?: ProductCategoryItem;
  name: string;
  slug: string;
  sku: string;
  description?: string;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  pricingModel: string;
  basePrice: number | string;
  minQuantity: number;
  quantityStep?: number | null;
  maxQuantity: number;
  productionDays: number;
  sortOrder: number;
  isFeatured: boolean;
  tags: string[];
  keyPoints?: string[];
  seoTitle?: string;
  seoDescription?: string;
  trackInventory: boolean;
  stockQuantity: number;
  lowStockAlert: number;
  defaultSize?: string | null;
  // Fulfillment & Courier Surcharges (Admin-Controlled alongside Product Configuration)
  shippingChargeType?: 'DEFAULT' | 'FIXED' | 'FREE' | 'QUANTITY_BASED' | 'WEIGHT_BASED';
  unitWeightGrams?: number | string | null;
  packagingProfileId?: string | null;
  packagingProfile?: any;
  isShippable?: boolean;
  bulkTierWeights?: Array<{ minQty: number; maxQty?: number; unitWeightGrams: number }>;
  courierCharge?: number | string | null;
  perAdditionalQtyRate?: number | string | null;
  freeShippingThreshold?: number | string | null;
  allowCod?: boolean;
  codSurcharge?: number | string | null;
  allowMultipleVariants?: boolean;
  variantDimensions?: string[];
  // Dynamic Product Flow Engine Configuration (Admin-Controlled)
  artworkRequirement?: ProductOptionRequirement;
  artworkPrice?: number | string | null;
  artworkQualityVerification?: boolean;
  minimumArtworkMegapixels?: number | null;
  referenceImageRequirement?: ProductOptionRequirement;
  designServiceRequirement?: ProductOptionRequirement;
  images: ProductImageItem[];
  optionGroups: ProductOptionGroup[];
  configurationRules?: ProductConfigurationRule[];
  pricingSource?: ProductPricingSource | null;
  fields?: DynamicField[];
  pricingMatrices?: PricingRule[];
  additionalPricings?: ProductAdditionalPricingTier[];
  isStudioConfigured?: boolean;
  configVersion?: number;
  artworkFileFormats?: string[];
  maxArtworkFileSizeMb?: number;
  designServiceFee?: number | string | null;
  designServicePrice?: number | string | null;
  personalizationTemplateId?: string | null;
  personalizationTemplate?: PersonalizationTemplate | null;
  personalizationConfig?: any;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryItemDto {
  id: string;
  name: string;
  sku: string;
  category: 'SUBSTRATE' | 'BOARD' | 'FABRIC' | 'VINYL' | 'INK_CONSUMABLE' | 'PACKAGING' | 'FINISHED_GOODS';
  unit: string;
  currentStock: number | string;
  reservedStock: number | string;
  minStockThreshold: number | string;
  costPerUnit: number | string;
  location?: string;
  notes?: string;
  isActive: boolean;
  movements?: any[];
}

/**
 * Normalizes the base API URL:
 * - Trims whitespace
 * - Strips all trailing slashes
 * - Automatically ensures /api/v1 is appended if the base URL points only to the domain/origin
 */
export function normalizeApiBaseUrl(rawBase?: string): string {
  const fallback = 'http://localhost:4000/api/v1';
  let base = (rawBase || process.env.NEXT_PUBLIC_API_URL || fallback).trim().replace(/\/+$/, '');
  
  // If user configured origin without /api/v1 (e.g. https://api-production-d4ed.up.railway.app)
  if (!base.endsWith('/api/v1')) {
    base = `${base}/api/v1`;
  }
  return base;
}

/**
 * Returns the root API host origin without /api/v1 or trailing slashes.
 * Used for static asset URLs (/uploads), downloads, and WebSocket connections.
 */
export function getApiHost(rawUrl?: string): string {
  const fallback = 'http://localhost:4000';
  const url = (rawUrl || process.env.NEXT_PUBLIC_API_URL || fallback).trim();
  return url.replace(/\/+$/, '').replace(/\/api\/v1\/?$/, '');
}

/**
 * Centrally constructs an authoritative API URL:
 * - Normalizes base URL (ensuring exact /api/v1 root and no trailing slashes)
 * - Normalizes endpoint path (collapses consecutive slashes, ensures single leading slash)
 * - Prevents duplicate /api/v1 prefixes
 * - Preserves full query parameters (?featured=true, pagination, etc.)
 */
export function buildApiUrl(endpoint: string, base?: string): string {
  const baseUrl = normalizeApiBaseUrl(base);
  
  // Clean endpoint
  let cleanEndpoint = (endpoint || '').trim().replace(/^\/+/, '');
  
  // Prevent duplicate /api/v1 if endpoint is passed with it
  if (cleanEndpoint.startsWith('api/v1/')) {
    cleanEndpoint = cleanEndpoint.replace(/^api\/v1\//, '');
  }
  
  // Collapse any internal double slashes before query params
  const [pathPart, ...queryParts] = cleanEndpoint.split('?');
  const queryPart = queryParts.length > 0 ? queryParts.join('?') : undefined;
  const normalizedPath = pathPart.replace(/\/{2,}/g, '/');
  const fullPath = queryPart !== undefined ? `${normalizedPath}?${queryPart}` : normalizedPath;
  
  return `${baseUrl}/${fullPath}`;
}

const API_BASE = normalizeApiBaseUrl();

export function resolveImageUrl(url?: string | null): string {
  if (!url) return 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=600&auto=format&fit=crop&q=80';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    // Strip redundant double timestamp if present in query or path
    return url.replace(/_(\d{10,14})_\d{10,14}(\.[a-zA-Z0-9]+)(\?.*)?$/, '_$1$2$3');
  }
  const apiHost = getApiHost();
  let cleanUrl = url.trim();
  if (!cleanUrl.startsWith('/')) {
    cleanUrl = `/${cleanUrl}`;
  }
  if (!cleanUrl.startsWith('/uploads/')) {
    if (cleanUrl.startsWith('/artwork/') || cleanUrl.startsWith('/references/') || cleanUrl.startsWith('/products/')) {
      cleanUrl = `/uploads${cleanUrl}`;
    }
  }
  // Normalize redundant double timestamps (e.g. _1793901183099_1793901183126.png -> _1793901183099.png)
  cleanUrl = cleanUrl.replace(/_(\d{10,14})_\d{10,14}(\.[a-zA-Z0-9]+)$/, '_$1$2');

  return `${apiHost}${cleanUrl}`;
}

export async function downloadFile(url?: string | null, suggestedFilename?: string): Promise<void> {
  if (!url) return;
  try {
    const fullUrl = resolveImageUrl(url);
    const response = await fetch(fullUrl);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;

    let fileName = suggestedFilename;
    if (!fileName) {
      const parts = url.split('/');
      const lastPart = parts.pop() || '';
      fileName = lastPart.split('?')[0] || 'artwork_file';
    }

    if (!fileName.includes('.')) {
      const type = blob.type;
      if (type.includes('pdf')) fileName += '.pdf';
      else if (type.includes('png')) fileName += '.png';
      else if (type.includes('jpeg') || type.includes('jpg')) fileName += '.jpg';
      else if (type.includes('svg')) fileName += '.svg';
      else fileName += '.png';
    }

    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(blobUrl);
  } catch (err) {
    console.warn('Direct blob download failed, falling back to anchor download:', err);
    const fallbackLink = document.createElement('a');
    fallbackLink.href = resolveImageUrl(url);
    fallbackLink.target = '_blank';
    if (suggestedFilename) {
      fallbackLink.download = suggestedFilename;
    }
    document.body.appendChild(fallbackLink);
    fallbackLink.click();
    document.body.removeChild(fallbackLink);
  }
}

export async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = buildApiUrl(endpoint);

  const token = typeof window !== 'undefined' ? localStorage.getItem('pb2_token') : null;

  const isFormData = typeof FormData !== 'undefined' && options?.body instanceof FormData;

  const headers: Record<string, string> = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(options?.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorDetail = 'API Request Failed';
    try {
      const errJson = await response.json();
      errorDetail = errJson.error?.message || errJson.message || errorDetail;
    } catch {
      errorDetail = response.statusText;
    }
    throw new Error(errorDetail);
  }

  return response.json();
}

export const api = {
  // Authentication
  login: (data: { identifier: string; password: string }): Promise<LoginResponse> =>
    fetchApi<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  register: (data: { email: string; password: string; fullName: string; phone?: string }): Promise<LoginResponse> =>
    fetchApi<LoginResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  logout: (): Promise<{ success: boolean; message: string }> =>
    fetchApi<{ success: boolean; message: string }>('/auth/logout', {
      method: 'POST',
    }),

  getCurrentUser: (): Promise<AuthenticatedUser> =>
    fetchApi<AuthenticatedUser>('/auth/me'),

  // Orders API (Customer & ERP)
  getOrders: (query?: { status?: string; search?: string; page?: number; limit?: number }) => {
    const params = new URLSearchParams();
    if (query?.status) params.append('status', query.status);
    if (query?.search) params.append('search', query.search);
    if (query?.page) params.append('page', String(query.page));
    if (query?.limit) params.append('limit', String(query.limit));
    return fetchApi<{ data: any[]; meta: { total: number; page: number; totalPages: number } }>(
      `/orders?${params.toString()}`,
    );
  },
  getOrderById: (id: string) => fetchApi<any>(`/orders/${id}`),

  // Storefront Public APIs
  getProducts: (categoryId?: string, search?: string, featured?: boolean) => {
    const params = new URLSearchParams();
    if (categoryId) params.append('categoryId', categoryId);
    if (search) params.append('search', search);
    if (featured !== undefined) params.append('featured', String(featured));
    return fetchApi<DynamicProduct[]>(`/products?${params.toString()}`);
  },
  getCategories: () => fetchApi<ProductCategoryItem[]>('/products/categories'),
  getSiteSettings: () => fetchApi<any>('/products/site-settings'),
  adminGetSiteSettings: () => fetchApi<any>('/admin/site-settings'),
  adminUpdateSiteSettings: (data: any) =>
    fetchApi<any>('/admin/site-settings', { method: 'PUT', body: JSON.stringify(data) }),
  getProductBySlug: (slug: string) => fetchApi<DynamicProduct>(`/products/${slug}`),

  // Authoritative Pricing Quote
  calculateQuote: (data: {
    productId: string;
    quantity: number;
    options?: Array<{ optionCode: string; valueCode: string }>;
    fieldValues?: Record<string, any>;
    variantLines?: Array<{
      id?: string;
      sku?: string;
      code?: string;
      optionCode?: string;
      combination?: Record<string, string>;
      quantity?: number;
      qty?: number;
      artworkUrl?: string;
      artworkFile?: any;
    }>;
    hasArtwork?: boolean;
    hasDesignService?: boolean;
    hasReferenceImage?: boolean;
    shippingPincode?: string;
    isInterState?: boolean;
    deliveryMethod?: 'COURIER' | 'STORE_PICKUP' | string;
    paymentMethod?: 'ONLINE' | 'COD' | string;
    isCod?: boolean;
  }) => fetchApi<any>('/pricing/calculate-quote', { method: 'POST', body: JSON.stringify(data) }),

  // Artwork & Media Uploads
  uploadArtwork: (file: File, productId?: string, minimumMegapixels?: number) => {
    const formData = new FormData();
    formData.append('file', file);
    if (productId) formData.append('productId', productId);
    if (minimumMegapixels !== undefined) formData.append('minimumMegapixels', String(minimumMegapixels));
    return fetchApi<{
      fileUrl: string;
      storageKey: string;
      originalFileName: string;
      fileSize: number;
      mimeType: string;
      width: number | null;
      height: number | null;
      actualMegapixels: number | null;
      requiredMegapixels: number;
      qualityVerificationEnabled: boolean;
      qualityStatus: 'PASSED' | 'WARNING' | 'NOT_APPLICABLE';
      warningMessage: string | null;
      timestamp: string;
    }>('/artwork/upload', {
      method: 'POST',
      body: formData,
    });
  },

  uploadReferenceImage: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return fetchApi<{
      fileUrl: string;
      storageKey: string;
      originalFileName: string;
      fileSize: number;
      mimeType: string;
      timestamp: string;
    }>('/artwork/upload-reference', {
      method: 'POST',
      body: formData,
    });
  },

  // Admin Catalogue: Categories
  adminListCategories: () => fetchApi<ProductCategoryItem[]>('/admin/catalogue/categories'),
  adminGetCategory: (id: string) => fetchApi<ProductCategoryItem>(`/admin/catalogue/categories/${id}`),
  adminCreateCategory: (data: Partial<ProductCategoryItem>) =>
    fetchApi<ProductCategoryItem>('/admin/catalogue/categories', { method: 'POST', body: JSON.stringify(data) }),
  adminUpdateCategory: (id: string, data: Partial<ProductCategoryItem>) =>
    fetchApi<ProductCategoryItem>(`/admin/catalogue/categories/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  adminDeleteCategory: (id: string) =>
    fetchApi<{ success: boolean; message: string }>(`/admin/catalogue/categories/${id}`, { method: 'DELETE' }),

  // Admin Catalogue: Products
  adminListProducts: (query?: { categoryId?: string; status?: string; search?: string; page?: number; limit?: number }) => {
    const params = new URLSearchParams();
    if (query?.categoryId) params.append('categoryId', query.categoryId);
    if (query?.status) params.append('status', query.status);
    if (query?.search) params.append('search', query.search);
    if (query?.page) params.append('page', String(query.page));
    if (query?.limit) params.append('limit', String(query.limit));
    return fetchApi<{ data: DynamicProduct[]; meta: { total: number; page: number; totalPages: number } }>(
      `/admin/catalogue/products?${params.toString()}`,
    );
  },
  adminGetProductById: (id: string) => fetchApi<DynamicProduct>(`/admin/catalogue/products/${id}`),
  adminGetNextProductSku: () =>
    fetchApi<{ sku: string }>('/admin/catalogue/products/next-sku'),
  adminCreateProduct: (data: any) =>
    fetchApi<DynamicProduct>('/admin/catalogue/products', { method: 'POST', body: JSON.stringify(data) }),
  adminUpdateProduct: (id: string, data: any) =>
    fetchApi<DynamicProduct>(`/admin/catalogue/products/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  adminDuplicateProduct: (id: string) =>
    fetchApi<DynamicProduct>(`/admin/catalogue/products/${id}/duplicate`, { method: 'POST' }),
  adminPublishProduct: (id: string) =>
    fetchApi<DynamicProduct>(`/admin/catalogue/products/${id}/publish`, { method: 'PATCH' }),
  adminArchiveProduct: (id: string) =>
    fetchApi<DynamicProduct>(`/admin/catalogue/products/${id}/archive`, { method: 'PATCH' }),
  adminToggleFeaturedProduct: (id: string) =>
    fetchApi<DynamicProduct>(`/admin/catalogue/products/${id}/feature`, { method: 'PATCH' }),
  adminDeleteProduct: (id: string) =>
    fetchApi<{ success: boolean; message: string }>(`/admin/catalogue/products/${id}`, { method: 'DELETE' }),

  // Reusable Option Groups (Library)
  adminListReusableGroups: () =>
    fetchApi<ReusableOptionGroup[]>('/admin/catalogue/reusable-groups'),
  adminGetReusableGroupById: (id: string) =>
    fetchApi<ReusableOptionGroup>(`/admin/catalogue/reusable-groups/${id}`),
  adminCreateReusableGroup: (data: any) =>
    fetchApi<ReusableOptionGroup>('/admin/catalogue/reusable-groups', { method: 'POST', body: JSON.stringify(data) }),
  adminUpdateReusableGroup: (id: string, data: any) =>
    fetchApi<ReusableOptionGroup>(`/admin/catalogue/reusable-groups/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  adminDeleteReusableGroup: (id: string) =>
    fetchApi<{ success: boolean; message: string }>(`/admin/catalogue/reusable-groups/${id}`, { method: 'DELETE' }),

  // Product Setup Studio: Option Groups
  adminAddOptionGroup: (productId: string, data: any) =>
    fetchApi<ProductOptionGroup>(`/admin/catalogue/products/${productId}/option-groups`, { method: 'POST', body: JSON.stringify(data) }),
  adminUpdateOptionGroup: (productId: string, groupId: string, data: any) =>
    fetchApi<ProductOptionGroup>(`/admin/catalogue/products/${productId}/option-groups/${groupId}`, { method: 'PUT', body: JSON.stringify(data) }),
  adminDeleteOptionGroup: (productId: string, groupId: string) =>
    fetchApi<{ success: boolean; message: string }>(`/admin/catalogue/products/${productId}/option-groups/${groupId}`, { method: 'DELETE' }),
  adminReorderOptionGroups: (productId: string, orderedGroupIds: string[]) =>
    fetchApi<{ success: boolean; message: string }>(`/admin/catalogue/products/${productId}/option-groups/reorder`, { method: 'PATCH', body: JSON.stringify({ orderedGroupIds }) }),

  // Product Setup Studio: Options
  adminAddOption: (groupId: string, data: any) =>
    fetchApi<ProductOption>(`/admin/catalogue/option-groups/${groupId}/options`, { method: 'POST', body: JSON.stringify(data) }),
  adminUpdateOption: (optionId: string, data: any) =>
    fetchApi<ProductOption>(`/admin/catalogue/options/${optionId}`, { method: 'PUT', body: JSON.stringify(data) }),
  adminDeleteOption: (optionId: string) =>
    fetchApi<{ success: boolean; message: string }>(`/admin/catalogue/options/${optionId}`, { method: 'DELETE' }),
  adminBulkSaveOptions: (groupId: string, data: { groupId: string; options: any[] }) =>
    fetchApi<ProductOption[]>(`/admin/catalogue/option-groups/${groupId}/options-bulk`, { method: 'POST', body: JSON.stringify(data) }),
  adminReorderOptions: (groupId: string, orderedOptionIds: string[]) =>
    fetchApi<{ success: boolean; message: string }>(`/admin/catalogue/option-groups/${groupId}/options/reorder`, { method: 'PATCH', body: JSON.stringify({ orderedOptionIds }) }),

  // Product Setup Studio: Configuration Rules
  adminSaveConfigurationRules: (productId: string, rules: any[]) =>
    fetchApi<ProductConfigurationRule[]>(`/admin/catalogue/products/${productId}/configuration-rules`, { method: 'PUT', body: JSON.stringify({ rules }) }),
  adminDeleteConfigurationRule: (productId: string, ruleId: string) =>
    fetchApi<{ success: boolean; message: string }>(`/admin/catalogue/products/${productId}/configuration-rules/${ruleId}`, { method: 'DELETE' }),

  // Product Setup Studio: Native Manual Combination Pricing Matrix
  adminGetPricingMatrix: (productId: string) =>
    fetchApi<PricingRule[]>(`/admin/catalogue/products/${productId}/pricing-matrix`),
  adminSavePricingMatrix: (productId: string, data: { rows: any[] }) =>
    fetchApi<PricingRule[]>(`/admin/catalogue/products/${productId}/pricing-matrix`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  adminGenerateMatrixCombinations: (productId: string) =>
    fetchApi<{ totalGenerated: number; combinations: any[] }>(
      `/admin/catalogue/products/${productId}/pricing-matrix/generate-combinations`,
      { method: 'POST' },
    ),

  // Product Setup Studio: Dynamic Group-Based Additional Pricing
  adminGetAdditionalPricing: (productId: string) =>
    fetchApi<ProductAdditionalPricingTier[]>(`/admin/catalogue/products/${productId}/additional-pricing`),
  adminSaveAdditionalPricing: (productId: string, data: { tiers: ProductAdditionalPricingTier[] }) =>
    fetchApi<ProductAdditionalPricingTier[]>(`/admin/catalogue/products/${productId}/additional-pricing`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // Product Setup Studio: Google Sheets Pricing Source & Sync (Deprecated / Retained for compatibility)
  adminConfigurePricingSource: (productId: string, data: any) =>
    fetchApi<ProductPricingSource>(`/admin/catalogue/products/${productId}/pricing-source`, { method: 'PUT', body: JSON.stringify(data) }),
  adminSyncPricingSheet: (productId: string, data: any) =>
    fetchApi<any>(`/admin/catalogue/products/${productId}/sync-pricing-sheet`, { method: 'POST', body: JSON.stringify(data) }),
  adminGetPricingSyncLogs: (productId: string) =>
    fetchApi<ProductPricingSyncLog[]>(`/admin/catalogue/products/${productId}/pricing-sync-logs`),

  // Media & Product Images
  adminUploadProductImage: (productId: string, file: File, metadata?: { altText?: string; caption?: string; isPrimary?: boolean }) => {
    const formData = new FormData();
    formData.append('file', file);
    if (metadata?.altText) formData.append('altText', metadata.altText);
    if (metadata?.caption) formData.append('caption', metadata.caption);
    if (metadata?.isPrimary !== undefined) formData.append('isPrimary', String(metadata.isPrimary));
    return fetchApi<ProductImageItem>(`/admin/catalogue/products/${productId}/upload-image`, {
      method: 'POST',
      body: formData,
    });
  },
  uploadMedia: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return fetchApi<{ url: string; filename: string; originalName: string; size: number; mimetype: string }>(
      '/admin/catalogue/upload-media',
      { method: 'POST', body: formData }
    );
  },
  adminAddProductImage: (productId: string, data: any) =>
    fetchApi<ProductImageItem>(`/admin/catalogue/products/${productId}/images`, { method: 'POST', body: JSON.stringify(data) }),
  adminSetPrimaryImage: (productId: string, imageId: string) =>
    fetchApi<{ success: boolean; message: string }>(`/admin/catalogue/products/${productId}/images/${imageId}/primary`, { method: 'PATCH' }),
  adminDeleteProductImage: (productId: string, imageId: string) =>
    fetchApi<{ success: boolean; message: string }>(`/admin/catalogue/products/${productId}/images/${imageId}`, { method: 'DELETE' }),
  adminReorderImages: (productId: string, orderedImageIds: string[]) =>
    fetchApi<{ success: boolean; message: string }>(`/admin/catalogue/products/${productId}/images/reorder`, { method: 'PATCH', body: JSON.stringify({ orderedImageIds }) }),

  // Admin Inventory
  adminListInventory: (query?: { category?: string; search?: string; lowStockOnly?: boolean }) => {
    const params = new URLSearchParams();
    if (query?.category) params.append('category', query.category);
    if (query?.search) params.append('search', query.search);
    if (query?.lowStockOnly) params.append('lowStockOnly', 'true');
    return fetchApi<InventoryItemDto[]>(`/admin/inventory/items?${params.toString()}`);
  },
  adminCreateInventoryItem: (data: any) =>
    fetchApi<InventoryItemDto>('/admin/inventory/items', { method: 'POST', body: JSON.stringify(data) }),
  adminUpdateInventoryItem: (id: string, data: any) =>
    fetchApi<InventoryItemDto>(`/admin/inventory/items/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  adminRecordStockMovement: (id: string, data: any) =>
    fetchApi<any>(`/admin/inventory/items/${id}/movement`, { method: 'POST', body: JSON.stringify(data) }),
  adminListStockMovements: (itemId?: string) =>
    fetchApi<any[]>(`/admin/inventory/movements${itemId ? `?itemId=${itemId}` : ''}`),

  // Orders
  createOrder: (orderData: unknown) =>
    fetchApi('/orders', { method: 'POST', body: JSON.stringify(orderData) }),
  getOrder: (idOrNumber: string) => fetchApi(`/orders/${idOrNumber}`),
  listOrders: (query?: Record<string, string>) => {
    const params = new URLSearchParams(query || {});
    return fetchApi(`/orders?${params.toString()}`);
  },

  // Workflow
  transitionWorkflow: (data: { orderId: string; targetStatus: string; notes?: string }) =>
    fetchApi('/workflow/transition', { method: 'POST', body: JSON.stringify(data) }),
  managerOverride: (data: { orderId: string; targetStatus: string; reason: string; notes?: string }) =>
    fetchApi('/workflow/override', { method: 'POST', body: JSON.stringify(data) }),
  pauseOrder: (orderId: string, reason: string) =>
    fetchApi(`/workflow/${orderId}/pause`, { method: 'POST', body: JSON.stringify({ reason }) }),
  resumeOrder: (orderId: string, preHoldStatus: string) =>
    fetchApi(`/workflow/${orderId}/resume`, { method: 'POST', body: JSON.stringify({ preHoldStatus }) }),

  // Quality Control
  getQCTemplates: (type: 'pre-production' | 'final') => fetchApi(`/qc/template/${type}`),
  getPreProductionQCQueue: (search?: string) => {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    return fetchApi<any[]>(`/qc/queue/pre-production?${params.toString()}`);
  },
  getFinalQCQueue: (search?: string) => {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    return fetchApi<any[]>(`/qc/queue/final?${params.toString()}`);
  },
  submitQC: (data: unknown) => fetchApi('/qc/inspect', { method: 'POST', body: JSON.stringify(data) }),

  // Job Cards
  listJobCards: (station?: string) => fetchApi(`/job-cards${station ? `?station=${station}` : ''}`),
  claimJobCard: (id: string) => fetchApi(`/job-cards/${id}/claim`, { method: 'POST' }),
  startJobCard: (id: string) => fetchApi(`/job-cards/${id}/start`, { method: 'POST' }),
  completeStation: (id: string, nextStation: string) =>
    fetchApi(`/job-cards/${id}/complete-station`, { method: 'POST', body: JSON.stringify({ nextStation }) }),

  // Production Kanban Board
  getProductionBoard: (query?: {
    search?: string;
    machineId?: string;
    operatorId?: string;
    priority?: string;
    slaStatus?: string;
    columnKey?: string;
  }) => {
    const params = new URLSearchParams();
    if (query?.search) params.append('search', query.search);
    if (query?.machineId && query.machineId !== 'ALL') params.append('machineId', query.machineId);
    if (query?.operatorId && query.operatorId !== 'ALL') params.append('operatorId', query.operatorId);
    if (query?.priority && query.priority !== 'ALL') params.append('priority', query.priority);
    if (query?.slaStatus && query.slaStatus !== 'ALL') params.append('slaStatus', query.slaStatus);
    if (query?.columnKey) params.append('columnKey', query.columnKey);
    return fetchApi<ProductionBoardResponseDto>(`/production/board?${params.toString()}`);
  },
  getJobCard: (id: string) => fetchApi<any>(`/job-cards/${id}`),
  transitionProductionJob: (
    jobId: string,
    data: {
      targetColumnKey: string;
      reason?: string;
      machineId?: string;
      operatorId?: string;
      managerOverrideReason?: string;
    },
  ) =>
    fetchApi<any>(`/production/jobs/${jobId}/transition`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  createProductionColumn: (data: {
    name: string;
    key?: string;
    description?: string;
    type?: 'SYSTEM' | 'CUSTOM' | 'HOLD' | 'ARCHIVED';
    sortOrder?: number;
    color?: string;
    mappedStatus?: string;
    mappedStation?: string;
  }) =>
    fetchApi<any>('/production/columns', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateProductionColumn: (id: string, data: any) =>
    fetchApi<any>(`/production/columns/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  reorderProductionColumns: (columnOrders: Array<{ id: string; sortOrder: number }>) =>
    fetchApi<{ success: boolean; message: string }>('/production/columns/reorder', {
      method: 'PATCH',
      body: JSON.stringify({ columnOrders }),
    }),
  archiveProductionColumn: (id: string) =>
    fetchApi<any>(`/production/columns/${id}/archive`, {
      method: 'POST',
    }),

  // Packing & Dispatch
  getPackingQueue: (query?: { search?: string; priority?: string }) => {
    const params = new URLSearchParams();
    if (query?.search) params.append('search', query.search);
    if (query?.priority && query.priority !== 'ALL') params.append('priority', query.priority);
    return fetchApi<any[]>(`/packing/queue?${params.toString()}`);
  },
  getPackagingMaterials: () => fetchApi<any[]>('/packing/materials'),
  getPackingJob: (id: string) => fetchApi<any>(`/packing/jobs/${id}`),
  completePacking: (data: {
    orderId: string;
    packages: Array<{
      sequenceNumber: number;
      cartonType?: string;
      grossWeightGrams: number;
      lengthCm: number;
      widthCm: number;
      heightCm: number;
    }>;
    courierName?: string;
    stationPrinter?: string;
  }) => fetchApi<any>('/packing/complete', { method: 'POST', body: JSON.stringify(data) }),
  recordLabelReprint: (id: string, reason?: string) =>
    fetchApi<{ success: boolean; message: string }>(`/packing/jobs/${id}/label/reprint`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),
  confirmCourierHandover: (data: unknown) =>
    fetchApi('/dispatch/courier-handover', { method: 'POST', body: JSON.stringify(data) }),
  confirmStorePickup: (data: unknown) =>
    fetchApi('/dispatch/store-pickup-handover', { method: 'POST', body: JSON.stringify(data) }),
  getOrderDispatchDetails: (orderId: string) =>
    fetchApi<any>(`/dispatch/${orderId}/weight-details`),
  adjustDispatchWeight: (orderId: string, data: { measuredWeightGrams: number; reason?: string }) =>
    fetchApi<any>(`/dispatch/${orderId}/adjust-weight`, { method: 'POST', body: JSON.stringify(data) }),

  // Payments & Finance Board
  getFinanceBoard: (query?: {
    search?: string;
    paymentStatus?: string;
    method?: string;
    priority?: string;
  }) => {
    const params = new URLSearchParams();
    if (query?.search) params.append('search', query.search);
    if (query?.paymentStatus && query.paymentStatus !== 'ALL') params.append('paymentStatus', query.paymentStatus);
    if (query?.method && query.method !== 'ALL') params.append('method', query.method);
    if (query?.priority && query.priority !== 'ALL') params.append('priority', query.priority);
    return fetchApi<{
      metrics: {
        totalGrossBilling: number;
        gstCollected: number;
        settledAmount: number;
        pendingAmount: number;
        corporateCreditAmount: number;
        overdueAmount: number;
        collectionRate: number;
        pendingCount: number;
        corporateCount: number;
        settledCount: number;
        overdueCount: number;
      };
      cards: any[];
    }>(`/payments/board?${params.toString()}`);
  },
  recordManualPayment: (data: {
    orderId: string;
    amount: number;
    method: string;
    referenceNumber: string;
    notes?: string;
  }) => fetchApi<any>('/payments/manual', { method: 'POST', body: JSON.stringify(data) }),
  createPaymentIntent: (orderId: string) =>
    fetchApi('/payments/create-intent', { method: 'POST', body: JSON.stringify({ orderId }) }),
  verifyPayment: (data: unknown) =>
    fetchApi('/payments/verify', { method: 'POST', body: JSON.stringify(data) }),

  // SLA
  getSlaOverview: () => fetchApi('/sla/overview'),

  // Design Team & Artwork Studio Workflow
  getDesignQueue: (search?: string, tab?: 'active' | 'passed' | 'all', scope?: 'mine' | 'all') => {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (tab) params.append('tab', tab);
    if (scope) params.append('scope', scope);
    return fetchApi<any[]>(`/artwork/design-queue?${params.toString()}`);
  },
  getPassedDesignQueue: (search?: string, scope?: 'mine' | 'all') => {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (scope) params.append('scope', scope);
    return fetchApi<any[]>(`/artwork/passed-queue?${params.toString()}`);
  },
  claimDesignJob: (orderId: string) =>
    fetchApi<any>(`/artwork/design/${orderId}/claim`, { method: 'POST' }),
  completeDesignJob: (orderId: string, data: {
    storageKey: string;
    originalFileName: string;
    mimeType?: string;
    fileSize?: number;
    prepressNotes?: string;
    resolutionDpi?: number;
  }) => fetchApi<any>(`/artwork/design/${orderId}/complete`, { method: 'POST', body: JSON.stringify(data) }),
  submitMultipleDesignWorks: (orderId: string, data: {
    files: Array<{
      storageKey: string;
      originalFileName: string;
      mimeType?: string;
      fileSize?: number;
      label?: string;
      resolutionDpi?: number;
    }>;
    prepressNotes?: string;
    resolutionDpi?: number;
  }) => fetchApi<any>(`/artwork/design/${orderId}/submit-multiple`, { method: 'POST', body: JSON.stringify(data) }),
  confirmArtworkWork: (data: {
    orderItemId: string;
    artworkVersionId: string;
    oeNotes?: string;
  }) => fetchApi<any>('/artwork/confirm-work', { method: 'POST', body: JSON.stringify(data) }),
  returnArtworkToDesigner: (data: {
    orderItemId: string;
    revisionFeedback?: string;
  }) => fetchApi<any>('/artwork/return-to-designer', { method: 'POST', body: JSON.stringify(data) }),
  getArtworkVersions: (orderItemId: string) =>
    fetchApi<any[]>(`/artwork/item/${orderItemId}`),
  registerArtwork: (data: any) =>
    fetchApi<any>('/artwork/register', { method: 'POST', body: JSON.stringify(data) }),
  submitProofForApproval: (artworkVersionId: string, prepressNotes: string) =>
    fetchApi<any>(`/artwork/submit-proof/${artworkVersionId}`, { method: 'POST', body: JSON.stringify({ prepressNotes }) }),
  approveProof: (data: { orderItemId: string; artworkVersionId: string }) =>
    fetchApi<any>('/artwork/approve-proof', { method: 'POST', body: JSON.stringify(data) }),
  requestRevision: (data: {
    orderItemId: string;
    artworkVersionId?: string;
    revisionFeedback?: string;
    reason?: string;
    customerNotes?: string;
  }) => fetchApi<any>('/artwork/request-revision', { method: 'POST', body: JSON.stringify(data) }),

  // Operations Coordinator (OE) Module
  getOperationsDashboard: () =>
    fetchApi<any>('/operations/dashboard'),
  getOperationsOrders: (query?: {
    search?: string;
    statusGroup?: string;
    assignedDesignerId?: string;
    assignedOperatorId?: string;
    priority?: string;
    page?: number;
    limit?: number;
  }) => {
    const params = new URLSearchParams();
    if (query?.search) params.append('search', query.search);
    if (query?.statusGroup && query.statusGroup !== 'ALL') params.append('statusGroup', query.statusGroup);
    if (query?.assignedDesignerId && query.assignedDesignerId !== 'ALL') params.append('assignedDesignerId', query.assignedDesignerId);
    if (query?.assignedOperatorId && query.assignedOperatorId !== 'ALL') params.append('assignedOperatorId', query.assignedOperatorId);
    if (query?.priority && query.priority !== 'ALL') params.append('priority', query.priority);
    if (query?.page) params.append('page', query.page.toString());
    if (query?.limit) params.append('limit', query.limit.toString());
    return fetchApi<any>(`/operations/orders?${params.toString()}`);
  },
  getOperationsIntakeOrders: () =>
    fetchApi<any[]>('/operations/orders/intake'),
  getOperationsUnassignedDesignOrders: () =>
    fetchApi<any[]>('/operations/orders/unassigned/design'),
  getOperationsUnassignedProductionOrders: () =>
    fetchApi<any[]>('/operations/orders/unassigned/production'),
  getOperationsBlockedOrders: () =>
    fetchApi<any[]>('/operations/orders/blocked'),
  getOperationsOrderDetail: (orderId: string) =>
    fetchApi<any>(`/operations/orders/${orderId}`),
  getOperationsOrderTimeline: (orderId: string) =>
    fetchApi<any[]>(`/operations/orders/${orderId}/timeline`),
  assignDesigner: (orderId: string, data: { designerId: string; reason?: string }) =>
    fetchApi<any>(`/operations/orders/${orderId}/design-assignment`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  assignProductionOperator: (orderId: string, data: { operatorId: string; reason?: string }) =>
    fetchApi<any>(`/operations/orders/${orderId}/production-assignment`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  addOperationalNote: (orderId: string, data: { content: string }) =>
    fetchApi<any>(`/operations/orders/${orderId}/notes`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateOrderPriority: (orderId: string, data: { priority: string; reason?: string }) =>
    fetchApi<any>(`/operations/orders/${orderId}/priority`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  getEligibleDesigners: () =>
    fetchApi<any[]>('/operations/assignees/designers'),
  getEligibleProductionOperators: () =>
    fetchApi<any[]>('/operations/assignees/operators'),
  getOrderReadiness: (orderId: string) =>
    fetchApi<any>(`/operations/orders/${orderId}/readiness`),
  releaseOrderToProduction: (orderId: string, data?: { managerOverrideReason?: string; notes?: string; assignedOperatorId?: string }) =>
    fetchApi<any>(`/operations/orders/${orderId}/release-to-production`, {
      method: 'POST',
      body: JSON.stringify(data || {}),
    }),

  // ==========================================
  // SHIPPING & GST API METHODS (LEGACY & ENTERPRISE)
  // ==========================================
  getShippingOverview: () =>
    fetchApi<any>('/shipping/overview'),
  getShippingConfiguration: () =>
    fetchApi<any>('/shipping/configuration'),
  getShippingConfig: () =>
    fetchApi<any>('/shipping/configuration'),
  updateShippingConfiguration: (data: any) =>
    fetchApi<any>('/shipping/configuration', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  updateShippingConfig: (data: any) =>
    fetchApi<any>('/shipping/configuration', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  listEnterpriseShippingZones: (search?: string, isActive?: boolean) => {
    const q = new URLSearchParams();
    if (search) q.set('search', search);
    if (isActive !== undefined) q.set('isActive', String(isActive));
    return fetchApi<any[]>(`/shipping/zones?${q.toString()}`);
  },
  getEnterpriseShippingZone: (id: string) =>
    fetchApi<any>(`/shipping/zones/${id}`),
  createEnterpriseShippingZone: (data: any) =>
    fetchApi<any>('/shipping/zones', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateEnterpriseShippingZone: (id: string, data: any) =>
    fetchApi<any>(`/shipping/zones/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  deleteEnterpriseShippingZone: (id: string) =>
    fetchApi<{ success: boolean; message: string }>(`/shipping/zones/${id}`, {
      method: 'DELETE',
    }),
  listShippingPincodes: (params?: {
    search?: string;
    pincode?: string;
    city?: string;
    state?: string;
    zoneId?: string;
    isServiceable?: boolean;
    page?: number;
    limit?: number;
  }) => {
    const q = new URLSearchParams();
    if (params?.search) q.set('search', params.search);
    if (params?.pincode) q.set('pincode', params.pincode);
    if (params?.city) q.set('city', params.city);
    if (params?.state) q.set('state', params.state);
    if (params?.zoneId) q.set('zoneId', params.zoneId);
    if (params?.isServiceable !== undefined) q.set('isServiceable', String(params.isServiceable));
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));
    return fetchApi<{ pincodes: any[]; pagination: any }>(`/shipping/pincodes?${q.toString()}`);
  },
  getShippingPincode: (pin: string) =>
    fetchApi<any>(`/shipping/pincodes/${pin}`),
  createShippingPincode: (data: any) =>
    fetchApi<any>('/shipping/pincodes', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateShippingPincode: (id: string, data: any) =>
    fetchApi<any>(`/shipping/pincodes/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  deleteShippingPincode: (id: string) =>
    fetchApi<{ success: boolean; message: string }>(`/shipping/pincodes/${id}`, {
      method: 'DELETE',
    }),
  bulkImportShippingPincodes: (data: any[] | { pincodes: any[] }) =>
    fetchApi<any>('/shipping/pincodes/import', {
      method: 'POST',
      body: JSON.stringify(Array.isArray(data) ? { pincodes: data } : data),
    }),
  exportShippingPincodes: () =>
    fetchApi<any[]>('/shipping/pincodes/export'),
  listShippingRateCards: (zoneId?: string, isActive?: boolean) => {
    const q = new URLSearchParams();
    if (zoneId) q.set('zoneId', zoneId);
    if (isActive !== undefined) q.set('isActive', String(isActive));
    return fetchApi<any[]>(`/shipping/rates?${q.toString()}`);
  },
  getShippingRateCard: (id: string) =>
    fetchApi<any>(`/shipping/rates/${id}`),
  createShippingRateCard: (data: any) =>
    fetchApi<any>('/shipping/rates', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateShippingRateCard: (id: string, data: any) =>
    fetchApi<any>(`/shipping/rates/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  deleteShippingRateCard: (id: string) =>
    fetchApi<{ success: boolean; message: string }>(`/shipping/rates/${id}`, {
      method: 'DELETE',
    }),
  listPackagingProfiles: (isActive?: boolean) => {
    const q = new URLSearchParams();
    if (isActive !== undefined) q.set('isActive', String(isActive));
    return fetchApi<any[]>(`/shipping/packaging?${q.toString()}`);
  },
  createPackagingProfile: (data: any) =>
    fetchApi<any>('/shipping/packaging', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updatePackagingProfile: (id: string, data: any) =>
    fetchApi<any>(`/shipping/packaging/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  deletePackagingProfile: (id: string) =>
    fetchApi<{ success: boolean; message: string }>(`/shipping/packaging/${id}`, {
      method: 'DELETE',
    }),
  calculateShipping: (data: any) =>
    fetchApi<any>('/shipping/calculate', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  calculateEnterpriseShipping: (data: {
    productId?: string;
    quantity: number;
    destinationPincode?: string;
    packagingProfileId?: string;
    customUnitWeightGrams?: number;
    orderSubtotal?: number;
    deliveryMethod?: 'COURIER' | 'STORE_PICKUP';
    items?: any[];
  }) =>
    fetchApi<any>('/shipping/calculate', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  checkPincodeServiceability: (pincode: string) =>
    fetchApi<any>('/shipping/check-serviceability', {
      method: 'POST',
      body: JSON.stringify({ pincode }),
    }),
  listShippingOrders: (params?: any) => {
    const q = new URLSearchParams();
    if (params?.search) q.set('search', params.search);
    if (params?.pincode) q.set('pincode', params.pincode);
    if (params?.status) q.set('status', params.status);
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));
    return fetchApi<any>(`/shipping/orders?${q.toString()}`);
  },
  getShippingOrders: (params?: {
    search?: string;
    pincode?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) => {
    const q = new URLSearchParams();
    if (params?.search) q.set('search', params.search);
    if (params?.pincode) q.set('pincode', params.pincode);
    if (params?.status) q.set('status', params.status);
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));
    return fetchApi<any>(`/shipping/orders?${q.toString()}`);
  },
  updateShippingOrderStatus: (id: string, data: any) =>
    fetchApi<any>(`/shipping/orders/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  getShippingReports: () =>
    fetchApi<any>('/shipping/reports'),
  getShippingGstSettings: () =>
    fetchApi<ShippingGstSettings>('/shipping-gst/settings'),
  updateShippingGstSettings: (data: Partial<ShippingGstSettings>) =>
    fetchApi<ShippingGstSettings>('/shipping-gst/settings', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  listShippingZones: () =>
    fetchApi<any[]>('/shipping/zones'),
  createShippingZone: (data: any) =>
    fetchApi<any>('/shipping/zones', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateShippingZone: (id: string, data: any) =>
    fetchApi<any>(`/shipping/zones/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  deleteShippingZone: (id: string) =>
    fetchApi<{ success: boolean; message: string }>(`/shipping/zones/${id}`, {
      method: 'DELETE',
    }),
  calculateShippingAndTax: (data: {
    subtotal: number;
    postalCode?: string;
    deliveryMethod?: 'COURIER' | 'STORE_PICKUP';
    isInterState?: boolean;
    items?: Array<{
      productId?: string;
      productName?: string;
      quantity: number;
      unitPrice?: number;
      totalPrice?: number;
      weightGrams?: number;
    }>;
    totalQuantity?: number;
    totalWeightKg?: number;
  }) =>
    fetchApi<ShippingTaxCalculationResult>('/shipping-gst/calculate', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  listProductShippingSettings: () =>
    fetchApi<any[]>('/shipping-gst/products'),
  updateProductShippingSettings: (productId: string, data: any) =>
    fetchApi<any>(`/shipping-gst/products/${productId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  batchUpdateCategoryShippingSettings: (data: {
    categoryId?: string;
    productIds?: string[];
    shippingChargeType?: string;
    unitWeightGrams?: number;
    courierCharge?: number;
    perAdditionalQtyRate?: number;
    freeShippingThreshold?: number;
    quantityCourierSlabs?: Array<{ minQty: number; maxQty?: number; charge: number }>;
  }) =>
    fetchApi<{ updatedCount: number; message: string }>('/shipping-gst/products/batch', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  getInvoice: (idOrNumber: string) =>
    fetchApi<any>(`/invoices/${idOrNumber}`),

  // ==========================================
  // PERSONALIZATION TEMPLATES API
  // ==========================================
  adminListPersonalizationTemplates: (params?: { search?: string; category?: string; isActive?: boolean }) => {
    const q = new URLSearchParams();
    if (params?.search) q.set('search', params.search);
    if (params?.category) q.set('category', params.category);
    if (params?.isActive !== undefined) q.set('isActive', String(params.isActive));
    const qs = q.toString();
    return fetchApi<PersonalizationTemplate[]>(`/admin/personalization-templates${qs ? `?${qs}` : ''}`);
  },
  adminGetPersonalizationTemplate: (id: string) =>
    fetchApi<PersonalizationTemplate>(`/admin/personalization-templates/${id}`),
  adminCreatePersonalizationTemplate: (data: Partial<PersonalizationTemplate>) =>
    fetchApi<PersonalizationTemplate>('/admin/personalization-templates', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  adminUpdatePersonalizationTemplate: (id: string, data: Partial<PersonalizationTemplate>) =>
    fetchApi<PersonalizationTemplate>(`/admin/personalization-templates/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  adminDeletePersonalizationTemplate: (id: string) =>
    fetchApi<{ success: boolean; message: string }>(`/admin/personalization-templates/${id}`, {
      method: 'DELETE',
    }),
  adminDuplicatePersonalizationTemplate: (id: string, newName?: string) =>
    fetchApi<PersonalizationTemplate>(`/admin/personalization-templates/${id}/duplicate`, {
      method: 'POST',
      body: JSON.stringify({ name: newName }),
    }),
  getPublicPersonalizationTemplate: (id: string) =>
    fetchApi<PersonalizationTemplate>(`/catalogue/personalization-templates/${id}`),
  validatePersonalizationPayload: (
    id: string,
    quantity: number,
    payload: PersonalizationPayload,
    productConfigOverride?: any,
  ) =>
    fetchApi<{ isValid: boolean; errors: string[]; sanitized: any }>(
      `/catalogue/personalization-templates/${id}/validate`,
      {
        method: 'POST',
        body: JSON.stringify({ quantity, payload, productConfigOverride }),
      },
    ),
  getItemPersonalizationRecords: (orderId: string, itemId: string) =>
    fetchApi<{
      orderId: string;
      itemId: string;
      productName: string;
      sku: string;
      quantity: number;
      personalizationData: any;
      records: OrderItemPersonalizationRecord[];
    }>(`/admin/orders/${orderId}/items/${itemId}/personalization/records`),
};

// Types for Personalization System
export type PersonalizationInputType =
  | 'TEXT'
  | 'TEXTAREA'
  | 'NUMBER'
  | 'DATE'
  | 'EMAIL'
  | 'PHONE'
  | 'SELECT';

export type PersonalizationScope = 'PER_ORDER' | 'PER_ITEM';

export interface PersonalizationValidationRules {
  minLength?: number;
  maxLength?: number;
  minValue?: number;
  maxValue?: number;
  pattern?: string;
  allowedExtensions?: string[];
  customMessage?: string;
}

export interface PersonalizationField {
  id?: string;
  templateId?: string;
  name: string;
  code: string;
  inputType: PersonalizationInputType;
  scope: PersonalizationScope;
  isRequired: boolean;
  placeholder?: string | null;
  helperText?: string | null;
  defaultValue?: string | null;
  validationRules?: PersonalizationValidationRules | null;
  options?: Array<{ label: string; value: string }> | null;
  sortOrder?: number;
}

export interface PersonalizationTemplate {
  id: string;
  name: string;
  code: string;
  description?: string | null;
  category?: string | null;
  isActive: boolean;
  fields: PersonalizationField[];
  createdAt: string;
  updatedAt: string;
}

export interface PersonalizationItemEntry {
  itemIndex: number;
  variantCombination?: Record<string, string>;
  values: Record<string, any>;
}

export interface PersonalizationPayload {
  templateId: string;
  templateCode?: string;
  sharedValues: Record<string, any>;
  perItemEntries: PersonalizationItemEntry[];
}

export interface OrderItemPersonalizationRecord {
  id: string;
  orderItemId: string;
  itemIndex: number;
  variantCombination?: Record<string, string> | null;
  fieldValues: Record<string, any>;
  sharedValues?: Record<string, any> | null;
  status: string;
  createdAt: string;
}

