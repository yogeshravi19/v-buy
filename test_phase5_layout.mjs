// test_phase5_layout.mjs
import assert from 'node:assert'
import fs from 'node:fs'

console.log('Testing Phase 5 Layout Stability...')

// 1. Check saas_dashboard.css
const saasCss = fs.readFileSync('frontend/src/saas_dashboard.css', 'utf8')
assert(saasCss.includes('height: 100dvh'), 'saas_dashboard.css must use 100dvh for shell')
assert(saasCss.includes('overflow: hidden'), 'saas_dashboard.css must prevent page scroll leak')
assert(saasCss.includes('max-height: 800px'), 'saas_dashboard.css must support low-height desktop viewports')
assert(saasCss.includes('env(safe-area-inset-bottom, 0px)'), 'saas_dashboard.css must use safe-area-inset-bottom on mobile')
assert(saasCss.includes('env(safe-area-inset-top, 0px)'), 'saas_dashboard.css must use safe-area-inset-top on mobile topbar')
console.log('✔ saas_dashboard.css responsive layout rules verified')

// 2. Check styles.css
const stylesCss = fs.readFileSync('frontend/src/styles.css', 'utf8')
assert(stylesCss.includes('vfoods-app-frame'), 'styles.css must style vfoods-app-frame')
assert(stylesCss.includes('100dvh'), 'styles.css must use 100dvh for app frame')
assert(stylesCss.includes('vfoods-bottom-nav'), 'styles.css must style vfoods-bottom-nav')
assert(stylesCss.includes('calc(10px + env(safe-area-inset-bottom, 0px))'), 'styles.css must apply safe-area-inset to bottom nav')
assert(stylesCss.includes('calc(74px + env(safe-area-inset-bottom, 0px))'), 'styles.css must apply safe-area-inset to floating cart pill')
assert(stylesCss.includes(':has(input:focus, textarea:focus)'), 'styles.css must include mobile keyboard focus auto-hide')
console.log('✔ styles.css user dashboard layout and safe-area insets verified')

console.log('All Phase 5 Layout tests passed cleanly!')
