# PRINT BAZZAR 2.0 — UI/UX Design System & Typography Standards

**Document type:** Frontend UI implementation standard  
**Project:** PRINT BAZZAR 2.0 — Customer-to-Production Operating System  
**Status:** Proposed unified standard for implementation and audit  
**Applies to:** Public storefront, customer portal, authentication, admin ERP, production, QC, finance, packing, and dispatch

---

## 1. Purpose

This document defines the shared UI/UX rules for PRINT BAZZAR 2.0. All pages should feel like one coherent product, with consistent branding, typography, spacing, components, and interaction behavior.

Use this document as the reference when auditing existing pages or implementing UI changes. Verify the current code before changing it. Do not assume that features described in documentation are already implemented.

## 2. Brand foundation

### 2.1 Core brand colors

| Token | Hex | Intended use |
|---|---|---|
| Brand yellow | `#FFED00` | Primary CTA, active indicators, selected states, key highlights |
| Brand black | `#000000` | Main headings, primary text, strong icons, high-emphasis actions |
| Brand white | `#FFFFFF` | Cards, forms, tables, dialogs, primary content surfaces |

### 2.2 Supporting UI colors

The following are supporting neutrals and semantic colors, not additional brand colors. Use them consistently and sparingly.

| Token | Hex | Intended use |
|---|---|---|
| Page background | `#F8F8F8` | Light page canvas where white cards need separation |
| Secondary text | `#525252` | Descriptions and supporting text |
| Muted text | `#737373` | Metadata and low-emphasis labels; verify contrast |
| Border | `#E5E5E5` | Card, table, input, and divider borders |
| Subtle surface | `#F5F5F5` | Hover surfaces, muted panels, disabled backgrounds |
| Success | `#166534` | Success text and status |
| Success background | `#F0FDF4` | Success badges and messages |
| Warning | `#854D0E` | Warning text and status |
| Warning background | `#FEFCE8` | Warning badges and messages |
| Error | `#B91C1C` | Error text and status |
| Error background | `#FEF2F2` | Error badges and messages |
| Info | `#075985` | Informational status text |
| Info background | `#F0F9FF` | Informational badges and messages |

**Important:** `#FFFFFF` is the valid six-digit white hex code. Do not use the invalid five-digit value `#fffff`.

### 2.3 Color usage rules

- Keep the default theme light.
- Use black text on yellow buttons and yellow highlights.
- Do not use white text on yellow backgrounds.
- Use yellow as an accent rather than filling every card, section, or navigation item.
- Use white cards with subtle borders over the light page background.
- Use semantic colors only when they communicate actual status, validation, or feedback.
- Do not introduce decorative gradients or unrelated accent colors without an approved design decision.
- Check text contrast for all text sizes and states.

## 3. Typography

### 3.1 Primary font

**Inter** is the single default font family across the storefront and ERP.

Use the same family for page titles, paragraphs, product cards, forms, navigation, tables, buttons, dashboards, modals, and toasts. A monospace fallback is permitted for technical identifiers such as SKU codes, order numbers, dimensions, and machine values.

Suggested font stack:

```css
font-family: var(--font-inter), Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
```

Load Inter through the project's existing Next.js font setup when possible. Avoid loading duplicate copies or introducing a second display family without a clear reason.

### 3.2 Typography scale

| Element | Font size | Weight | Line height | Usage |
|---|---:|---:|---:|---|
| Page title | 24px | 600 | 1.25 | Main page heading |
| Compact page title | 20px | 600 | 1.25 | Dense screens and drawers |
| Section title | 18px | 600 | 1.35 | Main content sections |
| Subsection title | 16px | 600 | 1.35 | Panels and grouped fields |
| Card title | 15px | 600 | 1.35 | Cards and Kanban items |
| Body text | 14px | 400 | 1.5 | Default application copy |
| Emphasized body | 14px | 500 | 1.5 | Important values and inline emphasis |
| Table body | 13px | 400 | 1.4 | Dense operational data |
| Table header | 12px | 600 | 1.3 | Column labels |
| Form label | 13px | 500 | 1.35 | Inputs, selects, radio groups |
| Helper / metadata | 12px | 400 | 1.4 | Hints, timestamps, secondary details |
| Button | 14px | 500 | 1.2 | Button labels |
| KPI value | 24–32px | 600 | 1.1 | Dashboard metric values |
| SKU / order ID | 12–13px | 500 | 1.4 | Monospace, tabular identifiers |

Avoid arbitrary one-off font sizes. If a genuine use case is not covered, extend the scale deliberately and document the reason.

### 3.3 Heading rules

- Use one consistent page-title component across routes.
- Keep page titles compact and avoid oversized empty header regions.
- Use sentence case unless a domain convention requires otherwise.
- Keep subtitles smaller and visually secondary.
- Do not use large marketing-style typography inside dense ERP screens.
- Do not use bold weights for every text element; preserve hierarchy.

## 4. Layout and spacing

Use a consistent spacing scale based on 4px increments.

| Token | Value | Typical use |
|---|---:|---|
| `space-1` | 4px | Icon/text gap, tiny adjustments |
| `space-2` | 8px | Compact control gaps |
| `space-3` | 12px | Related field and item spacing |
| `space-4` | 16px | Standard content gaps and card padding |
| `space-5` | 20px | Section inner spacing |
| `space-6` | 24px | Section separation |
| `space-8` | 32px | Large section separation |
| `space-10` | 40px | Occasional major separation |

### Page layout rules

- Use a consistent page container and horizontal padding at each breakpoint.
- Keep the page header compact: title, optional description, and actions should align predictably.
- Use 24px as a typical desktop separation between major sections and 16px on compact screens.
- Use 16–20px card padding for general pages; dense data panels may use 12–16px.
- Avoid excessive blank space above page titles and between dashboard widgets.
- Do not force all pages into identical layouts when their workflows differ; standardize primitives and spacing instead.
- Ensure tables and Kanban boards remain usable at common laptop resolutions.
- On small screens, stack page-header actions and allow tables/boards to use intentional horizontal scrolling or responsive alternatives.

## 5. Component standards

### 5.1 Buttons

| Variant | Appearance | Usage |
|---|---|---|
| Primary | Yellow background, black text | Main action on a page or form |
| Secondary | White background, black text, neutral border | Secondary action |
| Dark | Black background, white text | High-emphasis alternative; use sparingly |
| Outline | Transparent/white, neutral border, black text | Low-emphasis action |
| Ghost | Transparent, hover on subtle surface | Inline and icon actions |
| Destructive | Red semantic background/text | Delete or irreversible action |

- Keep button height consistent: 36–40px for standard controls; 32px for compact table actions.
- Use clear verbs such as “Create order”, “Save changes”, and “Confirm payment”.
- Provide hover, focus, active, disabled, and loading states.
- Do not communicate button meaning using color alone.

### 5.2 Cards and panels

- Use white backgrounds, a 1px neutral border, and a consistent radius of 8–12px.
- Use shadows sparingly; borders should carry most of the structure.
- Keep card headings, descriptions, actions, and content spacing consistent.
- Avoid wrapping every tiny element in its own card.

### 5.3 Forms and inputs

- Use a consistent input height of approximately 40px; compact controls may use 36px.
- Labels appear above controls and use the shared 13px medium style.
- Include visible focus states, required indicators, validation messages, and helpful instructions where needed.
- Never rely only on placeholder text as the field label.
- Preserve form values when validation errors occur where practical.
- Make disabled, read-only, invalid, and loading states visually distinct.

### 5.4 Tables

- Use 13px body text and 12px semibold column headers.
- Align numeric values consistently; use tabular numerals for prices, quantities, and totals.
- Keep row heights consistent and compact without sacrificing readability.
- Provide clear empty, loading, error, and pagination states.
- Use status badges consistently and keep long actions in a dedicated column or menu.
- On mobile, use responsive column prioritization or a labelled horizontal scroll container.

### 5.5 Status badges

- Use short, readable labels with consistent padding and radius.
- Keep status colors semantic: success, in progress/info, pending/warning, failed/error, neutral/draft.
- Avoid excessive animation. Use pulsing indicators only when live activity genuinely needs attention.
- Always include status text; color alone is insufficient.

### 5.6 Modals and drawers

- Use consistent title, body, footer, and action placement.
- Keep modal width proportional to the task; do not use oversized dialogs for simple confirmations.
- Support keyboard focus, Escape behavior where appropriate, and clear close controls.
- Confirm destructive actions and explain irreversible consequences.

### 5.7 Navigation

- Use a consistent font, icon size, row height, active state, and spacing.
- Active navigation should use a clear indicator and/or light yellow background with black text.
- Preserve role-based visibility and permission enforcement.
- Do not treat hiding a menu item as the only authorization check.

## 6. Storefront vs ERP

### Storefront

- Use more generous whitespace and product photography.
- Keep product cards consistent in image ratio, title placement, price display, and CTA position.
- Use yellow for key conversion actions such as “Customize” and “Request a quote”.
- Ensure product configurators, cart, checkout, customer account, proof approvals, and tracking follow the same typography and form rules.

### ERP and operations

- Favor compact, scannable layouts and information density.
- Use 20–24px page titles, 13px table text, and 14px body text.
- Prioritize task state, ownership, blockers, due dates, and next actions.
- Keep production Kanban, QC, finance, packing, and dispatch visually related but tailored to their specific workflows.
- Avoid excessive animation, oversized hero sections, and decorative graphics in operational workspaces.

## 7. Accessibility and responsive behavior

- Check contrast for body text, small labels, status badges, borders, and focus indicators.
- Do not use yellow with white text.
- Do not communicate status through color alone.
- Ensure keyboard focus is visible and controls have accessible names.
- Keep interactive targets usable on touch screens.
- Check layouts at mobile, tablet, laptop, and desktop widths.
- Respect reduced-motion preferences for nonessential animation.
- Avoid horizontal page overflow; if a data table or Kanban board needs horizontal scrolling, contain it within the relevant region.

## 8. Implementation guidance

Before changing styles:

1. Inspect `src/app/globals.css`, `tailwind.config.ts`, root layouts, font loading, and shared UI components.
2. Search for local hardcoded colors, font-family overrides, arbitrary text sizes, duplicate page-header implementations, and inconsistent spacing.
3. Establish the shared tokens and primitives first.
4. Migrate pages incrementally, preserving their behavior and business rules.
5. Remove obsolete overrides only after verifying that no active page depends on them.
6. Avoid broad CSS selectors that unexpectedly change form controls, icons, embedded content, or specialized workflow screens.

Likely shared areas to review include:

- `src/app/layout.tsx`
- `src/app/globals.css`
- `tailwind.config.ts`
- `src/components/ui/`
- `src/components/admin/`
- Storefront navigation and home components
- ERP page headers, tables, cards, and workflow components

Treat these as audit targets, not proof that every listed file exists in the current checkout.

## 9. Verification checklist

- [ ] Core brand tokens are centralized and reused.
- [ ] Inter is applied consistently without duplicate font loading.
- [ ] All pages use the approved typography scale or a documented exception.
- [ ] Page titles and headers have consistent sizing and compact spacing.
- [ ] Buttons, cards, forms, tables, badges, and dialogs share consistent primitives.
- [ ] Light backgrounds and text maintain sufficient contrast.
- [ ] Storefront and ERP remain visually related but suited to their different jobs.
- [ ] Responsive layouts work without unintended overflow.
- [ ] Loading, empty, error, success, disabled, and focus states are implemented consistently.
- [ ] Authentication, role permissions, API calls, and business workflows remain intact.
- [ ] TypeScript, lint, and build checks pass using the project's existing scripts.
- [ ] Actual routes have been inspected; no feature is marked verified based on documentation alone.

## 10. Required audit report

After applying the standard, report:

1. Files changed and the reason for each change.
2. Routes reviewed and the review method used.
3. UI inconsistencies found and fixed.
4. Accessibility and responsive issues found.
5. TypeScript, lint, and build results.
6. Any remaining issues or routes that could not be verified.

## Final standard

PRINT BAZZAR 2.0 should consistently use `#FFED00`, `#000000`, and `#FFFFFF` as its brand foundation, Inter as its default font, compact and predictable typography, clear neutral surfaces, and reusable UI components—without breaking existing storefront or ERP functionality.
