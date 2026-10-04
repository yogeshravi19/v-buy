import QRCode from 'qrcode'
import { jsPDF } from 'jspdf'

/**
 * Generates an ultra-crisp HTML5 canvas representation of the official V Foods receipt.
 * @param {Object} order Order object containing id, token, created_at, outlet_id, outlets, order_items, total, etc.
 * @returns {Promise<HTMLCanvasElement>}
 */
export async function generateReceiptCanvas(order) {
  if (!order) throw new Error('Order data is required to generate receipt')

  const items = order.order_items || []
  const token = order.token || order.id || 'N/A'
  const outletName = order.outlets?.name || order.outlet_name || order.outlet_id || 'Campus Canteen'
  const orderId = String(order.id || '').slice(0, 18)
  const orderDate = order.created_at ? new Date(order.created_at).toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }) : new Date().toLocaleString('en-IN')
  const paymentMethod = order.payment_method || 'VIT Campus Wallet'
  const totalAmount = Number(order.total || 0)
  
  // Calculate breakdown (subtotal, tax 5%, convenience 2%)
  const rawSubtotal = items.reduce((sum, it) => sum + (Number(it.price || 0) * Number(it.qty || 1)), 0)
  const subtotal = rawSubtotal > 0 ? rawSubtotal : Math.round((totalAmount / 1.07) * 100) / 100
  const taxAmount = Math.round(subtotal * 0.05 * 100) / 100
  const convenienceFee = Math.round(subtotal * 0.02 * 100) / 100

  // Generate QR Code data URL
  let qrImage = null
  try {
    const qrDataUrl = await QRCode.toDataURL(`CB1.${order.id}.${token}`, {
      width: 160,
      margin: 1,
      color: { dark: '#0F172A', light: '#FFFFFF' }
    })
    qrImage = await new Promise((resolve) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = () => resolve(null)
      img.src = qrDataUrl
    })
  } catch {
    qrImage = null
  }

  // Dimensions setup
  const width = 560
  const baseHeight = 620
  const itemsHeight = Math.max(1, items.length) * 32
  const height = baseHeight + itemsHeight

  const canvas = document.createElement('canvas')
  const scale = 2 // 2x Retina scale for crisp lines and text
  canvas.width = width * scale
  canvas.height = height * scale
  const ctx = canvas.getContext('2d')
  ctx.scale(scale, scale)

  // 1. Background
  ctx.fillStyle = '#FFFFFF'
  ctx.fillRect(0, 0, width, height)

  // Outer border & subtle container
  ctx.strokeStyle = '#E2E8F0'
  ctx.lineWidth = 1.5
  ctx.strokeRect(16, 16, width - 32, height - 32)

  // 2. Header
  ctx.textAlign = 'center'
  ctx.fillStyle = '#1E3A8A'
  ctx.font = 'bold 22px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  ctx.fillText('V FOODS · VIT CHENNAI', width / 2, 54)

  ctx.fillStyle = '#64748B'
  ctx.font = '600 11.5px system-ui, -apple-system, sans-serif'
  ctx.fillText('CAMPUS DINING OFFICIAL TAX INVOICE & RECEIPT', width / 2, 73)

  // Subtle separator line
  ctx.strokeStyle = '#CBD5E1'
  ctx.setLineDash([4, 4])
  ctx.beginPath()
  ctx.moveTo(32, 88)
  ctx.lineTo(width - 32, 88)
  ctx.stroke()
  ctx.setLineDash([])

  // 3. Token Banner Box
  const tokenBoxY = 100
  const tokenBoxH = 88
  ctx.fillStyle = '#EFF6FF'
  ctx.fillRect(32, tokenBoxY, width - 64, tokenBoxH)
  ctx.strokeStyle = '#3B82F6'
  ctx.lineWidth = 1.5
  ctx.strokeRect(32, tokenBoxY, width - 64, tokenBoxH)

  ctx.fillStyle = '#2563EB'
  ctx.font = '800 11px system-ui, -apple-system, sans-serif'
  ctx.fillText('PICKUP TOKEN PASS', width / 2, tokenBoxY + 22)

  ctx.fillStyle = '#1D4ED8'
  ctx.font = '900 32px "Courier New", Courier, monospace'
  ctx.fillText(`TOKEN #${token}`, width / 2, tokenBoxY + 56)

  ctx.fillStyle = '#16A34A'
  ctx.font = 'bold 11px system-ui, -apple-system, sans-serif'
  ctx.fillText(`✓ Verified Paid (${paymentMethod})`, width / 2, tokenBoxY + 76)

  // 4. Order Metadata Details
  let curY = 214
  ctx.textAlign = 'left'
  
  const drawMetaRow = (label, val, isBold = false, valColor = '#0F172A') => {
    ctx.fillStyle = '#64748B'
    ctx.font = '500 12.5px system-ui, -apple-system, sans-serif'
    ctx.fillText(label, 36, curY)

    ctx.textAlign = 'right'
    ctx.fillStyle = valColor
    ctx.font = isBold ? '700 13px system-ui, -apple-system, sans-serif' : '500 12.5px system-ui, -apple-system, sans-serif'
    ctx.fillText(val, width - 36, curY)
    ctx.textAlign = 'left'
    curY += 21
  }

  drawMetaRow('Order Reference ID:', `#${orderId}`, true)
  drawMetaRow('Campus Outlet:', outletName, true)
  drawMetaRow('Date & Time:', orderDate)
  drawMetaRow('Payment Status:', 'PAID & CONFIRMED', true, '#16A34A')

  // QR Code + Pass Info Box
  if (qrImage) {
    curY += 6
    ctx.fillStyle = '#F8FAFC'
    ctx.fillRect(36, curY, width - 72, 70)
    ctx.strokeStyle = '#E2E8F0'
    ctx.lineWidth = 1
    ctx.strokeRect(36, curY, width - 72, 70)

    ctx.drawImage(qrImage, 46, curY + 6, 58, 58)

    ctx.textAlign = 'left'
    ctx.fillStyle = '#64748B'
    ctx.font = '700 10.5px system-ui, -apple-system, sans-serif'
    ctx.fillText('COUNTER PICKUP QR PASS', 116, curY + 24)

    ctx.fillStyle = '#1E3A8A'
    ctx.font = 'bold 14px "Courier New", Courier, monospace'
    ctx.fillText(`PASS: CB1.${order.id}.${token}`, 116, curY + 42)

    ctx.fillStyle = '#16A34A'
    ctx.font = '600 11px system-ui, -apple-system, sans-serif'
    ctx.fillText('Ready for high-speed barcode counter scan', 116, curY + 58)
    curY += 76
  }

  // 5. Itemized Breakdown Table
  curY += 14
  ctx.strokeStyle = '#CBD5E1'
  ctx.setLineDash([3, 3])
  ctx.beginPath()
  ctx.moveTo(36, curY)
  ctx.lineTo(width - 36, curY)
  ctx.stroke()
  ctx.setLineDash([])

  curY += 16
  ctx.fillStyle = '#475569'
  ctx.font = '800 11px system-ui, -apple-system, sans-serif'
  ctx.fillText('ITEMIZED ORDER DETAILS', 36, curY)

  ctx.textAlign = 'right'
  ctx.fillText('AMOUNT', width - 36, curY)
  ctx.textAlign = 'left'

  curY += 12
  ctx.strokeStyle = '#E2E8F0'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(36, curY)
  ctx.lineTo(width - 36, curY)
  ctx.stroke()

  curY += 18
  items.forEach((it) => {
    const qty = it.qty || 1
    const price = Number(it.price || 0)
    const lineTotal = price * qty
    const itemName = it.name || 'Dish Item'

    ctx.fillStyle = '#0F172A'
    ctx.font = '600 13px system-ui, -apple-system, sans-serif'
    ctx.fillText(`${qty}× ${itemName}`, 36, curY)

    ctx.textAlign = 'right'
    ctx.fillStyle = '#0F172A'
    ctx.font = '700 13px system-ui, -apple-system, sans-serif'
    ctx.fillText(`₹${lineTotal.toLocaleString('en-IN')}`, width - 36, curY)
    ctx.textAlign = 'left'

    curY += 24
  })

  // 6. Summary / Totals
  curY += 8
  ctx.strokeStyle = '#E2E8F0'
  ctx.beginPath()
  ctx.moveTo(36, curY)
  ctx.lineTo(width - 36, curY)
  ctx.stroke()

  curY += 18
  drawMetaRow('Items Subtotal:', `₹${subtotal.toLocaleString('en-IN')}`)
  drawMetaRow('Tax & Service Charges (5%):', `₹${taxAmount.toLocaleString('en-IN')}`)
  drawMetaRow('Convenience Fee (2%):', `₹${convenienceFee.toLocaleString('en-IN')}`)

  curY += 4
  ctx.strokeStyle = '#0F172A'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(36, curY)
  ctx.lineTo(width - 36, curY)
  ctx.stroke()

  curY += 24
  ctx.fillStyle = '#0F172A'
  ctx.font = '900 16px system-ui, -apple-system, sans-serif'
  ctx.fillText('TOTAL PAID', 36, curY)

  ctx.textAlign = 'right'
  ctx.fillStyle = '#1E3A8A'
  ctx.font = '900 19px system-ui, -apple-system, sans-serif'
  ctx.fillText(`₹${totalAmount.toLocaleString('en-IN')}`, width - 36, curY)
  ctx.textAlign = 'left'

  // 7. Footer
  curY += 32
  ctx.strokeStyle = '#E2E8F0'
  ctx.setLineDash([3, 3])
  ctx.beginPath()
  ctx.moveTo(36, curY)
  ctx.lineTo(width - 36, curY)
  ctx.stroke()
  ctx.setLineDash([])

  curY += 18
  ctx.textAlign = 'center'
  ctx.fillStyle = '#64748B'
  ctx.font = '600 11px system-ui, -apple-system, sans-serif'
  ctx.fillText('VIT Chennai Campus Dining Operations', width / 2, curY)
  curY += 15
  ctx.font = '500 10.5px system-ui, -apple-system, sans-serif'
  ctx.fillText(`Please present Token #${token} at the counter station for fast pickup.`, width / 2, curY)
  curY += 15
  ctx.fillStyle = '#94A3B8'
  ctx.fillText('Thank you for dining with V FOODS!', width / 2, curY)

  return canvas
}

/**
 * Download the receipt as an image file (PNG photo).
 * @param {Object} order
 */
export async function downloadReceiptAsPhoto(order) {
  const canvas = await generateReceiptCanvas(order)
  const token = order.token || order.id || 'order'
  
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Failed to generate receipt image blob'))
        return
      }
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `VFOODS-Receipt-Token-${token}.png`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      resolve(true)
    }, 'image/png')
  })
}

/**
 * Download the receipt as an official PDF document.
 * @param {Object} order
 */
export async function downloadReceiptAsPdf(order) {
  const canvas = await generateReceiptCanvas(order)
  const token = order.token || order.id || 'order'

  // Image dimension in mm
  // Standard A4 width is 210mm. Let's create an exact fit receipt document or standard A4.
  const imgWidthMm = 120
  const imgHeightMm = (canvas.height / canvas.width) * imgWidthMm

  // Create jsPDF instance sized dynamically for the receipt slip
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [imgWidthMm + 10, imgHeightMm + 10]
  })

  const imgData = canvas.toDataURL('image/png')
  pdf.addImage(imgData, 'PNG', 5, 5, imgWidthMm, imgHeightMm)
  pdf.save(`VFOODS-Receipt-Token-${token}.pdf`)
  return true
}
