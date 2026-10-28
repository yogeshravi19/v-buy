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

const CHROME_PATH = process.env.PLAYWRIGHT_CHROME_EXECUTABLE_PATH || 'C:\\Users\\INDIA\\AppData\\Local\\ms-playwright\\chromium-1248\\chrome-win64\\chrome.exe'
const browser = await chromium.launch({ headless: true, executablePath: fs.existsSync(CHROME_PATH) ? CHROME_PATH : undefined })

async function testRoleSession(email, pass, expectedHome, roleName, forbiddenPaths) {
  console.log(`\n======================================================`)
  console.log(`[TEST ROLE] ${roleName} (${email})`)
  console.log(`======================================================`)

  const context = await browser.newContext({ viewport: { width: 1366, height: 768 } })
  const page = await context.newPage()

  page.on('console', msg => {
    if (msg.type() === 'error') console.log(`[BROWSER ERROR] ${msg.text()}`)
  })

  // 1. Initial login
  await page.goto('http://localhost:5199/')
  await page.waitForLoadState('networkidle')

  await page.fill('#login-identifier, #unified-identifier, input[type="email"], input[type="text"]', email)
  await page.fill('#login-password, #unified-password, input[type="password"]', pass)
  await page.click('button[type="submit"]')

  // Wait for landing
  await page.waitForFunction((home) => window.location.pathname === home, expectedHome, { timeout: 15000 })
  const landedPath = new URL(page.url()).pathname
  assert.strictEqual(landedPath, expectedHome, `${roleName} must land on ${expectedHome}`)
  console.log(`[PASS] ${roleName} successfully authenticated and routed to ${landedPath}`)
  await page.screenshot({ path: `E:/vfoods-evidence/screenshots/qa_${roleName.toLowerCase()}_landing.png` })

  // 2. Refresh on home URL maintains role and route
  console.log(`[TEST] Refreshing page on ${landedPath}...`)
  await page.reload()
  await page.waitForFunction((home) => window.location.pathname === home, expectedHome, { timeout: 15000 })
  assert.strictEqual(new URL(page.url()).pathname, expectedHome, `Refresh must maintain ${expectedHome}`)
  console.log(`[PASS] Page reload correctly kept ${roleName} on ${expectedHome}`)

  // 3. Test cross-role forbidden paths
  for (const forbidden of forbiddenPaths) {
    console.log(`[TEST] Accessing forbidden route: ${forbidden}...`)
    await page.goto(`http://localhost:5199${forbidden}`)
    await page.waitForFunction((home) => window.location.pathname === home, expectedHome, { timeout: 15000 })
    const guardPath = new URL(page.url()).pathname
    assert.strictEqual(guardPath, expectedHome, `Guard must redirect ${forbidden} -> ${expectedHome}`)
    console.log(`[PASS] Forbidden route ${forbidden} blocked -> ${guardPath}`)
  }

  // 4. Test Sign Out
  console.log(`[TEST] Signing out ${roleName}...`)
  if (roleName === 'User') {
    await page.click('button.vfoods-profile-avatar-btn, button[title="Account Menu"]')
    await page.waitForTimeout(400)
    await page.click('button.vfoods-profile-dd-item.danger, button:has-text("Sign Out")')
  } else {
    await page.click('button[title="Sign Out"]')
  }

  // Wait for login screen
  await page.waitForSelector('input[type="password"]', { timeout: 10000 })
  console.log(`[PASS] ${roleName} successfully signed out, session destroyed cleanly`)

  await context.close()
}

try {
  // 1. Test User
  await testRoleSession(userEmail, userPass, '/', 'User', ['/staff', '/shop-admin', '/admin'])

  // 2. Test Staff
  await testRoleSession(staffEmail, staffPass, '/staff', 'Staff', ['/', '/admin', '/shop-admin'])

  // 3. Test Shop Admin
  await testRoleSession(adminEmail, adminPass, '/shop-admin', 'ShopAdmin', ['/', '/admin'])

  // 4. Test Super Admin
  await testRoleSession(superAdminEmail, superAdminPass, '/admin', 'SuperAdmin', ['/', '/staff', '/shop-admin'])

  console.log('\n======================================================')
  console.log('ALL FOUR QA ROLES & CROSS-ROLE GUARDS FULLY VERIFIED!')
  console.log('======================================================\n')
} catch (err) {
  console.error('[FAIL]', err)
  process.exit(1)
} finally {
  await browser.close()
}
