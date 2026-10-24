import { chromium } from 'playwright';
import path from 'node:path';

const BASE_URL = 'http://127.0.0.1:5173';
const ARTIFACT_DIR = 'C:/Users/INDIA/.gemini/antigravity-ide/brain/d75a37c1-c172-425d-9ac7-8ca2df17ad16';

async function verifyBlueSidebar() {
  console.log('--- VERIFYING BLUE SIDEBAR WITH FULL WHITE TEXT ACROSS DASHBOARDS ---');
  const browser = await chromium.launch({ channel: 'chrome', headless: true });

  // 1. Super Admin Dashboard (with Staff Directory)
  {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });

    const superChip = page.locator('button.quick-chip:has-text("Super")').first();
    await superChip.click();
    await page.locator('.saas-sidebar').waitFor({ state: 'visible', timeout: 5000 });
    await page.waitForTimeout(800);

    const superAdminOverviewScreenshot = path.join(ARTIFACT_DIR, 'super_admin_blue_sidebar.png');
    await page.screenshot({ path: superAdminOverviewScreenshot, fullPage: false });
    console.log(` -> Saved Super Admin Blue Sidebar screenshot to: ${superAdminOverviewScreenshot}`);

    // Navigate to Staff Directory
    const staffDirNav = page.locator('.saas-nav-btn:has-text("Staff Directory")').first();
    await staffDirNav.click();
    await page.waitForTimeout(800);

    const staffDirScreenshot = path.join(ARTIFACT_DIR, 'staff_directory_blue_sidebar.png');
    await page.screenshot({ path: staffDirScreenshot, fullPage: false });
    console.log(` -> Saved Staff Directory with Blue Sidebar screenshot to: ${staffDirScreenshot}`);

    await context.close();
  }

  // 2. Shop Admin Dashboard
  {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });

    const shopAdminChip = page.locator('button.quick-chip:has-text("Shop Admin")').first();
    await shopAdminChip.click();
    await page.locator('.saas-sidebar').waitFor({ state: 'visible', timeout: 5000 });
    await page.waitForTimeout(800);

    const shopAdminScreenshot = path.join(ARTIFACT_DIR, 'shop_admin_blue_sidebar.png');
    await page.screenshot({ path: shopAdminScreenshot, fullPage: false });
    console.log(` -> Saved Shop Admin Blue Sidebar screenshot to: ${shopAdminScreenshot}`);

    await context.close();
  }

  // 3. Shop Staff Dashboard
  {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });

    const staffChip = page.locator('button.quick-chip:has-text("Staff")').first();
    await staffChip.click();
    await page.locator('.saas-sidebar').waitFor({ state: 'visible', timeout: 5000 });
    await page.waitForTimeout(800);

    const staffScreenshot = path.join(ARTIFACT_DIR, 'shop_staff_blue_sidebar.png');
    await page.screenshot({ path: staffScreenshot, fullPage: false });
    console.log(` -> Saved Shop Staff Blue Sidebar screenshot to: ${staffScreenshot}`);

    await context.close();
  }

  await browser.close();
  console.log('\n--- BLUE SIDEBAR VERIFICATION COMPLETE ---');
}

verifyBlueSidebar().catch(err => {
  console.error('Sidebar verification failed:', err);
  process.exit(1);
});
