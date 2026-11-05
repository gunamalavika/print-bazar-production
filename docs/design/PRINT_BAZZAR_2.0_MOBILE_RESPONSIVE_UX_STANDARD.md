# PRINT BAZZAR 2.0 — Mobile-First Responsive UX & Native-App-Like Experience

**Project:** PRINT BAZZAR 2.0  
**Purpose:** Implementation standard for a polished, mobile-first experience that feels familiar and app-like on phones while remaining a responsive web application.  
**Applies to:** Storefront, customer account, product configurator, cart, checkout, tracking, authentication, and all ERP modules used on mobile.

---

## 1. Objective

Implement a mobile-first responsive experience across the existing PRINT BAZZAR 2.0 application. On smartphones, the UI should feel like a carefully designed native app: fast, touch-friendly, focused, predictable, and easy to navigate.

This remains a Next.js web application unless the project already has a separately approved native-app implementation. Do not claim that responsive styling alone turns the site into a native app. Do not rewrite the application in React Native or introduce a new framework as part of this task.

Read and follow the project's existing design standard:

`docs/design/PRINT_BAZZAR_2.0_UI_UX_DESIGN_SYSTEM.md`

Keep its brand palette and typography:
- Yellow: `#FFED00`
- Black: `#000000`
- White: `#FFFFFF`
- Primary font: Inter

Supporting neutral and semantic colors must follow the existing design-system document.

## 2. Audit Before Implementation

Before changing code:

1. Inspect the current repository structure and locate the actual Next.js frontend.
2. Read the existing UI/UX design-system document.
3. Review root layouts, global CSS, Tailwind configuration, shared UI components, storefront shell, ERP shell, navigation, forms, tables, modals, and route-specific responsive styles.
4. Identify existing breakpoints and layout behavior.
5. Run available baseline TypeScript, lint, build, and test commands.
6. Record existing issues so they are not mistakenly attributed to the mobile work.

Do not assume every route or component named in documentation exists. Discover routes from the actual source.

## 3. Responsive Design Principles

Use a mobile-first approach: define the narrow-screen experience first, then progressively enhance tablet and desktop layouts.

### Suggested breakpoints

Use the project's existing breakpoint system if it is consistent. Otherwise, establish and document a small, consistent set:

| Name | Width | Typical behavior |
|---|---:|---|
| Small phone | 320–374px | Single column, compact spacing, no clipped controls |
| Phone | 375–767px | Mobile navigation, stacked forms, touch-first interactions |
| Tablet | 768–1023px | Flexible two-column layouts where useful |
| Desktop | 1024–1279px | Full navigation and multi-column layouts |
| Wide desktop | 1280px+ | Wider content, controlled maximum widths |

Do not add arbitrary one-off breakpoints for individual pages unless a documented layout requirement demands it.

## 4. Native-App-Like Mobile Shell

Create or refine the responsive application shell using shared components.

### 4.1 Navigation

- Replace wide desktop navigation with a compact mobile header.
- Keep the brand/logo, current context, and essential actions visible without crowding.
- Use a clear mobile menu or role-appropriate bottom navigation.
- Consider a bottom navigation bar for frequent customer destinations such as Home, Products, Orders, and Account.
- Use role-appropriate navigation for ERP staff; do not expose all modules in a crowded bottom bar.
- Provide a compact “More” or menu surface for secondary destinations.
- Highlight the current route with a clear indicator and accessible text.
- Preserve all existing route paths, authentication rules, and RBAC permissions.
- Avoid rendering desktop and mobile navigation in a way that causes duplicate focusable controls or duplicated API calls.
- Ensure menus close appropriately after navigation and remain keyboard accessible.

### 4.2 Safe areas and device edges

- Respect `env(safe-area-inset-top)` and `env(safe-area-inset-bottom)` where fixed elements are used.
- Prevent fixed headers, bottom navigation, floating actions, and sticky checkout bars from covering page content.
- Include sufficient bottom content padding when bottom navigation is present.
- Avoid fixed-height layouts that fail when the mobile keyboard opens.

### 4.3 App-like visual behavior

- Use consistent page transitions only if already supported and useful; avoid distracting animations.
- Use clear active, pressed, loading, disabled, and success states.
- Keep content surfaces, card radii, typography, and spacing consistent with the global design system.
- Prefer immediate, clear feedback to elaborate motion.
- Respect `prefers-reduced-motion`.
- Do not use fake mobile status bars or device frames in the actual application UI.

## 5. Touch Targets and Interaction

- Aim for a minimum touch target of 44 × 44 CSS pixels for primary mobile interactions.
- Maintain sufficient spacing between adjacent icon buttons and destructive actions.
- Do not use hover as the only way to reveal essential functionality.
- Use clear labels for icon-only controls and accessible names for assistive technology.
- Make important actions reachable with one hand where practical.
- Avoid tiny close icons, cramped filter chips, and dense desktop-style action menus on phones.
- Confirm destructive actions and prevent accidental double submission.
- Show progress and prevent duplicate submission while a request is in progress.

## 6. Typography and Readability

Use Inter and the established typography scale from the global design-system document. Apply mobile adjustments consistently:

| Element | Mobile guideline |
|---|---|
| Page title | 20–24px, weight 600 |
| Section title | 17–18px, weight 600 |
| Card title | 15–16px, weight 600 |
| Body text | 14–16px, weight 400 |
| Form label | 13–14px, weight 500 |
| Helper text | 12–13px, readable contrast |
| Button label | 14–16px, weight 500 |
| Table data | 13px minimum where practical |

- Avoid oversized hero headings on small phones.
- Use readable line heights and sensible text wrapping.
- Do not shrink the entire UI using `transform: scale()` or viewport-based hacks.
- Prevent labels, prices, order IDs, and button text from overlapping or clipping.
- Support browser text zoom and larger accessibility text settings where possible.

## 7. Layout, Cards, and Spacing

- Use single-column layouts by default on narrow screens.
- Switch to two columns only when the content remains readable and controls remain usable.
- Use consistent page gutters, generally 16px on phones, with careful adaptation for very narrow widths.
- Use 12–16px card padding on phones and the desktop design-system padding at larger widths.
- Stack page-header actions below the title when there is insufficient width.
- Avoid horizontal page overflow.
- Use responsive grid layouts and flexible widths; avoid hardcoded desktop pixel widths.
- Keep key information and the primary action near the top when the workflow benefits from it.
- Avoid excessive nested cards and unnecessary vertical whitespace.

## 8. Storefront Mobile Experience

### 8.1 Homepage and catalog

- Use a compact mobile header with clear search and cart access.
- Reflow the hero into a readable text-and-image sequence; do not compress a desktop two-column hero into unreadable columns.
- Keep the primary CTA visible without overwhelming the screen.
- Use a two-column product grid when cards remain readable; use one column when product content requires more room.
- Keep image ratios consistent and use optimized responsive images.
- Make category navigation horizontally scrollable only within its own container, with clear affordances and no page-level overflow.
- Keep filters accessible through a mobile filter drawer or bottom sheet when suitable.
- Preserve search, sorting, filtering, pagination, and product links.

### 8.2 Product details and configurator

- Present product imagery, product name, starting price, and key details in a clear order.
- Use a vertical, step-based configurator on mobile when the desktop layout is too wide.
- Keep the current step and progress visible.
- Make dimensions, quantities, paper/substrate choices, finishing options, and price updates easy to use with touch.
- Use numeric keyboards for numeric inputs where appropriate.
- Place the primary Continue/Customize action predictably.
- If a sticky price/action bar is used, ensure it does not cover inputs, validation errors, or navigation.
- Preserve pricing formulas, validation rules, and existing configurator state.

### 8.3 Cart and checkout

- Stack cart items and totals vertically on narrow screens.
- Keep quantity controls and remove actions touch-friendly.
- Show order subtotal, taxes, shipping, discounts, and total clearly where applicable.
- Use a logical single-column checkout form with clear step progression.
- Preserve authentication, address selection, GST fields, payment integrations, and order creation.
- Prevent the mobile keyboard from obscuring the active field or submit button.
- Avoid duplicating payment submissions when users tap repeatedly.
- Make errors appear next to the relevant fields and preserve entered data.

### 8.4 Account, orders, proof approval, and tracking

- Use mobile-friendly order cards or a responsive table alternative.
- Prioritize order number, status, total, date, and next action.
- Provide touch-friendly tabs and filters.
- Make proof review, zoom, approve, and reject actions usable on a phone.
- Render tracking as a vertical timeline on small screens.
- Keep invoice viewing and downloading usable without requiring a wide desktop layout.

## 9. ERP and Staff Mobile Experience

ERP screens are operational tools. Make them touch-friendly without hiding critical information or compromising role permissions.

### 9.1 Dashboard and lists

- Reflow KPI cards into one or two columns according to available width.
- Use compact, readable metric cards and avoid desktop-only chart widths.
- Convert dense tables to labelled cards or carefully prioritized responsive tables where appropriate.
- Preserve sorting, filters, pagination, row actions, and status visibility.
- Keep search and primary list actions easy to reach.

### 9.2 Production Kanban

- Preserve the existing stage and transition rules.
- On phones, use horizontally scrollable Kanban columns within a contained board region, or a stage-selector/list presentation if that is more usable.
- Keep horizontal scrolling inside the board, not on the entire page.
- Make job cards easy to tap and show essential information: order/job ID, product, stage, owner, due date, and blocker/status.
- Do not rely exclusively on drag-and-drop. Provide accessible move/change-stage actions for touch, keyboard, and assistive technology.
- Preserve server-side validation, authorization, concurrency handling, and audit trails for status changes.

### 9.3 QC, finance, packing, and dispatch

- Provide large, clear inspection and action controls.
- Make hold reasons, inspection outcomes, and confirmation dialogs usable on phones.
- Keep financial amounts, payment status, outstanding balance, and invoice actions clearly labelled.
- Make barcode scanning workflows compatible with supported device cameras or existing scanner hardware; do not claim scanner support without testing it.
- Provide a manual input fallback when a scanner is unavailable.
- Keep carton, parcel, and dispatch data readable.
- Preserve payment-clearance gates and all existing transition rules.

### 9.4 Role-specific navigation

- Show only navigation items authorized for the current role, consistent with the existing RBAC implementation.
- Use a compact drawer or role-appropriate mobile navigation.
- Do not place every ERP module into a crowded bottom navigation bar.
- Enforce authorization in the backend and route guards; hiding a menu item is not a security control.

## 10. Forms, Tables, Filters, and Sheets

- Use full-width form controls on phones unless side-by-side fields remain comfortable.
- Group related inputs into clear sections.
- Use bottom sheets or full-screen dialogs for complex mobile filters and configuration tasks when appropriate.
- Keep table column priorities deliberate. Do not simply shrink all columns until text becomes unreadable.
- Provide a clear way to view secondary information and row actions.
- Ensure dialogs fit within the visible viewport and account for the on-screen keyboard.
- Prevent background scrolling when a modal requires it, and restore focus correctly when it closes.

## 11. Performance and Loading UX

- Use responsive image sizes and existing Next.js image optimization where applicable.
- Avoid unnecessary client-side rendering or duplicate API requests when adding mobile layouts.
- Do not mount separate desktop and mobile copies of complex pages if this duplicates state, subscriptions, or network requests.
- Keep skeletons close to final layout dimensions to reduce layout shifts.
- Provide retryable error states and useful empty states.
- Preserve Socket.IO or other real-time subscriptions without subscribing twice due to responsive rendering.
- Test scrolling and interactions on a real device or browser device emulation.

## 12. PWA Considerations — Optional, Only If Appropriate

A responsive site can feel app-like without being a PWA. If the project already uses a PWA setup, audit it before changing anything.

Do not add service workers, offline caching, installation prompts, push notifications, or manifest behavior automatically as part of responsive styling.

If PWA support is separately approved, implement and verify:
- Web app manifest with correct name, icons, theme color, and display mode
- HTTPS requirements and service-worker lifecycle
- Safe caching rules that do not expose private customer, order, finance, or staff data
- Update handling and offline messaging
- Installability and launch behavior on supported browsers

Do not cache authenticated or sensitive API responses indiscriminately. Offline actions must not pretend that a server-side order, payment, QC approval, or status transition succeeded before confirmation from the backend.

## 13. Implementation Rules

- Preserve the existing Next.js App Router, TypeScript, Tailwind, and UI library choices.
- Reuse the global design-system tokens and shared components.
- Use semantic HTML and accessible controls.
- Do not add a new component library without a clear need.
- Do not replace real data with mock data.
- Do not remove business rules, API calls, RBAC checks, validation, or audit events.
- Do not rewrite the project in React Native.
- Avoid broad CSS overrides and arbitrary per-page breakpoints.
- Make changes incrementally and test after each logical group of changes.

## 14. Verification Checklist

- [ ] Reviewed the global design-system document and actual frontend source.
- [ ] Tested widths around 320px, 375px, 390px, 768px, 1024px, and desktop sizes.
- [ ] No unintended horizontal page overflow.
- [ ] Mobile navigation is clear, accessible, and role-appropriate.
- [ ] Fixed headers and bottom bars do not cover content.
- [ ] Touch targets are comfortably usable.
- [ ] Storefront search, filters, product configurator, cart, and checkout work.
- [ ] Customer order history, proof approval, tracking, and invoice screens work.
- [ ] ERP lists, Kanban, QC, finance, packing, and dispatch are usable on mobile.
- [ ] Drag-and-drop has an accessible alternative where used.
- [ ] Keyboard focus, modal behavior, field validation, and loading states work.
- [ ] No duplicated API calls or real-time subscriptions were introduced.
- [ ] RBAC and backend workflow rules remain enforced.
- [ ] TypeScript, lint, build, and available tests pass or pre-existing failures are documented.
- [ ] Screenshots or a route-by-route visual review are recorded where available.

## 15. Required Final Report

Report:
1. Mobile issues found before implementation.
2. Files and shared components changed.
3. Routes tested at mobile, tablet, and desktop widths.
4. Navigation and touch-interaction changes.
5. Storefront and ERP workflows verified.
6. TypeScript, lint, build, and test results.
7. Any remaining issues or device-specific behavior that could not be verified.
8. Whether PWA support already existed; do not claim it was added unless it was actually implemented and tested.

## Definition of Done

The application should feel app-like on a phone through clear navigation, touch-friendly controls, responsive layouts, readable typography, useful feedback, and predictable interactions—while remaining a web app, preserving the existing yellow/black/white brand system, and keeping all business logic, permissions, and transaction safeguards intact.
