# V Foods Design System Specification

Official design system and token reference for the **V Foods** campus dining platform across all four roles: **User**, **Shop Staff**, **Shop Admin**, and **Super Admin**.

---

## 1. Palette & Semantic Color Tokens

The visual foundation is anchored by a curated, accessible color palette tailored for collegiate dining environments:

| Token | Hex Value | Role / Usage |
| :--- | :--- | :--- |
| `--color-royal-blue` | `#1E40AF` | Primary Brand Color (Action buttons, active tabs, links, primary highlights) |
| `--color-royal-blue-hover` | `#1D4ED8` | Interactive Hover State |
| `--color-royal-blue-subtle`| `#EFF6FF` | Tonal badge backgrounds, selected row tint |
| `--color-royal-blue-border`| `#BFDBFE` | Subtle primary border accents |
| `--color-emerald` | `#059669` | Success, Pure Veg Indicator, Order Ready, Active Status |
| `--color-emerald-hover` | `#047857` | Interactive Success Hover |
| `--color-emerald-subtle` | `#ECFDF5` | Veg dish badge background, success pill tint |
| `--color-emerald-border` | `#A7F3D0` | Veg indicator border |
| `--color-dark-slate` | `#0F172A` | Primary text, high-contrast headings, dark sidebar shell |
| `--color-slate-secondary` | `#1E293B` | Secondary headings, card borders, active dark icons |
| `--color-slate-muted` | `#475569` | Secondary body text, table column headers (WCAG AA compliant) |
| `--color-slate-subtle` | `#64748B` | Captions, metadata, inactive icons, timestamps |
| `--color-light-gray` | `#F8FAFC` | Primary background, subtle surface fills |
| `--color-surface` | `#FFFFFF` | Cards, sheets, dialogs, dropdown surfaces |
| `--color-surface-hover` | `#F1F5F9` | Hover surface for list items and table rows |
| `--color-border` | `#E2E8F0` | Primary divider and card border |
| `--color-border-subtle` | `#CBD5E1` | Input borders, table dividers |
| `--color-danger` | `#DC2626` | Non-veg indicator, cancelled status, destructive actions |
| `--color-danger-subtle` | `#FEF2F2` | Non-veg badge background, alert banner fill |
| `--color-warning` | `#D97706` | Pending payment, low stock alerts, preparing status |
| `--color-warning-subtle` | `#FFFBEB` | Warning badge background |

---

## 2. Radius Scale

A single unified radius scale applied consistently across all UI elements:

| Token | Value | Applied To |
| :--- | :--- | :--- |
| `--radius-sm` | `6px` (`0.375rem`) | Small badges, veg/non-veg dots, nested chips |
| `--radius-md` | `10px` (`0.625rem`) | Buttons, text inputs, select triggers, table filters |
| `--radius-lg` | `14px` (`0.875rem`) | Dish image containers, compact cards, toast containers |
| `--radius-xl` | `18px` (`1.125rem`) | Primary cards, modal dialogue frames, drawer cards |
| `--radius-full`| `9999px` | Status badges, circular icon buttons, floating cart pill |

---

## 3. Elevation & Shadow Style

Soft, diffuse shadows that prevent harsh outlines and maintain contrast on both light gray and white surfaces:

- **Soft Shadow (`--shadow-soft`)**:
  `0 2px 10px -2px rgba(15, 23, 42, 0.06), 0 1px 3px -1px rgba(15, 23, 42, 0.04)`
  *Applied to*: Standard cards, floating navbars, dropdowns.
- **Elevated Shadow (`--shadow-elevated`)**:
  `0 10px 25px -4px rgba(15, 23, 42, 0.08), 0 4px 10px -2px rgba(15, 23, 42, 0.04)`
  *Applied to*: Active drag items, sticky headers, bottom sheets.
- **Modal Overlay Shadow (`--shadow-modal`)**:
  `0 20px 40px -6px rgba(15, 23, 42, 0.16)`
  *Applied to*: Centered dialog cards, confirmation prompts.

---

## 4. Spacing Scale

Based strictly on an 8-point / 4-point grid:

- `4px` (`--space-1`): Micro gaps, inline badge icons.
- `8px` (`--space-2`): Input padding, button gap, icon spacing.
- `12px` (`--space-3`): Card internal padding, list item gaps.
- `16px` (`--space-4`): Standard container padding, form field gaps.
- `20px` (`--space-5`): Modal header padding, section spacing.
- `24px` (`--space-6`): Dashboard grid gutters.
- `32px` (`--space-8`): Major layout block margins.

---

## 5. Typography Scale

- **Body Font**: `Plus Jakarta Sans`, system-ui, -apple-system, sans-serif
- **Heading Font**: `Outfit`, `Plus Jakarta Sans`, system-ui, sans-serif
- **Monospace Font**: `JetBrains Mono`, monospace (enforces `font-variant-numeric: tabular-nums`)

| Level | Size | Weight | Line Height | Usage |
| :--- | :--- | :--- | :--- | :--- |
| **Page Title** | `24px` (`1.5rem`) | `800` | `1.25` | Primary screen headers (e.g. "Campus Food Courts") |
| **Section Title** | `18px` (`1.125rem`) | `700` | `1.3` | Section headings, modal titles |
| **Card Title** | `15px` (`0.9375rem`) | `700` | `1.35` | Dish name, outlet name, stat label |
| **Body** | `14px` (`0.875rem`) | `500` | `1.5` | Standard paragraph text, form descriptions |
| **Secondary** | `13px` (`0.8125rem`) | `400` | `1.45` | Dish descriptions, helper text, muted meta |
| **Caption** | `11px` (`0.6875rem`) | `600` | `1.4` | Uppercase category labels, timestamps |
| **Price** | `15px` (`0.9375rem`) | `700` | `1` | Monospace currency figures (`₹90`) |
| **Statistic** | `26px` (`1.625rem`) | `800` | `1.1` | Dashboard metrics, live order token numbers |
| **Status** | `12px` (`0.75rem`) | `600` | `1` | Order status chips, operational badges |

---

## 6. Motion Standards

To ensure rapid, responsive interaction without disorientation:

- **Duration Window**: Strictly bounded between `150ms` and `250ms`.
  - Micro-interactions (taps, chip switches, button active scale): `150ms`.
  - Standard transitions (dialog open, tab cross-fade): `200ms`.
  - Bottom sheet reveals: `250ms` (capped).
- **Animatable Properties**: Strictly restricted to `transform` and `opacity`. Width, height, top, left, and margin are never animated.
- **Reduced Motion**: Full compliance with `@media (prefers-reduced-motion: reduce)`. When active, animations complete instantaneously (`0.01ms`).

---

## 7. Component Rules

1. **Card Hierarchy (No Card-Inside-Card)**:
   - Outer layout panels use subtle surface coloring (`#F8FAFC` or `#FFFFFF`) with dividers and spacing rather than nesting bordered `.card` containers within `.card` containers.
2. **Icons**:
   - Strictly `lucide-react`.
   - Single consistent stroke width (`1.75` or `2`).
   - Absolute zero emojis across all components, toasts, empty states, and dialogs.
3. **Touch Targets**:
   - Minimum tap target of `44px x 44px` on all mobile buttons, tabs, and quantity steppers.
