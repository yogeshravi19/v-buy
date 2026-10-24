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

async function snapAfter() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true })

  for (const vp of VIEWPORTS) {
    console.log(`Snapping AFTER viewport: ${vp.name}`)
    const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } })

    // Landing
    await page.goto(`${BASE_URL}/welcome`, { waitUntil: 'networkidle' })
    await page.screenshot({ path: path.join(OUTPUT_DIR, `after_landing_${vp.name}.png`) })

    // User Browse
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' })
    await page.screenshot({ path: path.join(OUTPUT_DIR, `after_user_browse_${vp.name}.png`) })

    // Super Admin Outlets (The specific complaint screen!)
    await page.goto(`${BASE_URL}/admin/outlets`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1000)
    await page.screenshot({ path: path.join(OUTPUT_DIR, `after_admin_outlets_${vp.name}.png`) })

    // Shop Staff POS (The second specific complaint screen!)
    await page.goto(`${BASE_URL}/staff/pos`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1000)
    await page.screenshot({ path: path.join(OUTPUT_DIR, `after_staff_pos_${vp.name}.png`) })

    // Shop Admin Overview
    await page.goto(`${BASE_URL}/shop-admin`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1000)
    await page.screenshot({ path: path.join(OUTPUT_DIR, `after_shop_admin_${vp.name}.png`) })

    await page.close()
  }

  await browser.close()
  console.log('All AFTER screenshots captured successfully!')
}

snapAfter().catch(console.error)
