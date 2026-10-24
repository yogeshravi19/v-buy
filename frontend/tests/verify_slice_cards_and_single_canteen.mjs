import { chromium } from 'playwright';
import path from 'node:path';

const BASE_URL = 'http://127.0.0.1:5173';
const ARTIFACT_DIR = 'C:/Users/INDIA/.gemini/antigravity-ide/brain/d75a37c1-c172-425d-9ac7-8ca2df17ad16';

async function verifySliceCards() {
  console.log('--- VERIFYING CANTEEN SLICE CARDS & FOCUSED CANTEEN VIEW ---');
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
  const superChip = page.locator('button.quick-chip:has-text("Super")').first();
  await superChip.click();
  await page.waitForTimeout(1200);

  // Navigate to Staff Directory
  const staffDirNav = page.locator('.saas-nav-btn:has-text("Staff Directory")').first();
  await staffDirNav.click();
  await page.waitForTimeout(1000);

  // Verify Developer System Map is completely removed
  const devMapNav = page.locator('text="Developer System Map"');
  const devMapCount = await devMapNav.count();
  console.log(` -> "Developer System Map" occurrences in UI: ${devMapCount} (Expected 0)`);

  // 1. Verify Slice Cards Overview
  const sliceCards = page.locator('.group:has-text("Total Team")');
  const sliceCount = await sliceCards.count();
  console.log(` -> Found ${sliceCount} Canteen Slice Cards (Expected ~20)`);

  const sliceCardsScreenshot = path.join(ARTIFACT_DIR, 'canteen_slice_cards_overview.png');
  await page.screenshot({ path: sliceCardsScreenshot, fullPage: false });
  console.log(` -> Saved Canteen Slice Cards overview to: ${sliceCardsScreenshot}`);

  // 2. Click a Canteen Slice Card to slice into that canteen
  const firstSliceCard = sliceCards.first();
  const canteenTitle = await firstSliceCard.locator('h3').first().innerText();
  console.log(` -> Clicking Canteen Slice Card: "${canteenTitle}"...`);
  await firstSliceCard.click();
  await page.waitForTimeout(800);

  // Verify Single Canteen Focused View
  const viewAllBtn = page.locator('button:has-text("All Canteens")').first();
  console.log(` -> "All Canteens" button visible: ${await viewAllBtn.isVisible()}`);

  const focusedCanteenBanner = page.locator(`h3:has-text("${canteenTitle}")`);
  console.log(` -> Focused Canteen Banner visible: ${await focusedCanteenBanner.isVisible()}`);

  const focusedScreenshot = path.join(ARTIFACT_DIR, 'single_canteen_focused_detail.png');
  await page.screenshot({ path: focusedScreenshot, fullPage: false });
  console.log(` -> Saved Focused Single Canteen screenshot to: ${focusedScreenshot}`);

  // 3. Test Dropdown Switcher
  const dropdown = page.locator('select').first();
  await dropdown.selectOption({ index: 2 });
  await page.waitForTimeout(600);
  console.log(' -> Switched canteen via dropdown successfully');

  // 4. Return to All Canteens Overview
  const backAllBtn = page.locator('button:has-text("All Canteens")').first();
  if (await backAllBtn.isVisible()) {
    await backAllBtn.click();
    await page.waitForTimeout(600);
    const returnedToSlices = await page.locator('.group:has-text("Total Team")').count();
    console.log(` -> Returned to Slice Cards overview (${returnedToSlices} slice cards visible)`);
  }

  await context.close();
  await browser.close();
  console.log('\n--- SLICE CARDS & SINGLE CANTEEN VERIFICATION COMPLETE ---');
}

verifySliceCards().catch(err => {
  console.error('Slice cards verification failed:', err);
  process.exit(1);
});
