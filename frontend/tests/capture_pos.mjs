import { chromium } from 'playwright'

async function capturePos() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true })
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } })

  await page.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1000)

  // Click Shop Staff chip
  const staffChip = page.locator('button:has-text("Shop Staff")').first()
  if (await staffChip.isVisible()) {
    await staffChip.click()
    await page.waitForTimeout(2000)
  }

  // Click POS nav item
  const posNav = page.locator('.saas-nav-btn:has-text("POS")').first()
  if (await posNav.isVisible()) {
    await posNav.click()
    await page.waitForTimeout(1500)
  }

  await page.screenshot({ path: 'C:/Users/INDIA/.gemini/antigravity-ide/brain/d75a37c1-c172-425d-9ac7-8ca2df17ad16/scratch/pos_actual_screen.png' })
  await browser.close()
  console.log('POS screenshot captured!')
}

capturePos().catch(console.error)
