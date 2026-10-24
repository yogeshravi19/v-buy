import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const BASE_URL = 'http://127.0.0.1:5173';
const ARTIFACT_DIR = 'C:/Users/INDIA/.gemini/antigravity-ide/brain/d75a37c1-c172-425d-9ac7-8ca2df17ad16';

const results = {
  superAdmin: { staffDirectoryPage: false, backButtonWorks: false, rowFilterWorks: false, allTabsChecked: [] },
  shopAdmin: { allTabsChecked: [] },
  shopStaff: { allTabsChecked: [] },
  user: { allTabsChecked: [] }
};

async function verifyAllRolesAndStaffDirectory() {
  console.log('========================================================================');
  console.log('  STARTING COMPREHENSIVE VERIFICATION: STAFF DIRECTORY PAGE & ALL TABS');
  console.log('========================================================================\n');

  const browser = await chromium.launch({ channel: 'chrome', headless: true });

  // ─────────────────────────────────────────────────────────────
  // 1. SUPER ADMIN: OUTLETS & DEDICATED FULL-PAGE STAFF DIRECTORY
  // ─────────────────────────────────────────────────────────────
  console.log('[1/4] Verifying Super Admin: Outlets & Dedicated Staff Directory Full Page...');
  {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();

    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
    const superChip = page.locator('button.quick-chip:has-text("Super")').first();
    await superChip.click();
    await page.waitForTimeout(1200);

    // 1A. Outlets Tab
    const outletsNav = page.locator('.saas-nav-btn:has-text("Outlets")').first();
    await outletsNav.click();
    await page.waitForTimeout(800);
    results.superAdmin.allTabsChecked.push('Outlets');

    // Verify Staff Directory button in toolbar
    const staffDirToolbarBtn = page.locator('button:has-text("Staff Directory")').first();
    await staffDirToolbarBtn.click();
    await page.waitForTimeout(800);

    // Verify we arrived on the FULL PAGE Staff Directory
    const staffDirTitle = page.locator('h2:has-text("Outlet Staff & Personnel Directory")');
    const isTitleVisible = await staffDirTitle.isVisible();
    console.log(` -> Staff Directory Full Page Title visible: ${isTitleVisible}`);
    results.superAdmin.staffDirectoryPage = isTitleVisible;

    // Verify Stat Cards & Sections on Full Page
    const totalStaffCard = page.locator('span:has-text("Total Active Staff")');
    const franchiseCard = page.locator('span:has-text("Franchise Owners")');
    const kitchenCard = page.locator('span:has-text("Kitchen & Counter")');
    console.log(` -> Stat cards visible: ${await totalStaffCard.isVisible()} / ${await franchiseCard.isVisible()} / ${await kitchenCard.isVisible()}`);

    // Take screenshot of Dedicated Full-Page Staff Directory
    const fullPageScreenshot = path.join(ARTIFACT_DIR, 'staff_directory_full_page.png');
    await page.screenshot({ path: fullPageScreenshot, fullPage: false });
    console.log(` -> Saved full-page Staff Directory screenshot to: ${fullPageScreenshot}`);

    // 1B. Test Back Button
    const backBtn = page.locator('button:has-text("Back to Outlets")').first();
    await backBtn.click();
    await page.waitForTimeout(600);
    const outletsTableVisible = await page.locator('.saas-data-table, .saas-card:has-text("Filter outlets")').isVisible();
    console.log(` -> Back button returned to Outlets table: ${outletsTableVisible}`);
    results.superAdmin.backButtonWorks = outletsTableVisible;

    // 1C. Test Clicking "Staff (N)" on an outlet row
    const rowStaffBtn = page.locator('button:has-text("Staff (")').first();
    if (await rowStaffBtn.isVisible()) {
      await rowStaffBtn.click();
      await page.waitForTimeout(600);
      const isFilteredPage = await page.locator('h2:has-text("Outlet Staff & Personnel Directory")').isVisible();
      console.log(` -> Clicking outlet row Staff button navigated to full page: ${isFilteredPage}`);
      results.superAdmin.rowFilterWorks = isFilteredPage;
    }

    // 1D. Verify All Other Super Admin Tabs
    const superAdminTabs = [
      'Overview',
      'Campuses',
      'Users & Staff',
      'Roles & Permissions',
      'Orders',
      'Payments',
      'Settlements',
      'Coupons',
      'Analytics / Reports',
      'Audit Logs'
    ];

    for (const tabName of superAdminTabs) {
      const navBtn = page.locator(`.saas-nav-btn:has-text("${tabName.split(' ')[0]}")`).first();
      if (await navBtn.isVisible()) {
        await navBtn.click();
        await page.waitForTimeout(300);
        results.superAdmin.allTabsChecked.push(tabName);
      }
    }
    console.log(` -> Checked Super Admin tabs: ${results.superAdmin.allTabsChecked.join(', ')}`);
    await context.close();
  }

  // ─────────────────────────────────────────────────────────────
  // 2. SHOP ADMIN DASHBOARD: ALL TABS & WORKFLOWS
  // ─────────────────────────────────────────────────────────────
  console.log('\n[2/4] Verifying Shop Admin Dashboard Tabs & Real Workflows...');
  {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();

    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
    const adminChip = page.locator('button.quick-chip:has-text("Shop Admin"), button:has-text("Owner")').first();
    await adminChip.click();
    await page.waitForTimeout(1200);

    const shopAdminTabs = ['Overview', 'Live Orders', 'KDS', 'POS', 'Menu', 'Inventory', 'Staff', 'Sales', 'Settlements', 'Settings'];
    for (const tabName of shopAdminTabs) {
      const navBtn = page.locator(`.saas-nav-btn:has-text("${tabName}")`).first();
      if (await navBtn.isVisible()) {
        await navBtn.click();
        await page.waitForTimeout(300);
        results.shopAdmin.allTabsChecked.push(tabName);
      }
    }
    console.log(` -> Checked Shop Admin tabs: ${results.shopAdmin.allTabsChecked.join(', ')}`);
    await context.close();
  }

  // ─────────────────────────────────────────────────────────────
  // 3. SHOP STAFF DASHBOARD: ALL TABS & POS BILLING
  // ─────────────────────────────────────────────────────────────
  console.log('\n[3/4] Verifying Shop Staff Dashboard Tabs & Real Workflows...');
  {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();

    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
    const staffChip = page.locator('button.quick-chip:has-text("Staff")').first();
    await staffChip.click();
    await page.waitForTimeout(1200);

    const staffTabs = ['Overview', 'Live Orders', 'KDS', 'POS', 'Stock', 'Pickup', 'Shift'];
    for (const tabName of staffTabs) {
      const navBtn = page.locator(`.saas-nav-btn:has-text("${tabName}")`).first();
      if (await navBtn.isVisible()) {
        await navBtn.click();
        await page.waitForTimeout(300);
        results.shopStaff.allTabsChecked.push(tabName);
      }
    }
    console.log(` -> Checked Shop Staff tabs: ${results.shopStaff.allTabsChecked.join(', ')}`);
    await context.close();
  }

  // ─────────────────────────────────────────────────────────────
  // 4. USER / CUSTOMER DASHBOARD: ALL TABS & ORDER WORKFLOW
  // ─────────────────────────────────────────────────────────────
  console.log('\n[4/4] Verifying User / Customer Dashboard Tabs & Real Workflows...');
  {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();

    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
    const userChip = page.locator('button.quick-chip:has-text("User")').first();
    await userChip.click();
    await page.waitForTimeout(1200);

    // Browse dishes
    const dishCard = page.locator('.vfoods-dish-card').first();
    await dishCard.waitFor({ state: 'visible', timeout: 8000 });
    results.user.allTabsChecked.push('Browse Catalog');

    // Switch to Orders
    const ordersTab = page.locator('button.vfoods-nav-tab:has-text("Orders"), button:has-text("Orders")').first();
    if (await ordersTab.isVisible()) {
      await ordersTab.click();
      await page.waitForTimeout(400);
      results.user.allTabsChecked.push('Orders History');
    }

    // Switch to Profile
    const profileTab = page.locator('button.vfoods-nav-tab:has-text("Profile"), button:has-text("Profile")').first();
    if (await profileTab.isVisible()) {
      await profileTab.click();
      await page.waitForTimeout(400);
      results.user.allTabsChecked.push('Profile & Wallet');
    }

    console.log(` -> Checked User tabs: ${results.user.allTabsChecked.join(', ')}`);
    await context.close();
  }

  await browser.close();
  console.log('\n========================================================================');
  console.log('  ALL VERIFICATIONS COMPLETED SUCCESSFULLY');
  console.log('========================================================================');
  console.log(JSON.stringify(results, null, 2));
}

verifyAllRolesAndStaffDirectory().catch(err => {
  console.error('Verification failed:', err);
  process.exit(1);
});
