# PRINT BAZAAR 2.0 — DETERMINISTIC SEED PRODUCTS & CONFIGURATION ACCEPTANCE

This document outlines the five realistic development and test products seeded into Print Bazaar 2.0, their option groups, conditional artwork rules, exact combination pricing matrices, safety mechanisms, and verification procedures.

---

## 1. Overview of Seed Products

Each product was designed to test a distinct configurator capability, option architecture, and pricing pattern:

| SKU | Product Name | Category | Primary Purpose / Test Pattern |
|---|---|---|---|
| `SEED-BC-001` | **Premium Business Cards** | Visiting Cards & Stationery | 5 distinct option groups, multi-group artwork rules (`design_required` + `print_location`), 4 quantity tiers (`100`, `250`, `500`, `1000`). |
| `SEED-FLY-002` | **Promotional Flyers** | Marketing Materials | Artwork condition resolution **without** a design service group; single vs double side upload slots; unpriced combinations negative testing. |
| `SEED-BRO-003` | **Tri-Fold Brochures** | Marketing Materials | Complex multi-panel spreads (`Outer Panels Spread` / `Inner Panels Spread`); scoring/fold type combinations; design brief requirement. |
| `SEED-MUG-004` | **Custom Printed Mugs** | Packaging & Promotional | Non-standard placement labels (`Mug Face Graphic`, `Left Handle Graphic`, `Right Handle Graphic`); low-volume quantity tiers (`10`, `25`, `50`, `100`). |
| `SEED-LBL-005` | **Product Labels & Stickers** | Packaging & Promotional | Contour vector die-line requirements (`custom` shape) vs standard sticker uploads; material & finish matrix pricing without unnecessary artwork splits. |

---

## 2. Detailed Product Specifications

### A. Premium Business Cards (`SEED-BC-001`)
- **SKU:** `SEED-BC-001`
- **Slug:** `seed-premium-business-cards`
- **Default Format:** 89 mm × 54 mm (Standard Visiting Card)
- **Option Groups:**
  1. `design_required`: No (`no` - default), Yes (`yes`)
  2. `print_location`: Front Only (`front` - default), Back Only (`back`), Both Sides (`both`)
  3. `paper_type`: 350 GSM Matte (`matte` - default), 350 GSM Glossy (`glossy`)
  4. `lamination`: None (`none` - default), Thermal Matte (`matte`), High Gloss (`gloss`)
  5. `cutting_style`: Standard Square Cut (`square` - default), Die-Cut Rounded (`rounded`)
- **Artwork Conditions:**
  - `design_required = no` + `print_location = front` → 1 upload slot: `Front Side` (min 2.0 MP).
  - `design_required = no` + `print_location = back` → 1 upload slot: `Back Side` (min 2.0 MP).
  - `design_required = no` + `print_location = both` → 2 upload slots: `Front Side` & `Back Side` (min 2.0 MP).
  - `design_required = yes` → PB Design Studio assistance activated, requires design brief; customer upload optional.
- **Valid Sellable Matrix Combinations:**
  - `front / matte / none / square` → Qty 100: ₹3.00 | Qty 250: ₹2.20 | Qty 500: ₹1.50 | Qty 1000: ₹1.00
  - `both / matte / none / square` → Qty 100: ₹4.00 | Qty 250: ₹3.00 | Qty 500: ₹2.20 | Qty 1000: ₹1.60
  - `both / glossy / gloss / rounded` → Qty 100: ₹5.00 | Qty 250: ₹4.00 | Qty 500: ₹3.00 | Qty 1000: ₹2.20

---

### B. Promotional Flyers (`SEED-FLY-002`)
- **SKU:** `SEED-FLY-002`
- **Slug:** `seed-promotional-flyers`
- **Default Format:** A5 (148 mm × 210 mm)
- **Option Groups:**
  1. `flyer_size`: A5 (`a5` - default), A4 (`a4`)
  2. `paper_type`: 130 GSM Gloss (`130gsm` - default), 170 GSM Silk (`170gsm`)
  3. `print_location`: Single Side Front (`front` - default), Both Sides (`both`)
  *(No Design Service group — demonstrates independent print-location artwork)*
- **Artwork Conditions:**
  - `print_location = front` → 1 upload slot: `Front Artwork File` (min 1.5 MP).
  - `print_location = both` → 2 upload slots: `Front Artwork File` & `Back Artwork File` (min 1.5 MP).
- **Valid Sellable Matrix Combinations:**
  - `a5 / 130gsm / front` → Qty 100: ₹4.50 | Qty 500: ₹3.00 | Qty 1000: ₹2.20 | Qty 5000: ₹1.40
  - `a5 / 170gsm / both` → Qty 100: ₹7.00 | Qty 500: ₹4.80 | Qty 1000: ₹3.60 | Qty 5000: ₹2.40
  - `a4 / 170gsm / both` → Qty 100: ₹11.00 | Qty 500: ₹8.00 | Qty 1000: ₹6.00 | Qty 5000: ₹4.20
  - *Unpriced Combination:* `a4 / 130gsm / front` is deliberately omitted to test rejection of unconfigured combinations.

---

### C. Tri-Fold Brochures (`SEED-BRO-003`)
- **SKU:** `SEED-BRO-003`
- **Slug:** `seed-trifold-brochures`
- **Default Format:** A4 Folded (Open 297 mm × 210 mm)
- **Option Groups:**
  1. `brochure_size`: A4 Open (`a4` - default), A3 Open (`a3`)
  2. `fold_type`: Half Fold (`half_fold`), Tri-Fold (`tri_fold` - default)
  3. `paper_type`: 170 GSM Silk (`170gsm` - default), 250 GSM Cover Board (`250gsm`)
  4. `print_location`: Both Sides (`both` - default)
  5. `design_required`: No (`no` - default), Yes (`yes`)
- **Artwork Conditions:**
  - `design_required = no` + `print_location = both` → 2 upload slots: `Outer Panels Spread` & `Inner Panels Spread`.
  - `design_required = yes` → Design brief required, design team typesetting activated.
- **Valid Sellable Matrix Combinations:**
  - `a4 / tri_fold / 170gsm / both / no` → Qty 100: ₹12.00 | Qty 250: ₹9.50 | Qty 500: ₹7.20 | Qty 1000: ₹5.50
  - `a4 / tri_fold / 250gsm / both / no` → Qty 100: ₹15.00 | Qty 250: ₹12.00 | Qty 500: ₹9.00 | Qty 1000: ₹7.00
  - `a3 / half_fold / 250gsm / both / yes` → Qty 100: ₹22.00 | Qty 250: ₹18.00 | Qty 500: ₹14.00 | Qty 1000: ₹11.00

---

### D. Custom Printed Mugs (`SEED-MUG-004`)
- **SKU:** `SEED-MUG-004`
- **Slug:** `seed-custom-printed-mugs`
- **Default Format:** 11 oz Standard Ceramic Coffee Mug
- **Option Groups:**
  1. `mug_type`: Standard Ceramic (`standard_ceramic` - default), Premium Gloss Ceramic (`premium_ceramic`)
  2. `print_location`: One Side (`one_side` - default), Both Sides (`both_sides`)
  3. `design_required`: No (`no` - default), Yes (`yes`)
- **Artwork Conditions:**
  - `print_location = one_side` + `design_required = no` → 1 upload slot: `Mug Face Graphic`.
  - `print_location = both_sides` + `design_required = no` → 2 upload slots: `Left Handle Graphic` & `Right Handle Graphic`.
  - `design_required = yes` → PB Studio Mug Mockup assistance required.
- **Valid Sellable Matrix Combinations:**
  - `standard_ceramic / one_side / no` → Qty 10: ₹180.00 | Qty 25: ₹150.00 | Qty 50: ₹120.00 | Qty 100: ₹95.00
  - `standard_ceramic / both_sides / no` → Qty 10: ₹220.00 | Qty 25: ₹180.00 | Qty 50: ₹145.00 | Qty 100: ₹115.00
  - `premium_ceramic / both_sides / no` → Qty 10: ₹280.00 | Qty 25: ₹230.00 | Qty 50: ₹190.00 | Qty 100: ₹150.00

---

### E. Product Labels & Stickers (`SEED-LBL-005`)
- **SKU:** `SEED-LBL-005`
- **Slug:** `seed-product-labels-stickers`
- **Default Format:** Custom Die-Cut Format
- **Option Groups:**
  1. `label_shape`: Circular Cut (`circle` - default), Square Cut (`square`), Custom Contour Die-Cut (`custom`)
  2. `label_size`: Small (`small`), Medium (`medium` - default), Large (`large`)
  3. `label_material`: Chromo Paper Sticker (`paper` - default), Waterproof PP Vinyl (`waterproof`)
  4. `label_finish`: High Gloss UV (`glossy` - default), Silk Matte (`matte`)
- **Artwork Conditions:**
  - `label_shape = custom` → 1 slot: `Contour Vector Die-Line & Artwork (PDF/AI)` (min 2.0 MP).
  - `label_shape != custom` → 1 slot: `Sticker Artwork File` (min 2.0 MP).
  - Material and finish do not create redundant artwork combinations.
- **Valid Sellable Matrix Combinations:**
  - `circle / small / paper / glossy` → Qty 100: ₹2.00 | Qty 500: ₹1.40 | Qty 1000: ₹0.90 | Qty 5000: ₹0.60
  - `circle / medium / waterproof / matte` → Qty 100: ₹3.50 | Qty 500: ₹2.50 | Qty 1000: ₹1.80 | Qty 5000: ₹1.20
  - `square / medium / paper / matte` → Qty 100: ₹2.80 | Qty 500: ₹1.90 | Qty 1000: ₹1.30 | Qty 5000: ₹0.85
  - `custom / large / waterproof / glossy` → Qty 100: ₹6.00 | Qty 500: ₹4.50 | Qty 1000: ₹3.20 | Qty 5000: ₹2.10

---

## 3. Seed Safety Rules

1. **Environment Protection:**
   The seed script explicitly checks `process.env.NODE_ENV`. If `NODE_ENV === 'production'`, it throws an immediate error and terminates without touching any data.
2. **Deterministic SKUs:**
   All seed products use deterministic SKUs (`SEED-BC-001` through `SEED-LBL-005`).
3. **Idempotency:**
   Rerunning the seed script upserts products and refreshes their child relations (option groups, configuration rules, and pricing matrices) without creating duplicate records.
4. **Data Isolation:**
   The seed script does NOT reset the database, does NOT truncate tables, and does NOT alter unrelated customer orders, staff users, or inventory items.

---

## 4. How to Run the Seed

From the `api` directory:

```bash
# Seed the five products
npm run seed:products

# Or run ts-node directly
npx ts-node prisma/seed-products.ts
```

Output:
```text
[SEED] Initializing 5 deterministic test products in development mode...
[SEED] ✓ Seeded Premium Business Cards (SEED-BC-001) with 5 groups and 12 matrix rows.
[SEED] ✓ Seeded Promotional Flyers (SEED-FLY-002) with 3 groups and 12 matrix rows.
[SEED] ✓ Seeded Tri-Fold Brochures (SEED-BRO-003) with 5 groups and 12 matrix rows.
[SEED] ✓ Seeded Custom Printed Mugs (SEED-MUG-004) with 3 groups and 12 matrix rows.
[SEED] ✓ Seeded Product Labels & Stickers (SEED-LBL-005) with 4 groups and 16 matrix rows.
[SEED] Successfully seeded all 5 deterministic products without affecting unrelated data.
```

---

## 5. How to Run Acceptance Verification Tests

Run the dedicated automated acceptance test suite in `api`:

```bash
npm test -- src/modules/products/seed-products.spec.ts
```

All 19 tests across all 15 acceptance criteria will execute against the live database and pricing engine.

To run the complete test suite:
```bash
npm test
```

---

## 6. How to Safely Clean Up Seed Products

To remove **only** the 5 test products and leave all other system data intact:

```bash
# Using npm script
npm run seed:products:clean

# Or using the --cleanup CLI flag
npx ts-node prisma/seed-products.ts --cleanup
```

Output:
```text
[CLEANUP] Cleaning up seed products with SKUs: [ 'SEED-BC-001', 'SEED-FLY-002', 'SEED-BRO-003', 'SEED-MUG-004', 'SEED-LBL-005' ]
[CLEANUP] Removed seed product: Premium Business Cards (SEED-BC-001)
[CLEANUP] Removed seed product: Promotional Flyers (SEED-FLY-002)
[CLEANUP] Removed seed product: Tri-Fold Brochures (SEED-BRO-003)
[CLEANUP] Removed seed product: Custom Printed Mugs (SEED-MUG-004)
[CLEANUP] Removed seed product: Product Labels & Stickers (SEED-LBL-005)
[CLEANUP] Cleaned up 5 seed products. All other records remain intact.
```
