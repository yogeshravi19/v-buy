# V Foods — Fix & Verify Changelog

This changelog records every verified fix, root cause analysis, affected source files, and subsequent Playwright verification steps.

---

### [FIX-001] Super Admin Force Close Confirmation Prompt (Destructive Action Safety)
- **Defect Description**: Clicking "Force Close" on an outlet immediately toggled status without confirmation, violating safety rules for destructive shop closures.
- **Root Cause**: `SuperAdminDashboard.tsx` had an inline handler toggling `is_active` directly on click.
- **Files Changed**: [SuperAdminDashboard.tsx](file:///e:/v-buy/frontend/src/pages/admin/SuperAdminDashboard.tsx#L85-L95)
- **Implementation**: Added a browser confirmation dialog naming the specific outlet: `Are you sure you want to force CLOSE "${outlet.name}"? Students will not be able to place new orders from this outlet.`
- **Playwright Test**: `verify_all_fixes.mjs` intercepted page dialog and asserted that the outlet name was present.
- **Result**: `PASS` (`[Super Admin Dialog Intercepted]: Are you sure you want to force CLOSE "Aavin Centre"?`).

---

### [FIX-002] MenuAuditLogModal Missing Escape Key Handler & Accessibility Attributes
- **Defect Description**: Pressing Escape did not close the audit modal, and the close button lacked an explicit accessible label and touch target sizing.
- **Root Cause**: Modal relied solely on backdrop clicks without listening to `keydown` events.
- **Files Changed**: [MenuAuditLogModal.tsx](file:///e:/v-buy/frontend/src/components/forms/MenuAuditLogModal.tsx)
- **Implementation**: Added `useEffect` keydown listener for `Escape`, background scroll lock on `document.body.style.overflow = 'hidden'`, and `aria-label="Close audit log"` with `.saas-modal-close` touch target.
- **Playwright Test**: `verify_all_fixes.mjs` pressed `Escape` and asserted visibility became `false`.
- **Result**: `PASS`.

---

### [FIX-003] PilotRoadmapModal / WaitlistModal Missing Escape Handler
- **Defect Description**: The campus pilot roadmap waitlist modal could not be dismissed using the keyboard Escape key.
- **Root Cause**: `PilotRoadmapModal.tsx` lacked an Escape key listener and body overflow lock.
- **Files Changed**: [PilotRoadmapModal.tsx](file:///e:/v-buy/frontend/src/pages/landing/PilotRoadmapModal.tsx)
- **Implementation**: Added keyboard listener for `Escape` and background scroll locking.
- **Playwright Test**: `verify_all_fixes.mjs` opened `/welcome`, clicked "Join Pilot Waitlist", pressed `Escape`, and asserted body overflow restored to visible.
- **Result**: `PASS`.

---

### [FIX-004] SuperAdminAuditDetailsModal Text Contrast (WCAG 2.1 AA)
- **Defect Description**: Category text `#0284C7` on white had a contrast ratio of 3.8:1, failing WCAG 2.1 AA (minimum 4.5:1).
- **Root Cause**: Subtitle color was set to lighter sky blue.
- **Files Changed**: [SuperAdminDashboard.tsx](file:///e:/v-buy/frontend/src/pages/admin/SuperAdminDashboard.tsx#L1825-L1835)
- **Implementation**: Updated text color from `#0284C7` to `#0369A1` (contrast ratio 5.1:1).
- **Playwright Test**: Axe-core WCAG 2.1 AA scan ran in `verify_all_fixes.mjs`.
- **Result**: `PASS` (0 contrast violations).

---

### [FIX-005] Shop Admin Staff Member Registration Persistence Across Page Reload
- **Defect Description**: Adding a new staff member only updated React state in memory; refreshing the page wiped the staff member.
- **Root Cause**: `staffList` was initialized with static mock data without checking local storage cache.
- **Files Changed**: [ShopAdminDashboard.tsx](file:///e:/v-buy/frontend/src/pages/shop/ShopAdminDashboard.tsx)
- **Implementation**: Added `localStorage` caching key `vfoods_staff_${activeOutletId}` on initial load, addition, and removal.
- **Playwright Test**: Added "Prakash Staff Lead", reloaded page with `page.reload()`, and asserted presence in the table.
- **Result**: `PASS` (Record survived full reload).

---

### [FIX-006] Accessible Touch Targets and Focus-Visible Rings on Modals
- **Defect Description**: Close buttons were 24x24px, violating WCAG 2.5.8 touch target standards (minimum 36px) and lacking high-contrast `:focus-visible` rings for keyboard navigators.
- **Root Cause**: Base modal CSS lacked focus outlines and generous touch padding.
- **Files Changed**: [saas_dashboard.css](file:///e:/v-buy/frontend/src/saas_dashboard.css)
- **Implementation**: Added `min-width: 36px; min-height: 36px; padding: 6px;` to `.saas-modal-close`, along with `:focus-visible` outline ring `#2563EB` and reduced motion media queries.
- **Playwright Test**: Validated keyboard focus and touch bounding box in multi-viewport suite.
- **Result**: `PASS`.

---

### [FIX-007] ItemDetailBottomSheet Multi-Viewport Reliability
- **Defect Description**: Bottom sheet needed consistent layout and interaction across mobile (390x844), tablet (768x1024), laptop (1366x768), desktop (1440x900), and ultrawide (1920x1080).
- **Root Cause**: Class name selector was missing from outer dialog container.
- **Files Changed**: [ItemDetailBottomSheet.tsx](file:///e:/v-buy/frontend/src/components/ItemDetailBottomSheet.tsx)
- **Implementation**: Added `.item-detail-sheet` class and ensured smooth drag/escape dismissal.
- **Playwright Test**: Tested across all 5 viewports with Playwright automated clicks and Escape dismissals.
- **Result**: `PASS` across all 5 screen sizes.

---

### [FIX-008] SpotlightSearch Accessibility and Contrast
- **Defect Description**: Search dialog lacked explicit ARIA attributes (`role="dialog"`, `aria-modal="true"`) and had muted labels with contrast < 4.5:1.
- **Root Cause**: Tailwind `text-slate-400` on light background.
- **Files Changed**: [SpotlightSearch.tsx](file:///e:/v-buy/frontend/src/components/SpotlightSearch.tsx)
- **Implementation**: Added accessibility attributes and darkened labels to `text-slate-600`.
- **Playwright Test**: Tested Ctrl+K shortcut, search input, and Escape dismissal.
- **Result**: `PASS`.
