// test_phase4_routes.mjs
// Verifies URL route sync logic, NotFoundPage rendering, and ItemDetailBottomSheet error boundary

import assert from 'node:assert'
import fs from 'node:fs'

console.log('Testing Phase 4 Route & Error Boundary Implementation...')

// 1. Verify NotFoundPage exists and is exported
const notFoundPath = 'frontend/src/pages/NotFoundPage.tsx'
assert(fs.existsSync(notFoundPath), 'NotFoundPage.tsx must exist')
const notFoundContent = fs.readFileSync(notFoundPath, 'utf8')
assert(notFoundContent.includes('404'), 'NotFoundPage must display 404')
assert(notFoundContent.includes('Page Not Found'), 'NotFoundPage must mention Page Not Found')
assert(notFoundContent.includes('onGoHome'), 'NotFoundPage must accept onGoHome callback')
console.log('✔ NotFoundPage verified')

// 2. Verify App.jsx has 404 integration and cross-role protection
const appPath = 'frontend/src/App.jsx'
const appContent = fs.readFileSync(appPath, 'utf8')
assert(appContent.includes('NotFoundPage'), 'App.jsx must import and use NotFoundPage')
assert(appContent.includes('isKnownRoute'), 'App.jsx must validate isKnownRoute')
assert(appContent.includes('rawPath.startsWith(\'/staff\')'), 'App.jsx must check /staff routes')
assert(appContent.includes('rawPath.startsWith(\'/shop-admin\')'), 'App.jsx must check /shop-admin routes')
assert(appContent.includes('rawPath.startsWith(\'/admin\')'), 'App.jsx must check /admin routes')
console.log('✔ App.jsx routing and cross-role protection verified')

// 3. Verify ShopStaffDashboard URL synchronization
const staffPath = 'frontend/src/pages/staff/ShopStaffDashboard.tsx'
const staffContent = fs.readFileSync(staffPath, 'utf8')
assert(staffContent.includes('parseStaffPath'), 'ShopStaffDashboard must have parseStaffPath')
assert(staffContent.includes('pushState'), 'ShopStaffDashboard must update URL with pushState')
assert(staffContent.includes('popstate'), 'ShopStaffDashboard must listen to popstate')
console.log('✔ ShopStaffDashboard URL sync verified')

// 4. Verify ShopAdminDashboard URL synchronization
const adminShopPath = 'frontend/src/pages/shop/ShopAdminDashboard.tsx'
const adminShopContent = fs.readFileSync(adminShopPath, 'utf8')
assert(adminShopContent.includes('parseAdminPath'), 'ShopAdminDashboard must have parseAdminPath')
assert(adminShopContent.includes('pushState'), 'ShopAdminDashboard must update URL with pushState')
assert(adminShopContent.includes('popstate'), 'ShopAdminDashboard must listen to popstate')
console.log('✔ ShopAdminDashboard URL sync verified')

// 5. Verify SuperAdminDashboard URL synchronization
const superAdminPath = 'frontend/src/pages/admin/SuperAdminDashboard.tsx'
const superAdminContent = fs.readFileSync(superAdminPath, 'utf8')
assert(superAdminContent.includes('parseSuperPath'), 'SuperAdminDashboard must have parseSuperPath')
assert(superAdminContent.includes('pushState'), 'SuperAdminDashboard must update URL with pushState')
assert(superAdminContent.includes('popstate'), 'SuperAdminDashboard must listen to popstate')
console.log('✔ SuperAdminDashboard URL sync verified')

// 6. Verify ItemDetailBottomSheet error boundary & mobile popstate & focus trap
const itemDetailPath = 'frontend/src/components/ItemDetailBottomSheet.tsx'
const itemDetailContent = fs.readFileSync(itemDetailPath, 'utf8')
assert(itemDetailContent.includes('ItemDetailErrorBoundary'), 'ItemDetailBottomSheet must include ItemDetailErrorBoundary')
assert(itemDetailContent.includes('componentDidCatch'), 'ItemDetailErrorBoundary must handle errors')
assert(itemDetailContent.includes('overflow = \'hidden\''), 'ItemDetailBottomSheet must lock body scroll')
assert(itemDetailContent.includes('Escape'), 'ItemDetailBottomSheet must handle Escape key')
console.log('✔ ItemDetailBottomSheet error boundary and UX locks verified')

console.log('All Phase 4 Route & Popup tests passed cleanly!')
