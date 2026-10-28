import { chromium } from 'playwright'
import fs from 'node:fs'
import assert from 'node:assert'

const creds = fs.readFileSync('E:/vfoods-evidence/qa_credentials.local.txt', 'utf8').trim().split('\n')
const userEmail = creds[0].trim()
const userPass = creds[1].trim()
const staffEmail = creds[2].trim()
const staffPass = creds[3].trim()
const adminEmail = creds[4].trim()
const adminPass = creds[5].trim()
const superAdminEmail = creds[6]?.trim() || 'qa+superadmin@example.test'
const superAdminPass = creds[7]?.trim() || 'Qa!8KrULZPQaE3wNYTm'

const ROLES = [
  { name: 'User', email: userEmail, pass: userPass, home: '/', forbidden: '/staff' },
  { name: 'Staff', email: staffEmail, pass: staffPass, home: '/staff', forbidden: '/' },
  { name: 'ShopAdmin', email: adminEmail, pass: adminPass, home: '/shop-admin', forbidden: '/admin' },
  { name: 'SuperAdmin', email: superAdminEmail, pass: superAdminPass, home: '/admin', forbidden: '/shop-admin' }
]

const TOTAL_CYCLES = 50
let passedCycles = 0
let failedCycles = 0
let wrongLandingCount = 0
const results = []

const browser = await chromium.launch({ headless: true })

console.log(`\n======================================================`)
console.log(`STARTING 50-CYCLE STABILITY & ROLE ROUTING VERIFICATION`)
console.log(`Target: 50 consecutive cycles across all 4 roles`)
console.log(`Zero wrong-landing tolerance`)
console.log(`======================================================\n`)

const startTime = Date.now()

async function waitForRoleDashboard(page, roleName, expectedHome) {
  if (roleName === 'User') {
    await page.waitForSelector('button.vfoods-profile-avatar-btn, button[title="Account Menu"]', { timeout: 15000 })
  } else {
    await page.waitForSelector('button[title="Sign Out"]', { timeout: 15000 })
  }
  const currentPath = new URL(page.url()).pathname
  if (currentPath !== expectedHome) {
    throw new Error(`Expected ${expectedHome} but landed on ${currentPath}`)
  }
}

for (let i = 1; i <= TOTAL_CYCLES; i++) {
  const roleCfg = ROLES[(i - 1) % ROLES.length]
  const cycleStart = Date.now()
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 } })
  const page = await context.newPage()

  try {
    // 1. Initial login
    await page.goto('http://localhost:5199/')
    await page.waitForSelector('#login-identifier', { timeout: 10000 })
    await page.fill('#login-identifier', roleCfg.email)
    await page.fill('#login-password', roleCfg.pass)
    await page.click('button[type="submit"]')

    // 2. Verify Home landing
    await waitForRoleDashboard(page, roleCfg.name, roleCfg.home)

    // 3. Reload & verify persistence
    await page.reload()
    await waitForRoleDashboard(page, roleCfg.name, roleCfg.home)

    // 4. Test Cross-role deep link interception
    await page.goto(`http://localhost:5199${roleCfg.forbidden}`)
    await page.waitForTimeout(500)
    await waitForRoleDashboard(page, roleCfg.name, roleCfg.home)

    // 5. Sign out cleanly
    if (roleCfg.name === 'User') {
      await page.click('button.vfoods-profile-avatar-btn, button[title="Account Menu"]')
      await page.waitForTimeout(300)
      await page.click('button.vfoods-profile-dd-item.danger, button:has-text("Sign Out")')
    } else {
      await page.click('button[title="Sign Out"]')
    }
    await page.waitForSelector('#login-identifier', { timeout: 10000 })

    passedCycles++
    const duration = Date.now() - cycleStart
    console.log(`[PASS] Cycle ${i}/${TOTAL_CYCLES}: ${roleCfg.name} -> ${roleCfg.home} (reload & guard OK) [${duration}ms]`)
    results.push({ cycle: i, role: roleCfg.name, status: 'PASS', durationMs: duration })
  } catch (err) {
    failedCycles++
    wrongLandingCount++
    console.error(`[FAIL] Cycle ${i}/${TOTAL_CYCLES}: ${roleCfg.name} - ${err.message}`)
    results.push({ cycle: i, role: roleCfg.name, status: 'FAIL', error: err.message })
    await page.screenshot({ path: `E:/vfoods-evidence/screenshots/failure_cycle_${i}.png` }).catch(() => {})
    break
  } finally {
    await context.close()
  }
}

await browser.close()
const totalDuration = Date.now() - startTime

const summary = {
  totalCyclesConfigured: TOTAL_CYCLES,
  cyclesCompleted: passedCycles + failedCycles,
  passedCycles,
  failedCycles,
  wrongLandingCount: failedCycles > 0 ? 1 : 0,
  totalDurationMs: totalDuration,
  averageCycleMs: passedCycles > 0 ? Math.round(totalDuration / passedCycles) : 0,
  timestamp: new Date().toISOString()
}

fs.writeFileSync('E:/vfoods-evidence/STABILITY_50_REPORT.json', JSON.stringify({ summary, results }, null, 2))

console.log(`\n======================================================`)
console.log(`50-CYCLE STABILITY SUITE FINISHED`)
console.log(`Passed: ${passedCycles}/${TOTAL_CYCLES}`)
console.log(`Failed: ${failedCycles}`)
console.log(`Wrong Landings: ${summary.wrongLandingCount}`)
console.log(`Total Time: ${(totalDuration / 1000).toFixed(1)}s`)
console.log(`======================================================\n`)

if (failedCycles > 0) {
  process.exit(1)
}
