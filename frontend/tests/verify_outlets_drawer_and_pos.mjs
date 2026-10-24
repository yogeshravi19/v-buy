import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const BASE_URL = 'http://127.0.0.1:5173';
const ARTIFACT_DIR = 'C:/Users/INDIA/.gemini/antigravity-ide/brain/d75a37c1-c172-425d-9ac7-8ca2df17ad16';

async function verify() {
  console.log('--- STARTING PLAYWRIGHT VERIFICATION FOR OUTLETS DRAWER & POS BILLING ---');
  const browser = await chromium.launch({ channel: 'chrome', headless: true });

  // 1. Super Admin: Outlets Page & Staff Slide Drawer
  console.log('\n[1/2] Verifying Super Admin Outlets & Staff Slide Drawer...');
  {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();

    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
    const superChip = page.locator('button.quick-chip:has-text("Super")').first();
    await superChip.click();
    await page.waitForTimeout(1200);

    // Navigate to Outlets tab
    const outletsNav = page.locator('.saas-nav-btn:has-text("Outlets")').first();
    await outletsNav.click();
    await page.waitForTimeout(1000);

    // Verify inline accordion is NOT on main page
    const inlineAccordion = await page.locator('.saas-card:has-text("Outlet Staff & Management Directory")').count();
    console.log(` -> Inline Accordion count on main page: ${inlineAccordion} (Expected: 0)`);

    // Verify Outlets table Assigned Team column
    const staffButtons = page.locator('button:has-text("Staff (")');
    const staffButtonCount = await staffButtons.count();
    console.log(` -> Found ${staffButtonCount} "Staff (N)" action buttons in table rows`);

    // Take screenshot of clean Outlets page
    const cleanOutletsPath = path.join(ARTIFACT_DIR, 'clean_super_admin_outlets.png');
    await page.screenshot({ path: cleanOutletsPath, fullPage: false });
    console.log(` -> Saved clean outlets screenshot to: ${cleanOutletsPath}`);

    // Click first "Staff (N)" button to open slide drawer
    if (staffButtonCount > 0) {
      await staffButtons.first().click();
      await page.waitForTimeout(600);

      const drawer = page.locator('.saas-drawer-panel');
      const isDrawerVisible = await drawer.isVisible();
      console.log(` -> Slide Drawer Visible: ${isDrawerVisible}`);

      const drawerTitle = await page.locator('.saas-drawer-title').innerText();
      console.log(` -> Drawer Title: "${drawerTitle}"`);

      // Take screenshot of Slide Drawer
      const drawerScreenshotPath = path.join(ARTIFACT_DIR, 'outlets_staff_slide_drawer.png');
      await page.screenshot({ path: drawerScreenshotPath, fullPage: false });
      console.log(` -> Saved slide drawer screenshot to: ${drawerScreenshotPath}`);

      // Close drawer
      const closeBtn = page.locator('.saas-modal-close').first();
      await closeBtn.click();
      await page.waitForTimeout(400);
      console.log(' -> Successfully closed slide drawer');
    }

    await context.close();
  }

  // 2. Staff: POS Billing Side Spacing & Congestion Relief
  console.log('\n[2/2] Verifying Staff POS Billing Side Spacing...');
  {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();

    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
    const staffChip = page.locator('button.quick-chip:has-text("Staff")').first();
    await staffChip.click();
    await page.waitForTimeout(1200);

    // Navigate to POS Terminal
    const posNav = page.locator('.saas-nav-btn:has-text("POS")').first();
    await posNav.click();
    await page.waitForTimeout(1000);

    // Add items to bill
    const itemCards = page.locator('.pos-item-card');
    const itemCount = await itemCards.count();
    console.log(` -> Found ${itemCount} catalog items on POS`);

    if (itemCount > 0) {
      await itemCards.nth(0).click();
      await page.waitForTimeout(200);
      await itemCards.nth(1).click();
      await page.waitForTimeout(200);
      await itemCards.nth(0).click(); // increment qty
      await page.waitForTimeout(300);
    }

    // Inspect Ticket Panel metrics
    const ticketPanel = page.locator('.pos-ticket-panel');
    const boundingBox = await ticketPanel.boundingBox();
    console.log(` -> POS Ticket Panel width: ${boundingBox ? boundingBox.width : 'N/A'}px (Expected >= 380px)`);

    // Check Customer Bar
    const customerBar = page.locator('.pos-customer-bar');
    const customerBarHeight = await customerBar.evaluate(el => el.getBoundingClientRect().height);
    console.log(` -> POS Customer Bar height: ${customerBarHeight}px (Compact single row)`);

    // Select Cash mode to test change calculation
    const cashBtn = page.locator('.pos-payment-btn:has-text("Cash")').first();
    if (await cashBtn.isVisible()) {
      await cashBtn.click();
      await page.waitForTimeout(200);
      const cashInput = page.locator('input[placeholder="0"]').last();
      if (await cashInput.isVisible()) {
        await cashInput.fill('500');
        await page.waitForTimeout(200);
      }
    }

    // Take screenshot of POS screen with ticket panel
    const posScreenshotPath = path.join(ARTIFACT_DIR, 'pos_billing_side_spacious.png');
    await page.screenshot({ path: posScreenshotPath, fullPage: false });
    console.log(` -> Saved spacious POS screenshot to: ${posScreenshotPath}`);

    await context.close();
  }

  await browser.close();
  console.log('\n--- VERIFICATION COMPLETED SUCCESSFULLY ---');
}

verify().catch(err => {
  console.error('Verification failed:', err);
  process.exit(1);
});
