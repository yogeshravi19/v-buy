import { chromium } from 'playwright'
import fs from 'fs'
import path from 'path'

const VIEWPORTS = [
  { name: 'mobile', width: 390, height: 844 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'laptop', width: 1366, height: 768 },
  { name: 'desktop', width: 1920, height: 1080 }
]

const BASE_URL = 'http://127.0.0.1:5173'
const OUTPUT_DIR = 'C:/Users/INDIA/.gemini/antigravity-ide/brain/d75a37c1-c172-425d-9ac7-8ca2df17ad16/audit_screenshots'

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true })
}

async function runAudit() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true })
  const report = []

  for (const vp of VIEWPORTS) {
    console.log(`Auditing viewport: ${vp.name} (${vp.width}x${vp.height})`)
    const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } })

    // Test Welcome / Landing
    await page.goto(`${BASE_URL}/welcome`, { waitUntil: 'networkidle' })
    const landingShot = path.join(OUTPUT_DIR, `before_landing_${vp.name}.png`)
    await page.screenshot({ path: landingShot, fullPage: false })
    report.push({ screen: 'Landing Page', viewport: vp.name, shot: landingShot })

    // Test User Browse
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' })
    const userBrowseShot = path.join(OUTPUT_DIR, `before_user_browse_${vp.name}.png`)
    await page.screenshot({ path: userBrowseShot, fullPage: false })
    report.push({ screen: 'User Browse', viewport: vp.name, shot: userBrowseShot })

    // Test Super Admin Outlets
    await page.goto(`${BASE_URL}/admin/outlets`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1000)
    const adminOutletsShot = path.join(OUTPUT_DIR, `before_admin_outlets_${vp.name}.png`)
    await page.screenshot({ path: adminOutletsShot, fullPage: false })
    report.push({ screen: 'Super Admin Outlets', viewport: vp.name, shot: adminOutletsShot })

    // Test Shop Staff POS
    await page.goto(`${BASE_URL}/staff/pos`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1000)
    const staffPosShot = path.join(OUTPUT_DIR, `before_staff_pos_${vp.name}.png`)
    await page.screenshot({ path: staffPosShot, fullPage: false })
    report.push({ screen: 'Shop Staff POS', viewport: vp.name, shot: staffPosShot })

    // Test Shop Admin Overview
    await page.goto(`${BASE_URL}/shop-admin`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1000)
    const shopAdminShot = path.join(OUTPUT_DIR, `before_shop_admin_${vp.name}.png`)
    await page.screenshot({ path: shopAdminShot, fullPage: false })
    report.push({ screen: 'Shop Admin Overview', viewport: vp.name, shot: shopAdminShot })

    await page.close()
  }

  await browser.close()
  console.log('Baseline screenshots completed. Total captured:', report.length)
}

runAudit().catch(console.error)
