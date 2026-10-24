import { chromium } from 'playwright'

async function debugPosAncestors() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true })
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } })

  await page.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded' })
  const staffChip = page.locator('button:has-text("Shop Staff")').first()
  if (await staffChip.isVisible()) {
    await staffChip.click()
    await page.waitForTimeout(2000)
  }

  const posNav = page.locator('.saas-nav-btn:has-text("POS")').first()
  if (await posNav.isVisible()) {
    await posNav.click()
    await page.waitForTimeout(1500)
  }

  const hierarchy = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'))
    const btn = buttons.find(b => b.innerText.includes('Place order'))
    if (!btn) return 'No button found with Place order'

    const elements = []
    let curr = btn
    while (curr && curr !== document.body) {
      elements.push({
        tag: curr.tagName,
        className: curr.className,
        style: curr.getAttribute('style'),
        rect: {
          top: Math.round(curr.getBoundingClientRect().top),
          bottom: Math.round(curr.getBoundingClientRect().bottom),
          height: Math.round(curr.getBoundingClientRect().height),
          width: Math.round(curr.getBoundingClientRect().width)
        },
        clientHeight: curr.clientHeight,
        scrollHeight: curr.scrollHeight
      })
      curr = curr.parentElement
    }
    return elements
  })

  console.log('ANCESTORS:', JSON.stringify(hierarchy, null, 2))
  await browser.close()
}

debugPosAncestors().catch(console.error)
