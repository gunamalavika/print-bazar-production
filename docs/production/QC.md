# Quality Control Gates (Pre-Production & Final QC)

## 1. Pre-Production QC Gate (Technical Release)
Mandatory 12-point release checklist evaluated before Job Card dispatch:
1. `ARTWORK_VERSION_LOCKED`: Exact approved artwork version attached.
2. `CUSTOMER_SIGN_OFF`: Customer explicit approval recorded.
3. `RESOLUTION_CHECK`: Minimum 300 DPI for print, vector for spot/cut lines.
4. `COLOR_MODE`: CMYK / Pantone spot verified, no RGB artifacts.
5. `BLEED_SAFE_MARGIN`: Minimum 3mm bleed, 4mm safe margin verified.
6. `FINISHED_SIZE`: Exact finished millimetre dimensions matched to SKU specs.
7. `QUANTITY_CHECK`: Verified batch quantity matches customer order.
8. `PAPER_GSM`: Paper stock / substrate verified against inventory stock.
9. `PRINT_SIDE`: Single-sided (4+0) or Double-sided (4+4) match.
10. `LAMINATION_COATING`: Thermal Matt, Gloss, Velvet, or None specified.
11. `SPECIAL_FINISHING`: Spot UV, Foil Stamping, Embossing, Die-line confirmed.
12. `OPERATOR_NOTES`: Any customer or prepress remarks captured.

Result:
- **ALL PASS**: Releases Job Card to `PRODUCTION_QUEUE`.
- **ANY FAIL**: Locks Job Card, creates Prepress Alert, blocks production floor.

---

## 2. Final QC Gate (Physical Output Inspection)
Executed at inspection station after finishing:
- Inspection Criteria: Color consistency against contract proof, Registration accuracy, Cutting accuracy, Folding alignment, Surface defects (scratches/smudges), Quantity count.
- **PASS**: Automatically creates packing task and transitions order to `PACKING`.
- **FAIL**: Inspector classifies defect code (e.g., `MISREGISTRATION`, `COLOR_MISMATCH`, `SCRATCH`, `SHORT_COUNT`), specifies rework units, and re-routes to `REWORK` queue while blocking packing.
