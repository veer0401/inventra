# Inventra Frontend Design Audit & F1–F3 Migration Plan
**Document Version:** 1.0 (Phase F3.5 Architecture Baseline)
**Scope:** Design System Refactor & Inconsistency Resolution across Phases F1, F2, and F3

---

## 1. Comprehensive Design Audit (Categories A through U)

| # | Category | Current Inconsistency / Behavior | Desired Target Behavior | Reason for Change | Affected Components / Pages | Proposed Token & Component Solution |
| :- | :--- | :--- | :--- | :--- | :--- | :--- |
| **A** | **Color** | Raw Tailwind classes (`text-teal-400`, `bg-slate-950`, `border-slate-850`) hardcoded across pages. | All components consume semantic CSS variables (`var(--primary)`, `var(--bg-surface)`). | Prevents hardcoded color fragmentation; enables theme presets and light/dark switching. | `ProductTable`, `AppShell`, `TopBar`, `Sidebar`, `DashboardPage`, `ProductForm` | Replace raw color utilities with semantic tokens (`bg-surface`, `text-primary`, `border-subtle`). |
| **B** | **Typography** | Font sizes jump between `text-[10px]`, `text-[11px]`, `text-xs`, `text-sm`, `text-base`, `text-xl`, `text-2xl` without clear roles. | Standardized semantic type scale (Display, Section, Card, Body, Caption, Monospace Data, Numeric Tabular). | Clean clinical readability and visual hierarchy for dense data. | All pages and `@inventra/ui` components | Define explicit typography utility classes (`font-heading`, `font-mono-data`, `tabular-nums`, `text-caption`). |
| **C** | **Spacing** | Mixed padding/margins (`p-2.5`, `p-3`, `p-3.5`, `p-4`, `p-6`, `p-8`) used inconsistently. | Strict 4px modular spacing scale (`space-1` through `space-8`). | Eliminates visual alignment jitter across adjacent sections. | `ProductForm`, `CategoriesPage`, `DashboardPage`, `TopBar` | Standardize card padding to `p-4` (compact) / `p-6` (comfortable); standardize toolbar gaps to `gap-3`. |
| **D** | **Border Radius**| Badges use `rounded-sm` (4px), Buttons use `rounded-md` (6px), Cards use `rounded-lg` or `rounded-xl` (12px), Auth uses `rounded-2xl` (16px). | Controlled 4-step scale (`none: 0`, `sm: 4px`, `md: 6px`, `lg: 8px`, `full: 9999px`). | Creates unified geometry across all platform elements. | `@inventra/ui/badge`, `@inventra/ui/card`, `@inventra/ui/dialog`, `AppShell` | Enforce `rounded-md` (6px) on interactive controls and `rounded-lg` (8px) on containers. |
| **E** | **Elevation / Shadow** | `shadow-xs`, `shadow-sm`, `shadow-lg`, `shadow-xl`, `shadow-modal` applied inconsistently without dark-mode support. | Subtle ambient shadows for light mode; luminous surface borders for dark mode. | Standard CSS box-shadows look harsh or invisible on dark backgrounds. | `Card`, `Dialog`, `CatalogPage`, `DashboardPage` | Use semantic elevation tokens (`--shadow-card`, `--shadow-overlay`) paired with `--border-strong`. |
| **F** | **Borders** | Border colors mixed between `border-slate-800`, `border-slate-850`, `border-slate-700`, `border-slate-200`, `border-slate-100`. | Strict 2-tier border system: `--border-subtle` (dividers) and `--border-strong` (outer strokes). | Eliminates visual noise and random border contrast levels. | `ProductTable`, `Sidebar`, `TopBar`, `ProductForm`, `CategorySelect` | Replace all hardcoded border classes with `border-subtle` and `border-strong`. |
| **G** | **Buttons** | `@inventra/ui/button` default styles are light-themed, forcing dark screens to override classes inline. | `<Button />` natively supports both light and dark themes via semantic tokens. | Removes brittle inline style overrides like `className="border-slate-700 bg-slate-900"`. | `Button.tsx`, `CatalogPage`, `ProductIdentifiersList`, `ProductDetailPage` | Refactor `Button.tsx` variant styles to use `var(--primary)`, `var(--bg-surface-muted)`, and `var(--border-strong)`. |
| **H** | **Inputs** | `@inventra/ui/input` defaults to `bg-white text-slate-900 border-slate-300`, while dark pages use `bg-slate-900 border-slate-700`. | Input controls dynamically adapt to active theme surface and contrast tokens. | Fixes white-box inputs appearing in dark pages or vice-versa. | `Input.tsx`, `Select.tsx`, `ProductSearch.tsx`, `ProductForm.tsx` | Bind input styles to `bg-surface`, `text-primary`, and `border-strong`. |
| **I** | **Tables** | `ProductTable` mixes custom table styles with hardcoded dark palette, with separate desktop/mobile markup. | Shared `<DataTable />` primitive with standardized row heights, numeric alignment, and responsive view. | Core infrastructure for F4 Inventory, F5 POS, F6 Sales, and F7 Transfers. | `ProductTable.tsx`, future Inventory/Sales tables | Create generic `@inventra/ui/table` and `@inventra/ui/data-table` primitives with built-in tabular numbers. |
| **J** | **Dialogs** | `@inventra/ui/dialog` has hardcoded `bg-white text-slate-950`, clashing with dark modal content. | `<Dialog />` uses `--bg-surface-elevated`, `--text-primary`, and `--border-strong`. | Ensures modal surfaces, inputs, and footers match application theme seamlessly. | `Dialog.tsx`, `CategoryManagementModal.tsx`, `ContextSwitcher.tsx` | Refactor `Dialog.tsx` to consume theme tokens for surface, text, close button, and footer dividers. |
| **K** | **Badges / Statuses** | Status badges implemented separately in `ProductStatusBadge`, `DashboardPage`, `OnboardingApplicationsPage`. | Unified `<StatusBadge status={...} />` component with shared domain status mapping. | Prevents conflicting color mappings for identical business states. | `ProductStatusBadge.tsx`, `Badge.tsx`, `DashboardPage.tsx` | Create centralized `StatusBadge.tsx` with typed domain mappings (`ACTIVE`, `INACTIVE`, `EXPIRED`, `PENDING`). |
| **L** | **Navigation**| Sidebar active item uses `bg-teal-500/10 text-teal-400 border-l-2 border-teal-500` with hardcoded dark classes. | Active navigation states bind to semantic tokens (`--primary`, `--bg-surface-muted`). | Navigation seamlessly reflects selected theme preset (e.g. Ocean Blue, Emerald). | `Sidebar.tsx`, `TopBar.tsx`, `Breadcrumbs.tsx` | Refactor navigation link active styles to use `var(--primary)` and theme tokens. |
| **M** | **Cards** | `@inventra/ui/card` defaults to light mode (`bg-white`), while pages use `bg-slate-950 border-slate-800`. | `<Card />` natively binds to `--bg-surface` and `--border-subtle`. | Ensures cards automatically look correct in Light, Dark, and Custom presets. | `Card.tsx`, `DashboardPage.tsx`, `ProductForm.tsx`, `ProductDetailPage.tsx` | Refactor `Card.tsx` base styles to use semantic variables. |
| **N** | **Empty States**| Empty state in `CatalogPage` is written ad-hoc with raw JSX and SVGs. | Reusable `<EmptyState />` primitive with icon, title, description, and primary CTA. | Consistent empty state UX across all tables and modules. | `CatalogPage.tsx`, `CategoryManagementModal.tsx`, future modules | Expand `@inventra/ui/empty-state.tsx` and integrate across all pages. |
| **O** | **Loading States**| Mixed use of `<RotateCw className="animate-spin" />` vs `<Skeleton />` without layout preservation. | Standardized layout-preserving content skeletons (`<TableSkeleton />`, `<CardSkeleton />`, `<FormSkeleton />`). | Eliminates layout shift (CLS = 0) and creates smooth page transitions. | `ProductTable.tsx`, `ProductDetailPage.tsx`, `CategoriesPage.tsx` | Create structured skeleton components in `@inventra/ui/skeleton`. |
| **P** | **Error States** | Error alerts vary between custom banner divs and `<Alert />` components. | Standardized `<Alert />` component supporting inline and full-page error boundaries. | Consistent RFC 9457 error and retry presentation. | `ProductForm.tsx`, `ProductEditPage.tsx`, `LoginPage.tsx` | Use unified `<Alert variant="danger" />` with structured error/retry actions. |
| **Q** | **Responsive** | Mobile layouts implemented with ad-hoc hidden/block duplicate markup in tables. | Standardized responsive data card view and responsive grid wrappers. | Reduces bundle duplication and simplifies component maintenance. | `ProductTable.tsx`, `TopBar.tsx`, `Sidebar.tsx` | Extract responsive table card wrapper into `@inventra/ui`. |
| **R** | **Accessibility**| Some icon-only buttons lack `aria-label`; focus rings vary between Indigo and Teal. | Unified focus ring token (`--border-focus`) and mandatory `aria-label` on all interactive buttons. | WCAG 2.1 AA compliance across keyboard and screen-reader users. | `ProductIdentifiersList.tsx`, `TopBar.tsx`, `ProductSearch.tsx` | Audit and enforce accessible focus-visible rings and ARIA attributes. |
| **S** | **Dark Mode** | Dark mode is currently implemented by hardcoding slate dark classes rather than a proper theming system. | First-class theme engine toggling `.dark` class and dynamic CSS variables on `<html>`. | Enables true light, dark, and user-customizable theme presets. | Entire application workspace | Implement `useThemeStore` and root CSS variable system. |
| **T** | **Motion** | Transitions use varying durations (`150ms`, `200ms`, `300ms`) without motion reduction support. | Strict motion tokens (`transition-fast: 100ms`, `transition-normal: 150ms`) with `prefers-reduced-motion`. | Respects user accessibility preferences and feels snappy. | `Dialog.tsx`, `Toast.tsx`, `Sidebar.tsx`, `Button.tsx` | Add `@media (prefers-reduced-motion)` reset to global CSS. |
| **U** | **Density** | High-density tables and standard forms use the same fixed sizing. | User-selectable density modes (`Comfortable` vs `Compact`). | Empowers high-volume pharmacy cashiers to view more rows without scrolling. | `ProductTable.tsx`, future POS & Inventory tables | Add `data-density="compact"` support in CSS variables and components. |

---

## 2. Screen-by-Screen Audit & Migration Strategy

### 1. Authentication & Onboarding Screens (`/login`, `/apply`, `/activate`)
- **Current State**: Split screen with dark left branding panel and light/dark right card container.
- **Migration**: Unify form controls (`<Input />`, `<Button />`, `<FormField />`) to use semantic tokens. Preserve clean, clinical branding on left panel.

### 2. Operational Dashboard (`/dashboard`)
- **Current State**: Hardcoded `bg-slate-950` cards and badges.
- **Migration**: Migrate metric cards, quick-action tiles, and session diagnostic cards to use `<Card />` with semantic `--bg-surface` and `--border-subtle`.

### 3. Application Shell & Navigation (`AppShell`, `TopBar`, `Sidebar`)
- **Current State**: Fixed dark slate layout with hardcoded `bg-slate-950` and `text-slate-100`.
- **Migration**: Refactor `AppShell` container to use `--bg-app`, `TopBar` and `Sidebar` to use `--bg-surface` and `--border-subtle`. Active navigation indicator dynamically reflects selected primary preset hue.

### 4. Product Master Catalog (`/catalog`)
- **Current State**: `ProductSearch`, `ProductTable`, and pagination controls use ad-hoc slate utilities.
- **Migration**: Convert `ProductTable` to use semantic table tokens with right-aligned tabular numbers for GST rates and units; convert `ProductSearch` to use `--bg-surface` and `--border-strong`.

### 5. Product Detail View (`/catalog/products/:id`)
- **Current State**: Specifications split across custom dark cards with hardcoded `bg-slate-900 border-slate-800`.
- **Migration**: Migrate to standardized `<Card />` layout with structured clinical identity, packaging, and tax sections using semantic status pills.

### 6. Product Create & Edit Forms (`/catalog/products/new`, `/catalog/products/:id/edit`)
- **Current State**: Section fieldsets use custom dark containers; discard warning uses native browser `window.confirm`.
- **Migration**: Standardize form sections with `<Card />`, use accessible form controls, replace native prompt with accessible `<ConfirmDialog />`.

### 7. Category Taxonomy Management (`/catalog/categories`, `CategoryManagementModal`)
- **Current State**: Modal has white dialog background with dark nested form components.
- **Migration**: Unify dialog surface to `--bg-surface-elevated` so category forms and list items render seamlessly in both light and dark modes.

### 8. Context Switcher & Operator Menu (`ContextSwitcher`, `UserMenu`)
- **Current State**: Dialog uses hardcoded `bg-white` with dark list items.
- **Migration**: Update modal and dropdown menus to use semantic elevation tokens (`--bg-surface-elevated`, `--border-strong`).

---

## 3. Phased Implementation Sequence (For Phase F3.5)

```
Step 1: Design Tokens Package / Root CSS Architecture
        (Create packages/design-tokens or apps/web/src/styles/tokens.css with full semantic tokens)
            ↓
Step 2: Core UI Primitives Refactor (@inventra/ui)
        (Refactor Button, Input, Select, Badge, Card, Dialog, Alert, Toast, Table, Skeleton)
            ↓
Step 3: Theme Engine & Settings Integration (useThemeStore)
        (Implement Theme Mode, Presets, Custom Color Derivation, Density Switcher in Settings)
            ↓
Step 4: Application Shell & Navigation Migration
        (Update AppShell, TopBar, Sidebar, Breadcrumbs, ContextSwitcher)
            ↓
Step 5: Catalog & Master Data Migration
        (Update CatalogPage, ProductTable, ProductForm, ProductDetailPage, CategoriesPage)
            ↓
Step 6: Auth & Admin Migration
        (Update LoginPage, ApplyPage, ActivatePage, AdminConsole)
            ↓
Step 7: Verification & Quality Gates
        (Unit tests, typecheck, lint, build, accessibility contrast audits, visual regression)
```
