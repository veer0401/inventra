# Inventra Design System Specification
**Visual Identity: Modern Clinical Operations**
**Version:** 1.0 (Phase F3.5 Architecture Baseline)
**Target Platforms:** Web (Vite/React), Desktop (Tauri/Desktop Client), Mobile (React Native/Android)

---

## 1. Executive Summary & Visual Identity

### The "Modern Clinical Operations" Philosophy
Inventra is not a generic consumer SaaS dashboard, marketing landing page, or gamified application. It is a **mission-critical operational pharmacy ERP** used in high-pressure medical environments: hospital dispensaries, retail pharmacy counters, warehouse distribution centers, and administrative headquarters.

The visual language communicates:
- **Precision & Reliability**: Absolute clarity of clinical numbers, batch lot codes, expiration alerts, and monetary transactions.
- **Cognitive Calm**: Clean slate foundations that reduce eye fatigue during 10-hour cashier and pharmacist shifts.
- **High Information Density**: Compact, scannable data layouts without excessive whitespace or decorative padding.
- **Semantic Certainty**: Colors communicate medical and business state (Rx alerts, stock levels, GST tax slabs, approval states) rather than arbitrary decoration.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                       MODERN CLINICAL OPERATIONS                        │
├────────────────────┬────────────────────┬───────────────────────────────┤
│ Clinical Teal      │ Deep Slate Navy    │ Cobalt Accent & Focus         │
│ #0F766E (Primary)  │ #0B0F17 (Dark Base)│ #4F46E5 (Interactive Focus)   │
├────────────────────┼────────────────────┼───────────────────────────────┤
│ Tabular Numbers    │ Monospace Identifiers│ Semantic Status Badges      │
│ Inter / Roboto     │ JetBrains Mono     │ Emerald / Amber / Rose / Slate│
└────────────────────┴────────────────────┴───────────────────────────────┘
```

---

## 2. Core Design Principles

1. **Information Before Decoration**: Every pixel, border, and badge must serve an operational purpose. Decorative gradients, floating 3D elements, and decorative animations are strictly prohibited.
2. **Operational Actions Must Be Obvious**: Primary actions (Billing, Adding Stock, Dispensing) must be immediately identifiable with unmistakable visual weight and keyboard accelerators (`/`, `Enter`, `Esc`).
3. **Dense Information Must Remain Readable**: Data tables and forms must support high-density workflows while maintaining crisp typography, clear row separation, and tabular numeric alignment.
4. **Color Communicates Semantic State**: Color is reserved for meaning (Success, Warning, Danger, Schedule Drug alert, Active status). Never use random colors for decorative flair.
5. **Components Must Behave Consistently**: A button, input, dialog, or table in Catalog must feel identical in POS, Inventory, and Admin.
6. **Context Must Always Be Visible**: The active business entity, store branch, and operator role must remain permanently anchored in the workspace header.
7. **Destructive Actions Require Clear Differentiation**: Dangerous operations (Voiding invoices, deleting stock, rejecting applications) must use distinct destructive styles and explicit confirmation.
8. **Loading States Must Preserve Layout**: Use structured content skeletons matching the exact geometry of the loading component to eliminate layout shifts (CLS = 0).
9. **Empty States Must Guide Action**: Empty views must explain *what happened* (e.g. "No matching products found") and *what to do next* (e.g. "Clear Search Filter" or "Create Product").
10. **Dark Mode is a First-Class Workstation**: Dark mode is not a naive color inversion. It is engineered with layered surface elevations (`#0B0F17` $\rightarrow$ `#111827` $\rightarrow$ `#1E293B`), crisp borders, and controlled contrast for low-light clinical counters.
11. **Accessibility is Non-Negotiable**: WCAG 2.1 AA / AAA standards (minimum 4.5:1 contrast for normal text, 3:1 for large text/icons, visible focus rings, non-color state indicators).
12. **Cross-Platform Continuity**: Web, Desktop, and Mobile share the identical semantic design tokens, color hierarchy, and component semantics.
13. **Strict Online/Offline Visual Clarity**: The system visually reflects connectivity state with an informative banner without disrupting active local operations.

---

## 3. Platform-Independent Token Architecture

The Inventra Design System uses a **Three-Tier Token Architecture**:

```
Tier 1: Global Primitives  (Raw scales: slate-900, teal-700, font-inter, 4px, 8px)
            ↓
Tier 2: Semantic Tokens    (Purpose-bound: bg-surface, text-primary, border-subtle)
            ↓
Tier 3: Component Tokens   (Component-bound: button-primary-bg, table-row-hover)
```

### Token Categories
1. **Color Tokens**: Background, Surface, Text, Border, Primary, Accent, Statuses (Success, Warning, Danger, Info).
2. **Typography Tokens**: Font Families, Scales (Display, Heading, Body, Caption, Mono-Data), Weights, Line Heights.
3. **Spacing Tokens**: Base 4px modular scale ($0, 1, 2, 3, 4, 6, 8, 10, 12, 16$).
4. **Border Radius Tokens**: Strict 4-level scale (`none`, `sm: 4px`, `md: 6px`, `lg: 8px`, `full: 9999px`).
5. **Elevation / Shadow Tokens**: Subtle ambient depth tokens for light mode; luminous surface borders for dark mode.
6. **Density Modes**: `Comfortable` (default web/tablet) vs `Compact` (high-throughput POS/inventory workstations).
7. **Motion Tokens**: Instantaneous micro-transitions ($100\text{ms} - 200\text{ms}$) respecting `prefers-reduced-motion`.
8. **Iconography Tokens**: Standardized stroke width ($1.75\text{px}$), bounding box ($14\text{px}, 16\text{px}, 20\text{px}, 24\text{px}$).

---

## 4. Semantic Color System

### Light Mode & Dark Mode Semantic Tokens

| Semantic Token | Light Mode (Clinical Clean) | Dark Mode (Operational Station) | Purpose & Usage |
| :--- | :--- | :--- | :--- |
| `--bg-app` | `#F8FAFC` (Slate-50) | `#0B0F17` (Deep Dark Slate) | Application canvas background |
| `--bg-surface` | `#FFFFFF` (Pure White) | `#111827` (Slate-900) | Standard card, sidebar, topbar surface |
| `--bg-surface-elevated` | `#FFFFFF` (Elevated with shadow) | `#1E293B` (Slate-800) | Dialogs, modals, popovers, dropdowns |
| `--bg-surface-muted` | `#F1F5F9` (Slate-100) | `#0F172A` (Slate-950) | Table headers, code blocks, input disabled |
| `--text-primary` | `#0F172A` (Slate-900) | `#F8FAFC` (Slate-50) | Headings, primary data, titles |
| `--text-secondary` | `#475569` (Slate-600) | `#94A3B8` (Slate-400) | Labels, descriptions, secondary values |
| `--text-muted` | `#94A3B8` (Slate-400) | `#64748B` (Slate-500) | Placeholders, inactive captions, shortcuts |
| `--text-inverse` | `#FFFFFF` | `#0F172A` | Text on primary/solid colored buttons |
| `--border-subtle` | `#E2E8F0` (Slate-200) | `#1E293B` (Slate-800) | Table rows, card dividers, subtle borders |
| `--border-strong` | `#CBD5E1` (Slate-300) | `#334155` (Slate-700) | Input borders, card outer strokes |
| `--border-focus` | `#4F46E5` (Indigo-600) | `#6366F1` (Indigo-500) | Keyboard focus ring, active field highlight |
| `--primary` | `#0F766E` (Teal-700) | `#14B8A6` (Teal-500) | Brand primary, save buttons, active pills |
| `--primary-hover` | `#115E59` (Teal-800) | `#0D9488` (Teal-600) | Primary hover state |
| `--primary-fg` | `#FFFFFF` | `#042F2E` (Deep Teal-950) | Text on primary button/badge |
| `--accent` | `#4F46E5` (Indigo-600) | `#818CF8` (Indigo-400) | Interactive accents, focused tabs, link hover |
| `--accent-hover` | `#4338CA` (Indigo-700) | `#6366F1` (Indigo-500) | Accent hover state |
| `--accent-fg` | `#FFFFFF` | `#FFFFFF` | Text on accent elements |

### Semantic Status Tokens

| Semantic Status | Light Mode Fill / Text / Border | Dark Mode Fill / Text / Border | Clinical Meaning |
| :--- | :--- | :--- | :--- |
| **Success** | `bg: #ECFDF5`, `text: #065F46`, `border: #A7F3D0` | `bg: #064E3B/40`, `text: #34D399`, `border: #065F46` | Active product, Paid bill, Stock in limit |
| **Warning** | `bg: #FFFBEB`, `text: #92400E`, `border: #FDE68A` | `bg: #78350F/40`, `text: #FBBF24`, `border: #92400E` | Near-expiry batch, Low stock, Rx required |
| **Danger** | `bg: #FFF1F2`, `text: #9F1239`, `border: #FECDD3` | `bg: #881337/40`, `text: #FB7185`, `border: #9F1239` | Expired lot, Discontinued item, Void bill |
| **Info** | `bg: #F0F9FF`, `text: #075985`, `border: #BAE6FD` | `bg: #0C4A6E/40`, `text: #38BDF8`, `border: #075985` | Session diagnostics, Sync queue pending |
| **Neutral / Muted**| `bg: #F1F5F9`, `text: #475569`, `border: #E2E8F0` | `bg: #1E293B/60`, `text: #94A3B8`, `border: #334155` | Inactive status, Draft record, Offline status |

---

## 5. Typography System

### Font Stacks
- **UI & Display Font**: `Inter`, `-apple-system`, `BlinkMacSystemFont`, `'Segoe UI'`, `Roboto`, `sans-serif`
- **Clinical & Numeric Font**: `JetBrains Mono`, `SFMono-Regular`, `Consolas`, `monospace` (enforces `font-variant-numeric: tabular-nums`)

### Type Scale & Hierarchy

| Typography Role | Size / Line Height | Weight | Tracking | Target Elements |
| :--- | :--- | :--- | :--- | :--- |
| **Display Title** | `24px (1.5rem) / 32px` | 700 (Bold) | `-0.02em` | Main page hero titles, counter totals |
| **Section Heading**| `18px (1.125rem) / 24px`| 600 (Semibold)| `-0.01em` | Card group titles, modal headers |
| **Card Title** | `14px (0.875rem) / 20px`| 600 (Semibold)| `0` | Form fieldset titles, widget headers |
| **Body (Standard)**| `13px (0.8125rem) / 18px`| 400 (Regular) | `0` | Default body copy, descriptions |
| **Body (Medium)** | `13px (0.8125rem) / 18px`| 500 (Medium) | `0` | Table row primary names, menu items |
| **Form Label** | `12px (0.75rem) / 16px` | 600 (Semibold)| `0.01em` | Input labels, metadata headers |
| **Caption / Help** | `11px (0.6875rem) / 14px`| 400 (Regular) | `0` | Helper text, error messages, timestamps |
| **Badge / Tag** | `10px (0.625rem) / 12px`| 700 (Bold) | `0.04em` | Status badges, dosage pills, role tags |
| **Data Monospace** | `12px (0.75rem) / 16px` | 500 (Medium) | `0` | Barcodes, SKUs, HSN codes, UUIDs |
| **Numeric Tabular**| `13px (0.8125rem) / 18px`| 600 (Semibold)| `0` | Prices, GST %, stock quantities |

---

## 6. Spacing, Radius & Elevation Scales

### 4px Modular Spacing Scale
- `space-0`: `0px`
- `space-1`: `4px` (tight icon gaps, badge padding)
- `space-2`: `8px` (form field spacing, button internal gaps)
- `space-3`: `12px` (input padding, compact table cell padding)
- `space-4`: `16px` (card content padding, toolbar gaps)
- `space-6`: `24px` (section gaps, modal padding)
- `space-8`: `32px` (page header margins, layout column gaps)
- `space-12`: `48px` (large layout separation)

### Border Radius Scale
- `radius-none`: `0px` (flat table rows, continuous toolbars)
- `radius-sm`: `4px` (badges, status tags, checkbox, small inputs)
- `radius-md`: `6px` (buttons, text inputs, dropdown selects)
- `radius-lg`: `8px` (cards, dialogs, modals, popovers)
- `radius-full`: `9999px` (avatar pills, circular action buttons)

### Elevation & Depth System
- **Level 0 (Flat)**: `box-shadow: none`, `border: 1px solid var(--border-subtle)` (Tables, inline cards).
- **Level 1 (Card/Surface)**: 
  - Light: `box-shadow: 0 1px 3px rgba(15, 23, 42, 0.06), 0 1px 2px rgba(15, 23, 42, 0.04)`
  - Dark: `border: 1px solid var(--border-strong)`, subtle ambient back-glow.
- **Level 2 (Elevated Popover / Dropdown)**:
  - Light: `box-shadow: 0 4px 6px -1px rgba(15, 23, 42, 0.1), 0 2px 4px -2px rgba(15, 23, 42, 0.1)`
  - Dark: `border: 1px solid var(--border-strong)`, background `#1E293B`.
- **Level 3 (Modal / Dialog / Overlay)**:
  - Light: `box-shadow: 0 20px 25px -5px rgba(15, 23, 42, 0.15), 0 8px 10px -6px rgba(15, 23, 42, 0.1)`
  - Dark: `border: 1px solid var(--border-strong)`, backdrop blur `2px`, background `#111827`.

---

## 7. Comprehensive Component Specifications

### 1. Button (`<Button />`)
- **Variants**:
  - `primary`: Solid Teal background (`--primary`), white text (`--primary-fg`), subtle shadow.
  - `secondary`: Subtle surface background (`--bg-surface-muted`), text (`--text-primary`), border (`--border-strong`).
  - `accent`: Solid Indigo background (`--accent`), white text (`--accent-fg`).
  - `destructive`: Solid Rose background (`--color-danger`), white text.
  - `outline`: Transparent background, crisp border (`--border-strong`), hover surface.
  - `ghost`: Transparent background, no border, subtle surface hover.
- **Sizes**:
  - `sm`: Height `28px` (compact), padding `0 10px`, text `11px`, gap `6px`.
  - `md`: Height `36px` (standard), padding `0 14px`, text `13px`, gap `8px`.
  - `lg`: Height `44px` (touch/counter), padding `0 20px`, text `14px`, gap `10px`.
  - `icon`: Square `28px`, `36px`, or `44px`.
- **States**: `default`, `hover`, `active` (scale `0.98`), `focus-visible` (ring 2px `--border-focus`), `disabled` (opacity `0.45`, pointer-events `none`), `loading` (shows centered `<Spinner />`, preserves width).

### 2. Form Inputs (`<Input />`, `<Select />`, `<PasswordInput />`, `<Textarea />`)
- **Dimensions**: Standard height `36px` (md) / `28px` (sm compact).
- **Background**: `--bg-surface` in light mode; `--bg-surface` (`#111827`) in dark mode.
- **Border**: `1px solid var(--border-strong)`.
- **Focus**: `ring: 2px var(--border-focus)`, `border-color: var(--border-focus)`.
- **Error State**: `border-color: var(--color-danger)`, `ring: 2px var(--color-danger)`.
- **Icons**: Left and right icon slots aligned at `10px` offset with pointer-events disabled.

### 3. Selection Controls (`<Checkbox />`, `<Radio />`, `<Switch />`)
- **Checkbox/Radio**: Size `16px x 16px`, radius `4px` (checkbox) / `9999px` (radio).
- **Checked State**: `--primary` background with white checkmark icon.
- **Focus Ring**: `2px var(--border-focus)` with `2px` offset.
- **Switch**: Width `36px`, height `20px`, toggle knob `16px` smooth slide (`150ms`).

### 4. Badges & Status Tags (`<Badge />`)
- **Variants**: `default` (teal), `success` (emerald), `warning` (amber), `destructive` (rose), `secondary` (slate), `accent` (indigo), `outline` (monochrome).
- **Typography**: `10px font-mono font-bold uppercase tracking-wider`.
- **Structure**: `inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[4px] border`.
- **Dark Mode**: Translucent background fill (`rgba(..., 0.15)`) with solid readable foreground text and matching border tint.

### 5. Dialogs & Modals (`<Dialog />`)
- **Backdrop**: `fixed inset-0 bg-slate-950/70 backdrop-blur-[2px] z-50`.
- **Container**: Max width `512px` (sm) / `640px` (md) / `896px` (lg), radius `8px`, border `1px solid var(--border-strong)`, background `--bg-surface-elevated`.
- **Header**: Title in `18px semibold text-primary`, description in `12px text-secondary`, absolute top-right close button.
- **Keyboard Traps**: `Esc` closes modal, focus trapped inside dialog, returns focus to trigger element on unmount.

### 6. Data Tables (`<ProductTable />`, `<InventoryTable />`)
- **Header Height**: `36px`, background `--bg-surface-muted`, text `10px font-bold uppercase tracking-wider text-muted`.
- **Row Height**: `44px` (comfortable) / `34px` (compact density).
- **Border**: Horizontal divider `1px solid var(--border-subtle)` (no heavy vertical grid lines).
- **Hover**: Row background transitions to `--bg-surface-muted` on hover.
- **Alignment**:
  - Text columns: Left-aligned.
  - Codes & SKUs: Left-aligned with monospace font.
  - Numbers, Stock, Currency, Tax %: **Right-aligned** with `tabular-nums`.
  - Status Badges: Center-aligned.
  - Actions: Right-aligned.
- **Mobile Fallback**: Automatically collapses from table layout to accessible stacked cards on viewport $< 768\text{px}$.

### 7. Form Fieldsets & Section Cards (`<FormField />`, `<Card />`)
- **Card**: Border `1px solid var(--border-subtle)`, background `--bg-surface`, radius `8px`.
- **Header**: Border-bottom `1px solid var(--border-subtle)`, padding `16px 20px`.
- **Labels**: `12px font-semibold text-secondary`, red asterisk (`*`) for required fields.
- **Helper & Error text**: Positioned directly below the input with smooth fade-in.

### 8. Feedback & Alerts (`<Alert />`, `<Toast />`)
- **Alert**: Full-width container with icon, title, message, and optional action buttons.
- **Toast**: Floating notification in bottom-right corner ($16\text{px}$ offset), auto-dismissing after $3000\text{ms}$ with pause on hover.

### 9. Navigation & App Shell (`<AppShell />`, `<Sidebar />`, `<TopBar />`)
- **TopBar**: Height `56px`, fixed top, border-bottom `1px solid var(--border-subtle)`, background `--bg-surface`. Contains Business/Store context pill, connectivity indicator, user profile dropdown.
- **Sidebar**: Width `240px` (desktop), collapsible on mobile/tablet, grouped navigation headers (`OVERVIEW`, `OPERATIONS`, `MANAGEMENT`, `SYSTEM`), active indicator pill (`bg-teal-500/10 text-teal-400 border-l-2 border-teal-500`).
- **Breadcrumbs**: Height `24px`, micro-navigation with chevron separators and active route bolding.

---

## 8. Status Semantics Matrix

| Business State | Semantic Key | Icon Representation | Badge Styling |
| :--- | :--- | :--- | :--- |
| **Product Active** | `ACTIVE` | `CheckCircle2` | `bg-emerald-950 text-emerald-300 border-emerald-800` |
| **Product Inactive** | `INACTIVE` | `CircleSlash` | `bg-slate-900 text-slate-400 border-slate-700` |
| **Product Discontinued**| `DISCONTINUED`| `Ban` | `bg-rose-950 text-rose-300 border-rose-800` |
| **Rx Drug Required** | `RX_REQUIRED` | `AlertCircle` | `bg-amber-950 text-amber-300 border-amber-800` |
| **Stock Normal** | `IN_STOCK` | `Check` | `bg-emerald-950 text-emerald-300 border-emerald-800` |
| **Low Stock Alert** | `LOW_STOCK` | `AlertTriangle` | `bg-amber-950 text-amber-300 border-amber-800` |
| **Out of Stock** | `OUT_OF_STOCK`| `XCircle` | `bg-rose-950 text-rose-300 border-rose-800` |
| **Batch Expired** | `EXPIRED` | `ClockAlert` | `bg-rose-950 text-rose-300 border-rose-800` |
| **Application Pending**| `PENDING_REVIEW`| `Clock` | `bg-amber-950 text-amber-300 border-amber-800` |
| **Approved / Active** | `APPROVED` | `ShieldCheck` | `bg-emerald-950 text-emerald-300 border-emerald-800` |
| **Rejected** | `REJECTED` | `ShieldAlert` | `bg-rose-950 text-rose-300 border-rose-800` |

---

## 9. Accessibility (WCAG 2.1 AA / AAA Compliance)

1. **Color Contrast Ratios**:
   - All body text and numbers achieve $\ge 4.5:1$ contrast against their immediate surface.
   - Large headings and button text achieve $\ge 7:1$ contrast.
   - Status indicators pair color with text and distinct SVG icons (never color alone).
2. **Keyboard Navigation & Focus Management**:
   - All interactive components support keyboard focus (`Tab`, `Shift+Tab`, `Space`, `Enter`).
   - Focus rings use high-visibility 2px outline with 2px offset (`var(--border-focus)`).
   - Global shortcuts: `/` to focus search, `Esc` to close dialogs / clear search.
3. **Screen Readers & ARIA**:
   - Form controls have matching `htmlFor` $\leftrightarrow$ `id` associations.
   - Dialogs define `role="dialog"`, `aria-modal="true"`, `aria-labelledby`, and `aria-describedby`.
   - Data tables use semantic `<table>`, `<thead>`, `<tbody>`, `<th scope="col">`, and `<td aria-label>`.
4. **Motion Accessibility**:
   - All CSS transitions respect `@media (prefers-reduced-motion: reduce)` by reducing animation duration to `0.01ms`.

---

## 10. Density Modes

| Density Mode | Table Row Height | Button Height | Input Height | Padding Scale | Use Case |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Comfortable** (Default)| `44px` | `36px` | `36px` | `space-4 (16px)` | Standard desktop & tablet review |
| **Compact** | `32px` | `28px` | `28px` | `space-2 (8px)` | High-throughput POS & warehouse picking |
