import { chromium } from 'playwright'
import fs from 'fs'
import path from 'path'

const ARTIFACTS_DIR = 'C:/Users/INDIA/.gemini/antigravity-ide/brain/d75a37c1-c172-425d-9ac7-8ca2df17ad16/scratch'
if (!fs.existsSync(ARTIFACTS_DIR)) {
  fs.mkdirSync(ARTIFACTS_DIR, { recursive: true })
}

async function runVerification() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true })
  const results = { adminOutlets: null, posScreen: null, posWithCart: null }

  try {
    // ----------------------------------------------------
    // TEST 1: Super Admin Outlets Table Spacing
    // ----------------------------------------------------
    console.log('Testing Super Admin Outlets Table spacing...')
    const pageAdmin = await browser.newPage({ viewport: { width: 1440, height: 900 } })
    await pageAdmin.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded' })
    await pageAdmin.waitForTimeout(1000)

    // Click Super Admin Quick Chip
    const superAdminChip = pageAdmin.locator('button.quick-chip:has-text("Super")').first()
    if (await superAdminChip.isVisible()) {
      await superAdminChip.click()
      await pageAdmin.waitForTimeout(1500)
    }

    // Navigate to Outlets
    await pageAdmin.goto('http://127.0.0.1:5173/admin/outlets', { waitUntil: 'domcontentloaded' })
    await pageAdmin.waitForTimeout(2000)

    // Measure Table Metrics
    const tableMetrics = await pageAdmin.evaluate(() => {
      const table = document.querySelector('table.saas-data-table') || document.querySelector('table')
      if (!table) return { error: 'No table found' }

      const rows = Array.from(table.querySelectorAll('tbody tr'))
      const ths = Array.from(table.querySelectorAll('thead th')).map(th => {
        const cs = window.getComputedStyle(th)
        const rect = th.getBoundingClientRect()
        return {
          text: th.innerText.trim(),
          padding: cs.padding,
          fontSize: cs.fontSize,
          fontWeight: cs.fontWeight,
          width: Math.round(rect.width),
          height: Math.round(rect.height)
        }
      })

      const sampleCells = rows.length > 0 ? Array.from(rows[0].querySelectorAll('td')).map(td => {
        const cs = window.getComputedStyle(td)
        const rect = td.getBoundingClientRect()
        return {
          text: td.innerText.replace(/\n+/g, ' ').trim(),
          padding: cs.padding,
          fontSize: cs.fontSize,
          width: Math.round(rect.width),
          height: Math.round(rect.height)
        }
      }) : []

      const rowHeights = rows.map(r => Math.round(r.getBoundingClientRect().height))

      const container = table.closest('.overflow-x-auto') || table.parentElement
      const searchInput = document.querySelector('input[placeholder*="Search"]') || document.querySelector('input[type="text"]')
      const searchRect = searchInput ? searchInput.getBoundingClientRect() : null
      const searchCS = searchInput ? window.getComputedStyle(searchInput) : null

      return {
        tableWidth: Math.round(table.getBoundingClientRect().width),
        containerWidth: Math.round(container.getBoundingClientRect().width),
        scrollWidth: container.scrollWidth,
        clientWidth: container.clientWidth,
        hasHorizontalScroll: container.scrollWidth > container.clientWidth,
        ths,
        sampleCells,
        rowCount: rows.length,
        rowHeights: rowHeights.slice(0, 8),
        avgRowHeight: rowHeights.length ? Math.round(rowHeights.reduce((a, b) => a + b, 0) / rowHeights.length) : 0,
        searchBar: searchRect ? {
          width: Math.round(searchRect.width),
          height: Math.round(searchRect.height),
          padding: searchCS.padding
        } : null
      }
    })

    results.adminOutlets = tableMetrics
    console.log('Admin Outlets Table Metrics:', JSON.stringify(tableMetrics, null, 2))

    await pageAdmin.screenshot({ path: path.join(ARTIFACTS_DIR, 'verified_admin_outlets.png'), fullPage: false })
    await pageAdmin.close()

    // ----------------------------------------------------
    // TEST 2: POS Counter Screen on 1366x768 (Standard Desktop POS)
    // ----------------------------------------------------
    console.log('\nTesting POS Counter Screen on 1366x768...')
    const pagePos = await browser.newPage({ viewport: { width: 1366, height: 768 } })
    await pagePos.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded' })
    await pagePos.waitForTimeout(1000)

    // Click Shop Staff Chip
    const staffChip = pagePos.locator('button:has-text("Shop Staff")').first()
    if (await staffChip.isVisible()) {
      await staffChip.click()
      await pagePos.waitForTimeout(2000)
    }

    // Click POS nav item
    const posNav = pagePos.locator('.saas-nav-btn:has-text("POS")').first()
    if (await posNav.isVisible()) {
      await posNav.click()
      await pagePos.waitForTimeout(2000)
    }

    // Measure POS Screen Metrics (Empty Cart)
    const posEmptyMetrics = await pagePos.evaluate(() => {
      const placeOrderBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Place order'))
      const btnRect = placeOrderBtn ? placeOrderBtn.getBoundingClientRect() : null
      const ticketPanel = document.querySelector('.saas-body-pos') || document.querySelector('div.flex-1.flex.overflow-hidden')
      const windowHeight = window.innerHeight

      const categoryBar = document.querySelector('.no-scrollbar')
      const categoryBarRect = categoryBar ? categoryBar.getBoundingClientRect() : null

      const firstCard = document.querySelector('.grid > div')
      const cardRect = firstCard ? firstCard.getBoundingClientRect() : null

      return {
        viewportHeight: windowHeight,
        placeOrderButton: btnRect ? {
          top: Math.round(btnRect.top),
          bottom: Math.round(btnRect.bottom),
          height: Math.round(btnRect.height),
          isFullyVisible: btnRect.bottom <= windowHeight,
          bottomBreathingRoom: Math.round(windowHeight - btnRect.bottom)
        } : null,
        categoryBarHeight: categoryBarRect ? Math.round(categoryBarRect.height) : null,
        dishCardDimensions: cardRect ? {
          width: Math.round(cardRect.width),
          height: Math.round(cardRect.height)
        } : null
      }
    })

    results.posScreen = posEmptyMetrics
    console.log('POS Empty Metrics:', JSON.stringify(posEmptyMetrics, null, 2))
    await pagePos.screenshot({ path: path.join(ARTIFACTS_DIR, 'verified_pos_empty_1366.png') })

    // ----------------------------------------------------
    // TEST 3: Add Item to POS Cart & Re-measure
    // ----------------------------------------------------
    console.log('\nAdding dish to cart and testing checkout visibility...')
    const dishCard = pagePos.locator('.grid > div').first()
    if (await dishCard.isVisible()) {
      await dishCard.click()
      await pagePos.waitForTimeout(500)
      // Add another item or increment
      const secondCard = pagePos.locator('.grid > div').nth(1)
      if (await secondCard.isVisible()) {
        await secondCard.click()
        await pagePos.waitForTimeout(500)
      }
    }

    const posWithCartMetrics = await pagePos.evaluate(() => {
      const placeOrderBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Place order'))
      const btnRect = placeOrderBtn ? placeOrderBtn.getBoundingClientRect() : null
      const windowHeight = window.innerHeight

      const cartRows = Array.from(document.querySelectorAll('.flex-1.min-h-0.overflow-y-auto > div'))
      const ticketFooter = placeOrderBtn ? placeOrderBtn.closest('.border-t') : null
      const footerRect = ticketFooter ? ticketFooter.getBoundingClientRect() : null

      return {
        viewportHeight: windowHeight,
        cartItemsCount: cartRows.length,
        placeOrderButton: btnRect ? {
          text: placeOrderBtn.innerText.trim(),
          top: Math.round(btnRect.top),
          bottom: Math.round(btnRect.bottom),
          height: Math.round(btnRect.height),
          isFullyVisible: btnRect.bottom <= windowHeight,
          bottomBreathingRoom: Math.round(windowHeight - btnRect.bottom)
        } : null,
        footerDimensions: footerRect ? {
          top: Math.round(footerRect.top),
          bottom: Math.round(footerRect.bottom),
          height: Math.round(footerRect.height)
        } : null
      }
    })

    results.posWithCart = posWithCartMetrics
    console.log('POS With Cart Metrics:', JSON.stringify(posWithCartMetrics, null, 2))
    await pagePos.screenshot({ path: path.join(ARTIFACTS_DIR, 'verified_pos_with_cart_1366.png') })

    // Save full JSON report
    fs.writeFileSync(path.join(ARTIFACTS_DIR, 'spacing_verification_results.json'), JSON.stringify(results, null, 2))
    console.log('\nVerification complete! Screenshots and metrics saved to scratch directory.')

    await pagePos.close()
  } catch (err) {
    console.error('Verification error:', err)
  } finally {
    await browser.close()
  }
}

runVerification()
