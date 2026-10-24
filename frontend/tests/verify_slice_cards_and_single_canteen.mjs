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
  const sliceCards = page.locator('.group:has-text("Team:")');
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

  // Verify Edit Buttons exist on personnel cards
  const editBtns = page.locator('button:has-text("Edit")');
  const editBtnCount = await editBtns.count();
  console.log(` -> Found ${editBtnCount} Edit buttons on single canteen view`);

  const focusedScreenshot = path.join(ARTIFACT_DIR, 'single_canteen_focused_detail.png');
  await page.screenshot({ path: focusedScreenshot, fullPage: false });
  console.log(` -> Saved Focused Single Canteen screenshot to: ${focusedScreenshot}`);

  // 3. Test Clicking "Edit" on First Personnel Card to Open Edit Modal
  if (editBtnCount > 0) {
    console.log(' -> Clicking Edit button on first personnel card...');
    await editBtns.first().click();
    await page.waitForTimeout(400);

    const editModal = page.locator('.saas-modal-card:has-text("Edit Personnel Details")').first();
    const isEditModalVisible = await editModal.isVisible();
    console.log(` -> Edit Personnel Modal visible: ${isEditModalVisible}`);

    const editModalScreenshot = path.join(ARTIFACT_DIR, 'edit_personnel_modal.png');
    await page.screenshot({ path: editModalScreenshot, fullPage: false });
    console.log(` -> Saved Edit Personnel Modal screenshot to: ${editModalScreenshot}`);

    // Close Edit Modal safely
    const cancelBtn = editModal.locator('button:has-text("Cancel")').first();
    await cancelBtn.click();
    await page.waitForTimeout(300);
    console.log(' -> Closed Edit Personnel Modal safely');
  }

  // 4. Test Dropdown Switcher
  const dropdown = page.locator('select').first();
  await dropdown.selectOption({ index: 2 });
  await page.waitForTimeout(600);
  console.log(' -> Switched canteen via dropdown successfully');

  // 5. Return to All Canteens Overview
  const backAllBtn = page.locator('button:has-text("All Canteens")').first();
  if (await backAllBtn.isVisible()) {
    await backAllBtn.click();
    await page.waitForTimeout(600);
    const returnedToSlices = await page.locator('.group:has-text("Team:")').count();
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
