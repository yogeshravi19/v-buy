import { chromium } from 'playwright'

async function inspectAdminOutlets() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true })
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } })

  // 1. Authenticate as Super Admin
  await page.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded' })
  const superChip = page.locator('button.quick-chip:has-text("Super")').first()
  if (await superChip.isVisible({ timeout: 4000 })) {
    await superChip.click()
    await page.waitForTimeout(1500)
  }

  // Navigate to Outlets
  const outletsNav = page.locator('.saas-nav-btn:has-text("Outlets")').first()
  if (await outletsNav.isVisible({ timeout: 4000 })) {
    await outletsNav.click()
    await page.waitForTimeout(1000)
  } else {
    await page.goto('http://127.0.0.1:5173/admin/outlets', { waitUntil: 'networkidle' })
    await page.waitForTimeout(1000)
  }

  // Measure Table & Layout
  const tableMetrics = await page.evaluate(() => {
    const table = document.querySelector('table')
    if (!table) return null

    const ths = Array.from(table.querySelectorAll('th')).map(th => ({
      text: th.innerText.trim(),
      width: Math.round(th.getBoundingClientRect().width),
      left: Math.round(th.getBoundingClientRect().left),
      padding: window.getComputedStyle(th).padding,
      textAlign: window.getComputedStyle(th).textAlign
    }))

    const firstRowCells = Array.from(table.querySelectorAll('tbody tr:first-child td')).map(td => ({
      text: td.innerText.trim(),
      width: Math.round(td.getBoundingClientRect().width),
      left: Math.round(td.getBoundingClientRect().left),
      padding: window.getComputedStyle(td).padding
    }))

    const rowHeights = Array.from(table.querySelectorAll('tbody tr')).slice(0, 5).map(tr => Math.round(tr.getBoundingClientRect().height))

    const tableRect = table.getBoundingClientRect()
    const container = table.closest('.saas-card') || table.parentElement
    const containerRect = container ? container.getBoundingClientRect() : null

    // Cards
    const cards = Array.from(document.querySelectorAll('.grid > div')).map(c => ({
      height: Math.round(c.getBoundingClientRect().height),
      width: Math.round(c.getBoundingClientRect().width)
    }))

    // Search bar
    const searchBar = document.querySelector('input[placeholder*="Filter"]')
    const searchRect = searchBar ? {
      width: Math.round(searchBar.getBoundingClientRect().width),
      height: Math.round(searchBar.getBoundingClientRect().height),
      top: Math.round(searchBar.getBoundingClientRect().top)
    } : null

    return {
      tableWidth: Math.round(tableRect.width),
      containerWidth: containerRect ? Math.round(containerRect.width) : null,
      scrollLeft: table.parentElement ? table.parentElement.scrollLeft : null,
      ths,
      firstRowCells,
      rowHeights,
      cards,
      searchRect
    }
  })

  console.log('TABLE METRICS:', JSON.stringify(tableMetrics, null, 2))
  await page.screenshot({ path: 'C:/Users/INDIA/.gemini/antigravity-ide/brain/d75a37c1-c172-425d-9ac7-8ca2df17ad16/scratch/admin_outlets_live.png' })

  // 2. Authenticate as Staff and Inspect POS
  await page.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded' })
  const staffChip = page.locator('button.quick-chip:has-text("Staff")').first()
  if (await staffChip.isVisible({ timeout: 4000 })) {
    await staffChip.click()
    await page.waitForTimeout(1500)
  }

  const posNav = page.locator('.saas-nav-btn:has-text("POS")').first()
  if (await posNav.isVisible({ timeout: 4000 })) {
    await posNav.click()
    await page.waitForTimeout(1000)
  }

  const posMetrics = await page.evaluate(() => {
    const ticketPanel = document.querySelector('.hidden.md\\:flex')
    const dishGrid = document.querySelector('.grid')
    const firstDish = dishGrid ? dishGrid.querySelector('div') : null
    const stepperBtn = document.querySelector('button[aria-label="Increase quantity"]')

    return {
      ticketPanelWidth: ticketPanel ? Math.round(ticketPanel.getBoundingClientRect().width) : null,
      dishGridCols: dishGrid ? window.getComputedStyle(dishGrid).gridTemplateColumns : null,
      firstDishWidth: firstDish ? Math.round(firstDish.getBoundingClientRect().width) : null,
      firstDishHeight: firstDish ? Math.round(firstDish.getBoundingClientRect().height) : null,
      stepperBtnSize: stepperBtn ? {
        w: Math.round(stepperBtn.getBoundingClientRect().width),
        h: Math.round(stepperBtn.getBoundingClientRect().height)
      } : null
    }
  })

  console.log('POS METRICS:', JSON.stringify(posMetrics, null, 2))
  await page.screenshot({ path: 'C:/Users/INDIA/.gemini/antigravity-ide/brain/d75a37c1-c172-425d-9ac7-8ca2df17ad16/scratch/staff_pos_live.png' })

  await browser.close()
}

inspectAdminOutlets().catch(console.error)
