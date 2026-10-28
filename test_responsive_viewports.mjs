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

const VIEWPORTS = [
  { name: 'Mobile_390x844', width: 390, height: 844 },
  { name: 'Tablet_768x1024', width: 768, height: 1024 },
  { name: 'Laptop_1366x768', width: 1366, height: 768 },
  { name: 'Desktop_1920x1080', width: 1920, height: 1080 }
]

const ROLES = [
  { name: 'User', email: userEmail, pass: userPass },
  { name: 'Staff', email: staffEmail, pass: staffPass },
  { name: 'ShopAdmin', email: adminEmail, pass: adminPass },
  { name: 'SuperAdmin', email: superAdminEmail, pass: superAdminPass }
]

const browser = await chromium.launch({ headless: true })
const report = []

console.log(`\n======================================================`)
console.log(`MEASURING RESPONSIVENESS ACROSS 4 VIEWPORTS & 4 ROLES`)
console.log(`======================================================\n`)

for (const vp of VIEWPORTS) {
  console.log(`>>> VIEWPORT: ${vp.name} (${vp.width}x${vp.height})`)

  for (const role of ROLES) {
    const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } })
    const page = await context.newPage()

    try {
      await page.goto('http://localhost:5199/')
      await page.waitForSelector('#login-identifier')
      await page.fill('#login-identifier', role.email)
      await page.fill('#login-password', role.pass)
      await page.click('button[type="submit"]')

      const waitTarget = role.name === 'User' 
        ? 'button.vfoods-profile-avatar-btn, button[title="Account Menu"], .food-court-card'
        : '.saas-main, .saas-topbar, .saas-mobile-toggle, header'
      await page.waitForSelector(waitTarget, { timeout: 15000 })

      // Settle
      await page.waitForTimeout(1000)

      // Measure layout metrics
      const metrics = await page.evaluate(() => {
        const doc = document.documentElement
        const body = document.body
        const scrollWidth = Math.max(doc.scrollWidth, body.scrollWidth)
        const clientWidth = doc.clientWidth
        const hasHorizontalOverflow = scrollWidth > clientWidth

        return {
          scrollWidth,
          clientWidth,
          hasHorizontalOverflow,
          overflowDelta: Math.max(0, scrollWidth - clientWidth)
        }
      })

      const screenshotName = `responsive_${role.name.toLowerCase()}_${vp.name}.png`
      await page.screenshot({ path: `E:/vfoods-evidence/screenshots/${screenshotName}` })

      console.log(`  [PASS] ${role.name}: overflow=${metrics.hasHorizontalOverflow ? `YES (+${metrics.overflowDelta}px)` : 'NO (0px)'} -> ${screenshotName}`)
      report.push({
        viewport: vp.name,
        width: vp.width,
        height: vp.height,
        role: role.name,
        metrics,
        screenshot: screenshotName,
        status: metrics.hasHorizontalOverflow ? 'WARNING' : 'PASS'
      })

      // Sign out
      if (role.name === 'User') {
        const avatar = page.locator('button.vfoods-profile-avatar-btn, button[title="Account Menu"]').first()
        if (await avatar.isVisible()) {
          await avatar.click()
          await page.waitForTimeout(300)
          const signout = page.locator('button.vfoods-profile-dd-item.danger, button:has-text("Sign Out")').first()
          if (await signout.isVisible()) await signout.click()
        }
      } else {
        const toggle = page.locator('.saas-mobile-toggle').first()
        if (await toggle.isVisible()) {
          await toggle.click()
          await page.waitForTimeout(300)
        }
        const signout = page.locator('button[title="Sign Out"]').first()
        if (await signout.isVisible()) await signout.click()
      }
    } catch (err) {
      console.error(`  [FAIL] ${role.name} on ${vp.name}: ${err.message}`)
      report.push({
        viewport: vp.name,
        role: role.name,
        status: 'ERROR',
        error: err.message
      })
    } finally {
      await context.close()
    }
  }
}

await browser.close()

fs.writeFileSync('E:/vfoods-evidence/RESPONSIVE_REPORT.json', JSON.stringify(report, null, 2))
console.log(`\n======================================================`)
console.log(`RESPONSIVE MEASUREMENT SUITE FINISHED`)
console.log(`Report saved to E:/vfoods-evidence/RESPONSIVE_REPORT.json`)
console.log(`======================================================\n`)
