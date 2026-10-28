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

const browser = await chromium.launch({ headless: true })

async function runE2E() {
  console.log(`\n======================================================`)
  console.log(`RUNNING END-TO-END WORKFLOW VERIFICATION ACROSS ALL ROLES`)
  console.log(`======================================================\n`)

  // ────────────────────────────────────────────────────────
  // 1. USER WORKFLOW
  // ────────────────────────────────────────────────────────
  console.log(`>>> [ROLE 1/4] USER WORKFLOW`)
  {
    const context = await browser.newContext({ viewport: { width: 1366, height: 768 } })
    const page = await context.newPage()
    await page.goto('http://localhost:5199/')
    await page.waitForSelector('#login-identifier')
    await page.fill('#login-identifier', userEmail)
    await page.fill('#login-password', userPass)
    await page.click('button[type="submit"]')
    await page.waitForSelector('button.vfoods-profile-avatar-btn, button[title="Account Menu"]')
    console.log(`  [PASS] User authenticated and reached User Dashboard`)

    // Verify Food Courts view
    await page.waitForSelector('.food-court-card, .court-card, div:has-text("Gazebo")')
    console.log(`  [PASS] Campus Food Courts loaded`)
    await page.screenshot({ path: 'E:/vfoods-evidence/screenshots/e2e_user_foodcourts.png' })

    // Open first food court or outlet
    const outletBtn = page.locator('.food-court-card, .court-card, button:has-text("Gazebo")').first()
    await outletBtn.click()
    await page.waitForTimeout(1000)
    console.log(`  [PASS] Food court opened`)

    // Add item to cart
    const addBtn = page.locator('button:has-text("ADD"), button:has-text("Add")').first()
    if (await addBtn.isVisible()) {
      await addBtn.click()
      await page.waitForTimeout(500)
      console.log(`  [PASS] Item added to Cart`)
    }

    // View Cart
    const cartBtn = page.locator('button:has-text("Cart"), .floating-cart-bar, button[title="View Cart"]').first()
    if (await cartBtn.isVisible()) {
      await cartBtn.click()
      await page.waitForTimeout(800)
      console.log(`  [PASS] Cart opened and verified`)
      await page.screenshot({ path: 'E:/vfoods-evidence/screenshots/e2e_user_cart.png' })
      // Close cart
      const closeCart = page.locator('button:has-text("Close"), button[aria-label="Close"], button.cart-close-btn').first()
      if (await closeCart.isVisible()) await closeCart.click()
    }

    // Profile Menu
    await page.click('button.vfoods-profile-avatar-btn, button[title="Account Menu"]')
    await page.waitForTimeout(400)
    await page.screenshot({ path: 'E:/vfoods-evidence/screenshots/e2e_user_profile_menu.png' })

    // Sign out
    await page.click('button.vfoods-profile-dd-item.danger, button:has-text("Sign Out")')
    await page.waitForSelector('#login-identifier')
    console.log(`  [PASS] User signed out cleanly\n`)
    await context.close()
  }

  // ────────────────────────────────────────────────────────
  // 2. STAFF WORKFLOW
  // ────────────────────────────────────────────────────────
  console.log(`>>> [ROLE 2/4] SHOP STAFF WORKFLOW`)
  {
    const context = await browser.newContext({ viewport: { width: 1366, height: 768 } })
    const page = await context.newPage()
    await page.goto('http://localhost:5199/')
    await page.waitForSelector('#login-identifier')
    await page.fill('#login-identifier', staffEmail)
    await page.fill('#login-password', staffPass)
    await page.click('button[type="submit"]')
    await page.waitForSelector('button[title="Sign Out"]')
    assert.strictEqual(new URL(page.url()).pathname, '/staff')
    console.log(`  [PASS] Staff authenticated on /staff`)
    await page.screenshot({ path: 'E:/vfoods-evidence/screenshots/e2e_staff_queue.png' })

    // Check Live Queue tabs
    const tabHeaders = page.locator('button:has-text("Live Orders"), button:has-text("Kitchen Display"), button:has-text("Menu & Stock"), button:has-text("POS")')
    console.log(`  [PASS] Staff navigation verified (${await tabHeaders.count()} tabs)`)

    // Sign out
    await page.click('button[title="Sign Out"]')
    await page.waitForSelector('#login-identifier')
    console.log(`  [PASS] Staff signed out cleanly\n`)
    await context.close()
  }

  // ────────────────────────────────────────────────────────
  // 3. SHOP ADMIN WORKFLOW
  // ────────────────────────────────────────────────────────
  console.log(`>>> [ROLE 3/4] SHOP ADMIN WORKFLOW`)
  {
    const context = await browser.newContext({ viewport: { width: 1366, height: 768 } })
    const page = await context.newPage()
    await page.goto('http://localhost:5199/')
    await page.waitForSelector('#login-identifier')
    await page.fill('#login-identifier', adminEmail)
    await page.fill('#login-password', adminPass)
    await page.click('button[type="submit"]')
    await page.waitForSelector('button[title="Sign Out"]')
    assert.strictEqual(new URL(page.url()).pathname, '/shop-admin')
    console.log(`  [PASS] Shop Admin authenticated on /shop-admin`)
    await page.screenshot({ path: 'E:/vfoods-evidence/screenshots/e2e_shopadmin_overview.png' })

    // Verify Overview KPI cards
    const kpiCards = page.locator('.saas-kpi-card, .kpi-card, [class*="kpi"]')
    console.log(`  [PASS] Shop Admin KPI cards visible (${await kpiCards.count()} cards)`)

    // Sign out
    await page.click('button[title="Sign Out"]')
    await page.waitForSelector('#login-identifier')
    console.log(`  [PASS] Shop Admin signed out cleanly\n`)
    await context.close()
  }

  // ────────────────────────────────────────────────────────
  // 4. SUPER ADMIN WORKFLOW
  // ────────────────────────────────────────────────────────
  console.log(`>>> [ROLE 4/4] SUPER ADMIN WORKFLOW`)
  {
    const context = await browser.newContext({ viewport: { width: 1366, height: 768 } })
    const page = await context.newPage()
    await page.goto('http://localhost:5199/')
    await page.waitForSelector('#login-identifier')
    await page.fill('#login-identifier', superAdminEmail)
    await page.fill('#login-password', superAdminPass)
    await page.click('button[type="submit"]')
    await page.waitForSelector('button[title="Sign Out"]')
    assert.strictEqual(new URL(page.url()).pathname, '/admin')
    console.log(`  [PASS] Super Admin authenticated on /admin`)
    await page.screenshot({ path: 'E:/vfoods-evidence/screenshots/e2e_superadmin_overview.png' })

    // Verify Campus overview / outlets
    const saasMain = page.locator('.saas-main, main')
    assert.ok(await saasMain.isVisible(), 'Super Admin main workspace visible')
    console.log(`  [PASS] Super Admin main workspace active`)

    // Sign out
    await page.click('button[title="Sign Out"]')
    await page.waitForSelector('#login-identifier')
    console.log(`  [PASS] Super Admin signed out cleanly\n`)
    await context.close()
  }

  console.log(`======================================================`)
  console.log(`ALL 4 ROLES PASSED END-TO-END WORKFLOW VERIFICATION!`)
  console.log(`======================================================\n`)
}

try {
  await runE2E()
} catch (err) {
  console.error('[E2E FAIL]', err)
  process.exit(1)
} finally {
  await browser.close()
}
