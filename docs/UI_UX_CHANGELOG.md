# V Foods UI/UX Changelog

All changes on branch `ui-ux-modernization` are strictly frontend UI/UX enhancements. No database schema, RLS, storage policies, backend code, payments, wallet logic, webhooks, order-number logic, POS logic, push sending, or authentication are altered.

---

## Entries

### 1. Design System
- **Area**: Design System
- **Commit**: `UI: design system`
- **Files Modified/Created**:
  - `frontend/src/index.css`: Replaced legacy dark orange theme with canonical tokens (Royal Blue `#1E40AF`, Emerald `#059669`, Dark Slate `#0F172A`, Light Gray `#F8FAFC`, White `#FFFFFF`), radius scale (`sm` to `xl`), soft shadow system, 4px spacing scale, type scale, and motion bounds.
  - `frontend/tailwind.config.js`: Integrated canonical color scale, typography, and box shadow tokens.
  - `frontend/src/lib/motion.js`: Enforced strict 150ms-250ms motion duration boundaries for state changes with reduced-motion respect.
  - `frontend/src/components/ui/input.jsx`: Built accessible shared Input primitive.
  - `frontend/src/components/ui/badge.jsx`: Built shared Badge component with semantic color variants.
  - `frontend/src/components/ui/error-state.jsx`: Built shared ErrorState component with Lucide icon and retry action.
  - `frontend/src/components/ui/page-header.jsx`: Built shared PageHeader with title, description, and action slot.
  - `frontend/src/components/ui/form-field.jsx`: Built accessible FormField wrapper with label, error, and hint.
  - `frontend/src/components/ui/confirmation-dialog.jsx`: Built Radix-backed ConfirmationDialog.
  - `docs/DESIGN_SYSTEM.md`: Full specification of tokens, palette, and component rules.
- **Previous Behavior**: Discordant dark theme in `index.css` (`#040407` with orange gradient buttons) clashing with light navy theme in `styles.css`. Missing standard shared primitives (Input, Badge, ErrorState, PageHeader, FormField, ConfirmationDialog).
- **New Behavior**: Single source of truth for design tokens matching V Foods identity. Standardized typography, radii, soft shadows, and motion timings.
- **Rollback Scope**: Reverting commit `UI: design system` restores previous `index.css`, `tailwind.config.js`, and removes added UI primitives without impacting any backend or business logic.

