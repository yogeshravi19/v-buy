import { chromium } from 'playwright'

async function snap() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true })
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } })
  await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle' })
  const superChip = page.locator('button.quick-chip:has-text("Super")').first()
  if (await superChip.isVisible()) {
    await superChip.click()
    await page.waitForTimeout(1000)
  }
  await page.screenshot({ path: 'C:/Users/INDIA/.gemini/antigravity-ide/brain/d75a37c1-c172-425d-9ac7-8ca2df17ad16/scratch/super_admin_screen.png' })
  await page.goto('http://127.0.0.1:5173/admin/roles-permissions', { waitUntil: 'networkidle' })
  await page.waitForTimeout(1000)
  await page.screenshot({ path: 'C:/Users/INDIA/.gemini/antigravity-ide/brain/d75a37c1-c172-425d-9ac7-8ca2df17ad16/scratch/roles_permissions_screen.png' })
  await browser.close()
  console.log('Screenshots captured!')
}
snap().catch(console.error)
