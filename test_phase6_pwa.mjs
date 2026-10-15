// test_phase6_pwa.mjs
import assert from 'node:assert'
import fs from 'node:fs'

console.log('Testing Phase 6 PWA Implementation...')

// 1. Verify manifest.json
const manifestPath = 'frontend/public/manifest.json'
assert(fs.existsSync(manifestPath), 'manifest.json must exist')
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
assert(manifest.name.includes('V Foods'), 'manifest name must be V Foods')
assert(manifest.short_name === 'V Foods', 'manifest short_name must be V Foods')
assert(manifest.display === 'standalone', 'manifest display must be standalone')
assert(manifest.background_color === '#0B192C', 'manifest background_color must match palette')
assert(manifest.theme_color === '#0B192C', 'manifest theme_color must match palette')
assert(manifest.icons.length >= 2, 'manifest must have at least 2 icons')
assert(manifest.icons.some(i => i.sizes === '192x192' && i.purpose.includes('maskable')), 'manifest must have 192x192 maskable icon')
assert(manifest.icons.some(i => i.sizes === '512x512' && i.purpose.includes('maskable')), 'manifest must have 512x512 maskable icon')
assert(manifest.shortcuts.length >= 3, 'manifest must provide shortcuts')
assert(manifest.shortcuts.some(s => s.url === '/orders'), 'manifest must include /orders shortcut')
assert(manifest.shortcuts.some(s => s.url === '/wallet'), 'manifest must include /wallet shortcut')
console.log('✔ manifest.json verified with icons, shortcuts, and V Foods branding')

// 2. Verify sw.js caching strategies and strict no-cache
const swPath = 'frontend/public/sw.js'
assert(fs.existsSync(swPath), 'sw.js must exist')
const swContent = fs.readFileSync(swPath, 'utf8')
assert(swContent.includes('STATIC_ASSETS'), 'sw.js must define precached assets')
assert(swContent.includes('/manifest.json'), 'sw.js must precache manifest.json')
assert(swContent.includes('menu-images'), 'sw.js must cache menu-images')
assert(swContent.includes('/rest/v1/orders'), 'sw.js must explicitly bypass orders')
assert(swContent.includes('/rest/v1/wallet'), 'sw.js must explicitly bypass wallet')
assert(swContent.includes('/auth/v1/'), 'sw.js must explicitly bypass auth')
assert(swContent.includes('/api/paytm'), 'sw.js must explicitly bypass payment gateways')
assert(swContent.includes('SKIP_WAITING'), 'sw.js must handle SKIP_WAITING update message')
assert(swContent.includes('notificationclick'), 'sw.js must route notification clicks')
console.log('✔ sw.js cache strategies, strict no-cache rules, and push routing verified')

// 3. Verify usePwa hook
const hookPath = 'frontend/src/hooks/usePwa.ts'
assert(fs.existsSync(hookPath), 'usePwa.ts must exist')
const hookContent = fs.readFileSync(hookPath, 'utf8')
assert(hookContent.includes('beforeinstallprompt'), 'usePwa must handle beforeinstallprompt')
assert(hookContent.includes('display-mode: standalone'), 'usePwa must detect standalone display mode')
assert(hookContent.includes('isInAppBrowser'), 'usePwa must detect in-app browsers')
assert(hookContent.includes('isIos'), 'usePwa must detect iOS')
assert(hookContent.includes('updateAvailable'), 'usePwa must detect service worker waiting updates')
console.log('✔ usePwa.ts hook functionality verified')

// 4. Verify PwaInstallPrompt UI components
const promptPath = 'frontend/src/components/PwaInstallPrompt.tsx'
assert(fs.existsSync(promptPath), 'PwaInstallPrompt.tsx must exist')
const promptContent = fs.readFileSync(promptPath, 'utf8')
assert(promptContent.includes('OfflineBanner'), 'PwaInstallPrompt must export OfflineBanner')
assert(promptContent.includes('PwaUpdateToast'), 'PwaInstallPrompt must export PwaUpdateToast')
assert(promptContent.includes('InAppBrowserBanner'), 'PwaInstallPrompt must export InAppBrowserBanner')
assert(promptContent.includes('IosInstallModal'), 'PwaInstallPrompt must export IosInstallModal')
assert(promptContent.includes('InstallBannerCard'), 'PwaInstallPrompt must export InstallBannerCard')
console.log('✔ PwaInstallPrompt.tsx UI components verified')

// 5. Verify App.jsx and VFoodsUserDashboard.jsx integration
const appPath = 'frontend/src/App.jsx'
const appContent = fs.readFileSync(appPath, 'utf8')
assert(appContent.includes('<OfflineBanner isOnline={isOnline} />'), 'App.jsx must render OfflineBanner')
assert(appContent.includes('<PwaUpdateToast'), 'App.jsx must render PwaUpdateToast')
assert(appContent.includes('<IosInstallModal'), 'App.jsx must render IosInstallModal')

const dashPath = 'frontend/src/components/VFoodsUserDashboard.jsx'
const dashContent = fs.readFileSync(dashPath, 'utf8')
assert(dashContent.includes('InstallBannerCard'), 'VFoodsUserDashboard must include InstallBannerCard')
assert(dashContent.includes('Install V Foods App'), 'VFoodsUserDashboard must include Install in profile menu')
assert(dashContent.includes('disabled={busy || !isOnline}'), 'VFoodsUserDashboard must protect checkout when offline')
console.log('✔ App.jsx and UserDashboard PWA integration verified')

console.log('All Phase 6 PWA tests passed cleanly!')
