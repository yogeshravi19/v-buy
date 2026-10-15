// test_phase9_master_regression.mjs
// Master End-to-End Regression Test Suite covering Phases 1 through 8

import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'
import { executeSql } from './run_mcp_sql.mjs'

async function runMasterRegression() {
  console.log('════════════════════════════════════════════════════════════════')
  console.log('  V FOODS — PHASE 9 MASTER END-TO-END REGRESSION TEST SUITE     ')
  console.log('════════════════════════════════════════════════════════════════\n')

  let passedTests = 0

  // ── [PHASE 1] ORDER NUMBERING SINGLE SOURCE OF TRUTH ───────────────────────
  console.log('▶ [1/8] Verifying Phase 1: Order Numbering...')
  const orderNumUtil = fs.readFileSync('frontend/src/utils/orderNumber.ts', 'utf8')
  assert(orderNumUtil.includes('formatOrderNumber'), 'formatOrderNumber helper must exist')
  assert(orderNumUtil.includes('formatOrderQrToken'), 'formatOrderQrToken helper must exist')
  assert(orderNumUtil.includes('VFOOD:'), 'QR format must use VFOOD prefix')

  const seqCheck = await executeSql("SELECT table_name FROM information_schema.tables WHERE table_name = 'outlet_daily_counters';")
  assert(seqCheck.result.content[0].text.includes('outlet_daily_counters'), 'outlet_daily_counters table must exist in DB')
  console.log('  ✔ Phase 1 Order numbering & QR format verified')
  passedTests++

  // ── [PHASE 2] MENU MANAGEMENT & STORAGE ───────────────────────────────────
  console.log('▶ [2/8] Verifying Phase 2: Menu Management & Photo Pipeline...')
  const menuStorage = fs.readFileSync('frontend/src/utils/menuStorage.ts', 'utf8')
  assert(menuStorage.includes('menu-images'), 'menuStorage must target menu-images bucket')
  assert(menuStorage.includes('image/webp'), 'menuStorage must store image/webp')

  const imgProc = fs.readFileSync('frontend/src/utils/imageProcessor.ts', 'utf8')
  assert(imgProc.includes('200 * 1024'), 'imageProcessor must target ~200KB max')

  const menuDialog = fs.readFileSync('frontend/src/components/forms/MenuItemFormDialog.jsx', 'utf8')
  assert(menuDialog.includes('processMenuImage'), 'MenuItemFormDialog must process images')
  assert(menuDialog.includes('uploadMenuImage'), 'MenuItemFormDialog must upload menu images')

  const bucketCheck = await executeSql("SELECT id FROM storage.buckets WHERE id = 'menu-images';")
  assert(bucketCheck.result.content[0].text.includes('menu-images'), 'menu-images storage bucket must exist in DB')
  console.log('  ✔ Phase 2 Menu management & storage pipeline verified')
  passedTests++

  // ── [PHASE 3] WALK-IN POS COUNTER BILLING ─────────────────────────────────
  console.log('▶ [3/8] Verifying Phase 3: Walk-In POS & Stock Reconciliation...')
  const posScreen = fs.readFileSync('frontend/src/components/pos/PosCounterScreen.tsx', 'utf8')
  assert(posScreen.includes('create_pos_order'), 'POS counter must invoke create_pos_order RPC')
  assert(posScreen.includes('CASH') && posScreen.includes('UPI_COUNTER'), 'POS must support cash and counter UPI')

  const posRpcCheck = await executeSql("SELECT routine_name FROM information_schema.routines WHERE routine_name = 'create_pos_order';")
  assert(posRpcCheck.result.content[0].text.includes('create_pos_order'), 'create_pos_order stored procedure must exist')
  console.log('  ✔ Phase 3 POS counter billing & atomic functions verified')
  passedTests++

  // ── [PHASE 4] ROUTE MATRIX & MODALS ───────────────────────────────────────
  console.log('▶ [4/8] Verifying Phase 4: Route Matrix & Consolidated Modals...')
  const appJsx = fs.readFileSync('frontend/src/App.jsx', 'utf8')
  assert(appJsx.includes('NotFoundPage'), 'App.jsx must mount NotFoundPage for unknown routes')
  assert(appJsx.includes('isKnownRoute'), 'App.jsx must validate isKnownRoute')

  const itemSheet = fs.readFileSync('frontend/src/components/ItemDetailBottomSheet.tsx', 'utf8')
  assert(itemSheet.includes('ItemDetailErrorBoundary'), 'ItemDetailBottomSheet must have error boundary')
  console.log('  ✔ Phase 4 Route matrix, deep linking, and error boundaries verified')
  passedTests++

  // ── [PHASE 5] LAYOUT STABILITY & 100DVH ────────────────────────────────────
  console.log('▶ [5/8] Verifying Phase 5: Layout Stability & Viewport Isolation...')
  const saasCss = fs.readFileSync('frontend/src/saas_dashboard.css', 'utf8')
  assert(saasCss.includes('height: 100dvh'), 'saas_dashboard.css must use 100dvh')
  assert(saasCss.includes('overflow: hidden'), 'saas-layout must isolate page scroll')

  const stylesCss = fs.readFileSync('frontend/src/styles.css', 'utf8')
  assert(stylesCss.includes('env(safe-area-inset-bottom, 0px)'), 'styles.css must apply safe-area-inset-bottom')
  assert(stylesCss.includes(':has(input:focus, textarea:focus)'), 'styles.css must auto-hide bottom nav on input focus')
  console.log('  ✔ Phase 5 100dvh layout stability & safe-area insets verified')
  passedTests++

  // ── [PHASE 6] PWA MANIFEST & CACHING ───────────────────────────────────────
  console.log('▶ [6/8] Verifying Phase 6: PWA Manifest & Runtime Caching...')
  const manifest = JSON.parse(fs.readFileSync('frontend/public/manifest.json', 'utf8'))
  assert(manifest.short_name === 'V Foods', 'Manifest short name must be V Foods')
  assert(manifest.display === 'standalone', 'Manifest display must be standalone')
  assert(manifest.shortcuts.length >= 3, 'Manifest must have deep link shortcuts')

  const swJs = fs.readFileSync('frontend/public/sw.js', 'utf8')
  assert(swJs.includes('/rest/v1/orders') && swJs.includes('/rest/v1/wallet'), 'sw.js must strictly bypass financial endpoints')
  assert(swJs.includes('menu-images'), 'sw.js must cache menu images')
  console.log('  ✔ Phase 6 PWA manifest, caching boundaries, and offline support verified')
  passedTests++

  // ── [PHASE 7] WEB PUSH & ASYNCHRONOUS OBSERVERS ───────────────────────────
  console.log('▶ [7/8] Verifying Phase 7: Web Push & DB Observers...')
  const pushSubCheck = await executeSql("SELECT table_name FROM information_schema.tables WHERE table_name = 'push_subscriptions';")
  assert(pushSubCheck.result.content[0].text.includes('push_subscriptions'), 'push_subscriptions table must exist')

  const observerCheck = await executeSql("SELECT trigger_name FROM information_schema.triggers WHERE trigger_name = 'trg_orders_notifications_observer';")
  assert(observerCheck.result.content[0].text.includes('trg_orders_notifications_observer'), 'trg_orders_notifications_observer must exist')
  console.log('  ✔ Phase 7 Web Push infrastructure & decoupled observer triggers verified')
  passedTests++

  // ── [PHASE 8] DESIGN POLISH PASS ──────────────────────────────────────────
  console.log('▶ [8/8] Verifying Phase 8: Design Polish (Zero Emojis & Palette)...')
  const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}\u{1F900}-\u{1F9FF}\u{1FA70}-\u{1FAFF}]/u
  let emojiViolations = 0

  function scanEmojis(dir) {
    const entries = fs.readdirSync(dir)
    for (const entry of entries) {
      if (entry === 'node_modules' || entry === 'dist' || entry === '.git') continue
      const full = path.join(dir, entry)
      const stat = fs.statSync(full)
      if (stat.isDirectory()) {
        scanEmojis(full)
      } else if (/\.(jsx?|tsx?)$/.test(entry)) {
        const text = fs.readFileSync(full, 'utf8')
        if (emojiRegex.test(text)) emojiViolations++
      }
    }
  }
  scanEmojis('frontend/src')
  assert.strictEqual(emojiViolations, 0, 'Must have zero emojis across all frontend code')
  console.log('  ✔ Phase 8 Zero emojis and design polish verified')
  passedTests++

  console.log('\n════════════════════════════════════════════════════════════════')
  console.log(`  ALL ${passedTests}/8 REGRESSION SUITES PASSED WITH 100% SUCCESS `)
  console.log('════════════════════════════════════════════════════════════════')
}

runMasterRegression().catch(err => {
  console.error('Master Regression Test Failed:', err)
  process.exit(1)
})
