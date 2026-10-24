import { chromium } from 'playwright'

async function trace() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true })
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } })
  await page.goto('http://127.0.0.1:5173/')
  await page.waitForTimeout(1000)

  const staff = page.locator('button:has-text("Shop Staff")').first()
  if (await staff.isVisible()) {
    await staff.click()
    await page.waitForTimeout(1500)
  }

  const posNav = page.locator('.saas-nav-btn:has-text("POS")').first()
  if (await posNav.isVisible()) {
    await posNav.click()
    await page.waitForTimeout(1500)
  }

  // Add 1 item
  const card = page.locator('.grid > div').first()
  if (await card.isVisible()) {
    await card.click()
    await page.waitForTimeout(500)
  }

  const result = await page.evaluate(() => {
    const rules = []
    for (const s of document.styleSheets) {
      try {
        for (const r of s.cssRules) {
          if (r.selectorText && (r.selectorText.includes('py-3') || r.selectorText.includes('bg-emerald-600'))) {
            rules.push({ selector: r.selectorText, cssText: r.cssText })
          }
        }
      } catch (e) {}
    }
    return rules
  })

  console.log(JSON.stringify(result, null, 2))
  await browser.close()
}

trace().catch(console.error)
