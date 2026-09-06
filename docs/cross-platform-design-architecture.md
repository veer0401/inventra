# Inventra Cross-Platform Design Architecture
**Document Version:** 1.0 (Phase F3.5 Architecture Baseline)
**Target Platforms:** Web (Vite/React), Desktop (Tauri/Desktop Client), Mobile (React Native/Android)

---

## 1. Cross-Platform Vision: "One Visual Language, Native Ergonomics"

Inventra must maintain **one unified clinical design language** across Web, Desktop, and Mobile, while respecting the ergonomic realities of each device format:

```
                          ┌─────────────────────────────┐
                          │   @inventra/design-tokens   │
                          │ (Platform-Agnostic JSON/TS) │
                          └──────────────┬──────────────┘
                                         │
                 ┌───────────────────────┼───────────────────────┐
                 │                       │                       │
                 ↓                       ↓                       ↓
     ┌───────────────────────┐ ┌───────────────────┐ ┌───────────────────────┐
     │      WEB ADAPTER      │ │  DESKTOP ADAPTER  │ │    MOBILE ADAPTER     │
     │ (CSS Vars + Tailwind) │ │(Tauri Window/Sync)│ │ (React Native Theme)  │
     └───────────┬───────────┘ └─────────┬─────────┘ └───────────┬───────────┘
                 │                       │                       │
                 ↓                       ↓                       ↓
     ┌───────────────────────┐ ┌───────────────────┐ ┌───────────────────────┐
     │  Web Browser Client   │ │ Desktop Client    │ │ Android POS/Tablet    │
     │  (Online-Only ERP)    │ │ (Offline POS/Sync)│ │ (Handheld Scanner/POS)│
     └───────────────────────┘ └───────────────────┘ └───────────────────────┘
```

---

## 2. Token Layering: What is Shared vs Platform-Specific

### A. Shared Across All Platforms (100% Platform-Neutral)
- **Token Values**: All color hex codes, RGB channels, semantic roles (`primary`, `surface`, `danger`, `text-muted`).
- **Typography Ratios**: Type scales (10px, 12px, 13px, 14px, 18px, 24px), font weights (400, 500, 600, 700), tabular number requirements.
- **Spacing Scale**: 4px modular scale (4px, 8px, 12px, 16px, 24px, 32px, 48px).
- **Radius Scale**: 4px, 6px, 8px, 9999px.
- **Status Semantics**: Meaning of `ACTIVE`, `INACTIVE`, `LOW_STOCK`, `EXPIRED`, `PENDING`.
- **Validation Rules**: Zod schemas, required fields, formatting rules.

### B. Platform-Specific Implementation Details

| Design Dimension | Web Platform (Online-Only) | Desktop Platform (Tauri/Local Offline) | Mobile Platform (Android/React Native) |
| :--- | :--- | :--- | :--- |
| **Token Adapter** | CSS Custom Properties (`var(--...)`) + Tailwind plugin | CSS Custom Properties + Tauri Titlebar Chrome | JS/TS Theme Objects (`useTheme()`) for React Native `StyleSheet` |
| **Navigation Shell** | Fixed TopBar + Persistent 240px Sidebar | Window Titlebar with Sync Health + Sidebar | Bottom Navigation Bar (`TabNavigator`) + Stack Header |
| **Primary Interaction** | Mouse click & Keyboard accelerators (`/`, `Esc`) | High-speed Barcode Scanner input & Hotkeys (`F1-F12`)| Touch targets ($\ge 48\text{px} \times 48\text{px}$) & Hardware Camera Barcode |
| **Data Tables** | High-density Paginated Data Table with Column Sort | High-density Virtualized Infinite Table (`10,000+` rows)| Collapsible Accordion Cards & Mobile Item List |
| **Modals / Dialogs** | Centered Backdrop Dialogs (`max-w-lg`) | Native Window Modals & Fixed Overlays | Full-screen Sheet / Bottom Drawer (`BottomSheet`) |
| **Connectivity UX** | Top Informative UX Banner | Local SQLite Engine + Sync Queue Counter Badge | Offline Mode Toggle + Cellular/WiFi Sync Indicator |

---

## 3. Platform Architecture Structure

```
packages/
  ├── design-tokens/             # Platform-agnostic design tokens (JSON / TS)
  │     ├── src/
  │     │    ├── primitives/     # Raw color palettes, base spacing, font weights
  │     │    ├── semantic/       # Semantic mapping (bg, surface, text, status)
  │     │    ├── themes/         # Preset definitions (clinical, ocean, dark)
  │     │    └── index.ts
  │     └── package.json
  │
  ├── ui/                        # Web & Desktop React UI Component Library
  │     ├── src/
  │     │    ├── button.tsx
  │     │    ├── input.tsx
  │     │    ├── data-table.tsx
  │     │    ├── dialog.tsx
  │     │    └── ...
  │     └── package.json
  │
  └── mobile-ui/ (Future Phase)  # React Native / Android UI Library
        ├── src/
        │    ├── Button.tsx
        │    ├── Input.tsx
        │    ├── CardList.tsx
        │    └── ...
        └── package.json
```

---

## 4. Responsive Layout Strategy

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           RESPONSIVE BREAKPOINTS                        │
├────────────────────┬────────────────────┬───────────────────────────────┤
│ Mobile (< 640px)   │ Tablet (640-1024px)│ Desktop (> 1024px)            │
├────────────────────┼────────────────────┼───────────────────────────────┤
│ • Bottom Navigation│ • Collapsible Rail │ • Persistent 240px Sidebar    │
│ • Stacked Card List│ • Adaptive 2-col   │ • Dense Data Tables (6-8 cols)│
│ • 48px Touch Target│ • 36px Controls    │ • 36px/28px Compact Controls  │
│ • Fullsheet Dialogs│ • Centered Dialogs │ • Centered Modal Overlays     │
└────────────────────┴────────────────────┴───────────────────────────────┘
```

### Desktop Layout Rules ($>1024\text{px}$)
- Persistent sidebar with grouped navigation headers.
- Multi-column clinical data tables with right-aligned numeric formatting and status badges.
- Compact toolbar headers with search debouncing and quick action buttons.

### Tablet Layout Rules ($640\text{px} - 1024\text{px}$)
- Collapsible navigation drawer triggered by TopBar hamburger icon.
- Two-column responsive form grids.
- Horizontal scroll wrappers on dense tables with sticky first column.

### Mobile Layout Rules ($<640\text{px}$)
- Bottom navigation bar for core modules (POS, Catalog, Inventory, Dashboard).
- Data tables automatically transform into stacked item cards with high-contrast text.
- Form inputs expand to 100% width with min-height $44\text{px}$ for touch ergonomics.
