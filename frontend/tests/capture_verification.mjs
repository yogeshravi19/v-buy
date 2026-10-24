import { chromium } from 'playwright'

const BASE_URL = process.env.VITE_APP_URL || 'http://127.0.0.1:5173'
const ARTIFACT_DIR = 'C:/Users/INDIA/.gemini/antigravity-ide/brain/d75a37c1-c172-425d-9ac7-8ca2df17ad16/scratch'

async function capture() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true })
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 950 } })
    const page = await context.newPage()

    await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(1500)

    // Switch to Super Admin
    const superChip = page.locator('button.quick-chip:has-text("Super")').first()
    await superChip.waitFor({ state: 'visible', timeout: 8000 })
    await superChip.click()
    await page.waitForTimeout(1500)

    // 1. Capture Super Admin Dashboard overview (to verify upper sidebar outlet box is removed)
    await page.screenshot({ path: `${ARTIFACT_DIR}/super_admin_clean_sidebar.png`, fullPage: false })
    console.log('[OK] Captured super_admin_clean_sidebar.png')

    // 2. Click Roles & Permissions
    const rolesBtn = page.locator('button:has-text("Roles & Permissions")').first()
    await rolesBtn.click()
    await page.waitForTimeout(1500)

    // Capture initial Capability Matrix
    await page.screenshot({ path: `${ARTIFACT_DIR}/roles_permissions_editable.png`, fullPage: false })
    console.log('[OK] Captured roles_permissions_editable.png')

    // 3. Test interactivity: click "Grant Full Access"
    const grantAllBtn = page.locator('button:has-text("Grant Full Access")').first()
    await grantAllBtn.click()
    await page.waitForTimeout(600)

    // Click "Save Matrix"
    const saveBtn = page.locator('button:has-text("Save Matrix")').first()
    await saveBtn.click()
    await page.waitForTimeout(600)

    // Capture after full access granted and saved
    await page.screenshot({ path: `${ARTIFACT_DIR}/roles_permissions_full_access_saved.png`, fullPage: false })
    console.log('[OK] Captured roles_permissions_full_access_saved.png')

    // 4. Click Developer System Map
    const sysMapBtn = page.locator('button:has-text("Developer System Map")').first()
    await sysMapBtn.click()
    await page.waitForTimeout(1500)
    await page.screenshot({ path: `${ARTIFACT_DIR}/system_map_clean_cards.png`, fullPage: false })
    console.log('[OK] Captured system_map_clean_cards.png')

  } finally {
    await browser.close()
  }
}

capture().catch(err => {
  console.error('Error capturing screenshots:', err)
  process.exit(1)
})
