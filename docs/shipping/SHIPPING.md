# Packaging, Courier Dispatch & Store Pickup Architecture

## 1. Packaging & Package Entity
- Every order can contain one or more physical parcels (`Package`: 1 of N, 2 of N, etc.).
- Packing operator scans Order/Job Card, verifies count, inputs:
  - Gross Weight (grams)
  - Box dimensions (Length x Width x Height in cm)
- System auto-generates thermal shipping label (ZPL / PDF) with parcel QR code & shipping address inherited directly from Order. Address retyping is forbidden.

## 2. Shipping Provider Abstraction
- Pluggable provider interface: `IShippingProvider`
- Providers: `MockShippingProvider` (for local development/testing), `DelhiveryShippingProvider`, `ShiprocketShippingProvider`, `BluedartShippingProvider`.
- Automatic AWB assignment, tracking URL generation, manifest creation.

## 3. Store Pickup Workflow
- In-store pickup bypasses courier booking.
- Customer receives instant "Ready for Pickup" notification with OTP / QR Code.
- Counter staff scans order barcode, verifies outstanding balance (handover blocked if balance > 0), logs collector name and phone number.
