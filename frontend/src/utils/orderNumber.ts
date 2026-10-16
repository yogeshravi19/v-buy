/**
 * V Foods Single Source of Truth Order Number Formatter
 * 
 * Every dashboard (User, Shop Staff, Shop Admin, Super Admin), QR pass,
 * thermal receipt, and notification reads this exact helper.
 * Never reformats or alters the database assigned number.
 */

export interface OrderIdentifierLike {
  order_number?: string | number | null
  token?: string | number | null
  id?: string | number | null
  order_source?: string | null
}

export function formatOrderNumber(
  order: OrderIdentifierLike | string | number | null | undefined
): string {
  if (order === null || order === undefined) return '#---'

  const isPos = typeof order === 'object' && order?.order_source === 'POS'
  const prefix = isPos ? 'P-' : ''

  if (typeof order === 'string' || typeof order === 'number') {
    const clean = String(order).trim().replace(/^#+/, '')
    if (!clean || clean === '---') return '#---'
    const padded = clean.length < 3 && /^\d+$/.test(clean) ? clean.padStart(3, '0') : clean
    return `#${padded}`
  }

  const val = order.order_number ?? order.token
  if (val !== undefined && val !== null && String(val).trim() !== '') {
    const raw = String(val).trim().replace(/^#+/, '')
    if (!raw || raw === '---') return '#---'
    const clean = isPos && raw.startsWith('P-') ? raw.slice(2) : raw
    const padded = clean.length < 3 && /^\d+$/.test(clean) ? clean.padStart(3, '0') : clean
    return `#${prefix}${padded}`
  }

  // Fallback to internal ID only if both order_number and token are null
  if (order.id !== undefined && order.id !== null) {
    const cleanId = String(order.id).trim().replace(/^#+/, '')
    const padded = cleanId.length < 3 && /^\d+$/.test(cleanId) ? cleanId.padStart(3, '0') : cleanId
    return `#${prefix}${padded}`
  }

  return '#---'
}

export function getRawOrderNumber(
  order: OrderIdentifierLike | string | number | null | undefined
): string {
  return formatOrderNumber(order).replace(/^#/, '')
}

export function formatOrderQrToken(
  outletId: string,
  order: OrderIdentifierLike | string | number | null | undefined
): string {
  return `VFOOD:${outletId}:${getRawOrderNumber(order)}`
}

