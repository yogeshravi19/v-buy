import { chromium } from 'playwright'

async function findZeroPadding() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true })
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } })

  await page.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded' })
  const superChip = page.locator('button.quick-chip:has-text("Super")').first()
  if (await superChip.isVisible({ timeout: 4000 })) {
    await superChip.click()
    await page.waitForTimeout(1500)
  }

  const outletsNav = page.locator('.saas-nav-btn:has-text("Outlets")').first()
  if (await outletsNav.isVisible({ timeout: 4000 })) {
    await outletsNav.click()
    await page.waitForTimeout(1000)
  }

  const res = await page.evaluate(() => {
    const td = document.querySelector('table tbody tr td')
    if (!td) return 'No td'

    // Let's inspect the td element directly
    const outerHtml = td.outerHTML
    const classList = Array.from(td.classList)
    
    // Check if any rule in any sheet has .px-4 or .py-3
    let matchingRules = []
    for (const sheet of document.styleSheets) {
      try {
        for (const rule of sheet.cssRules) {
          if (rule.selectorText) {
            for (const cls of classList) {
              if (rule.selectorText.includes(cls)) {
                matchingRules.push({ cls, selector: rule.selectorText, cssText: rule.cssText })
              }
            }
          }
        }
      } catch (e) {}
    }

    return {
      outerHtml,
      classList,
      matchingRules
    }
  })

  console.log('RESULT:', JSON.stringify(res, null, 2))
  await browser.close()
}

findZeroPadding().catch(console.error)
