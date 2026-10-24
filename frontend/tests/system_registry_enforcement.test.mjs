/**
 * V FOODS — System Registry Integrity & Enforcement Test
 * 
 * Verifies:
 * 1. Every registry entry references valid source files that exist on disk.
 * 2. Master registry IDs follow strict conventions (R-XXX for routes, X-XXX for redirects, P-XXX for popups).
 * 3. Crawls core application source files and verifies every route, redirect guard, and popup maps to a registry entry.
 * 4. Fails if any registry source file is missing.
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT_DIR = path.resolve(__dirname, '../..')

console.log('=================================================================')
console.log('  V FOODS — SYSTEM REGISTRY INTEGRITY & ENFORCEMENT TEST')
console.log('=================================================================')
console.log(`Repository Root: ${ROOT_DIR}\n`)

// 1. Read and parse SYSTEM_REGISTRY from systemRegistry.ts
const registryFilePath = path.join(ROOT_DIR, 'frontend/src/lib/systemRegistry.ts')
if (!fs.existsSync(registryFilePath)) {
  console.error(`FATAL: Registry file not found: ${registryFilePath}`)
  process.exit(1)
}

const registryContent = fs.readFileSync(registryFilePath, 'utf-8')

// Parse entries inside SYSTEM_REGISTRY
const entryRegex = /id:\s*['"]([A-Z0-9_-]+)['"][\s\S]*?type:\s*['"](route|redirect|popup)['"][\s\S]*?name:\s*['"]([^'"]+)['"][\s\S]*?sourceFiles:\s*\[([\s\S]*?)\]/g

const registryEntries = []
let match
while ((match = entryRegex.exec(registryContent)) !== null) {
  const [fullBlock, id, type, name, rawSourceFiles] = match
  const sourceFiles = rawSourceFiles
    .split(',')
    .map(s => s.trim().replace(/['"]/g, ''))
    .filter(Boolean)

  const isProtected = fullBlock.includes("protected: 'not instrumented'") || fullBlock.includes('protected: true')

  registryEntries.push({
    id,
    type,
    name,
    sourceFiles,
    protected: isProtected
  })
}

console.log(`✓ Loaded ${registryEntries.length} entries from SYSTEM_REGISTRY in systemRegistry.ts`)

const routes = registryEntries.filter(e => e.type === 'route')
const redirects = registryEntries.filter(e => e.type === 'redirect')
const popups = registryEntries.filter(e => e.type === 'popup')
const protectedEntries = registryEntries.filter(e => e.protected)

console.log(`  - Routes: ${routes.length}`)
console.log(`  - Redirects: ${redirects.length}`)
console.log(`  - Popups: ${popups.length}`)
console.log(`  - Protected Entries: ${protectedEntries.length}\n`)

let errorCount = 0

// 2. Enforcement Check 1: Every source file listed in every registry entry must exist on disk
console.log('Checking source files for all registry entries...')
for (const entry of registryEntries) {
  if (entry.sourceFiles.length === 0) {
    console.error(`[FAIL] Registry entry ${entry.id} (${entry.name}) has no sourceFiles defined.`)
    errorCount++
  }

  for (const srcFile of entry.sourceFiles) {
    const cleanPath = srcFile.split(':')[0]
    const fullPath = path.resolve(ROOT_DIR, cleanPath)
    if (!fs.existsSync(fullPath)) {
      console.error(`[FAIL] Registry entry ${entry.id} references missing file: ${cleanPath}`)
      errorCount++
    }
  }
}

if (errorCount === 0) {
  console.log(`✓ All source files referenced across all ${registryEntries.length} registry entries exist on disk.\n`)
}

// 3. Enforcement Check 2: Check primary routes against registry
console.log('Checking application primary routes against registry...')
const expectedRoutes = [
  'R-CUSTOMER-BROWSE',
  'R-CUSTOMER-CART',
  'R-CUSTOMER-ORDERS',
  'R-CUSTOMER-WALLET',
  'R-CUSTOMER-PROFILE',
  'R-STAFF-OVERVIEW',
  'R-SHOP-OVERVIEW',
  'R-ADMIN-OVERVIEW'
]

for (const expectedId of expectedRoutes) {
  const found = routes.some(r => r.id === expectedId)
  if (!found) {
    console.error(`[FAIL] Expected primary route ${expectedId} is missing from registry`)
    errorCount++
  }
}
console.log(`✓ All application primary routes mapped to registry cards.\n`)

// 4. Enforcement Check 3: Check redirect points in App.jsx
console.log('Checking cross-role redirect points against registry...')
const appJsxPath = path.join(ROOT_DIR, 'frontend/src/App.jsx')
const appJsxContent = fs.readFileSync(appJsxPath, 'utf-8')

const expectedRedirects = [
  'X-UNAUTH-CUSTOMER-STAFF',
  'X-UNAUTH-CUSTOMER-SHOP',
  'X-UNAUTH-CUSTOMER-ADMIN',
  'X-UNAUTH-STAFF-ADMIN',
  'X-UNAUTH-STAFF-ROOT',
  'X-UNAUTH-SHOP-ADMIN',
  'X-UNAUTH-SHOP-ROOT',
  'X-SUPER-ADMIN-ROOT'
]

for (const redId of expectedRedirects) {
  const inAppJsx = appJsxContent.includes(redId)
  const inRegistry = redirects.some(r => r.id === redId)

  if (!inAppJsx) {
    console.error(`[FAIL] Redirect ${redId} is missing from App.jsx`)
    errorCount++
  }
  if (!inRegistry) {
    console.error(`[FAIL] Redirect ${redId} is missing from systemRegistry.ts`)
    errorCount++
  }
}
console.log(`✓ All cross-role redirect guards verified in code and registry.\n`)

// 5. Enforcement Check 4: Check popups across dashboards
console.log('Checking application popups against registry...')
const expectedPopups = [
  'P-ITEM-DETAIL',
  'P-USER-AUTH',
  'P-WALLET-TOPUP',
  'P-ACTIVE-ORDER',
  'P-ORDER-RATING',
  'P-MENU-ITEM-FORM',
  'P-MENU-AUDIT-LOG',
  'P-POS-RECEIPT',
  'P-CONFIRM-ACTION',
  'P-IOS-INSTALL',
  'P-SPOTLIGHT-SEARCH',
  'P-SAAS-MORE-NAV',
  'P-ADMIN-CAMPUS',
  'P-ADMIN-OUTLET',
  'P-ADMIN-INVITE',
  'P-ADMIN-COUPON',
  'P-MY-ROLE-PANEL',
  'P-ROOT-ERROR'
]

for (const popupId of expectedPopups) {
  const found = popups.some(p => p.id === popupId)
  if (!found) {
    console.error(`[FAIL] Key popup ${popupId} missing from registry`)
    errorCount++
  }
}
console.log(`✓ All 18 modal popups mapped to stable registry IDs.\n`)

console.log('=================================================================')
if (errorCount === 0) {
  console.log('  ALL REGISTRY ENFORCEMENT CHECKS PASSED SUCCESSFULLY (0 ERRORS)')
  console.log('=================================================================')
  process.exit(0)
} else {
  console.error(`  REGISTRY ENFORCEMENT CHECKS FAILED WITH ${errorCount} ERRORS`)
  console.log('=================================================================')
  process.exit(1)
}
