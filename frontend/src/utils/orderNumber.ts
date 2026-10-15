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
}

export function formatOrderNumber(
  order: OrderIdentifierLike | string | number | null | undefined
): string {
  if (order === null || order === undefined) return '#---'

  if (typeof order === 'string' || typeof order === 'number') {
    const clean = String(order).trim().replace(/^#+/, '')
    if (!clean || clean === '---') return '#---'
    const padded = clean.length < 3 && /^\d+$/.test(clean) ? clean.padStart(3, '0') : clean
    return `#${padded}`
  }

  const val = order.order_number ?? order.token
  if (val !== undefined && val !== null && String(val).trim() !== '') {
    const clean = String(val).trim().replace(/^#+/, '')
    if (!clean || clean === '---') return '#---'
    const padded = clean.length < 3 && /^\d+$/.test(clean) ? clean.padStart(3, '0') : clean
    return `#${padded}`
  }

  // Fallback to internal ID only if both order_number and token are null
  if (order.id !== undefined && order.id !== null) {
    const cleanId = String(order.id).trim().replace(/^#+/, '')
    const padded = cleanId.length < 3 && /^\d+$/.test(cleanId) ? cleanId.padStart(3, '0') : cleanId
    return `#${padded}`
  }

  return '#---'
}

export function getRawOrderNumber(
  order: OrderIdentifierLike | string | number | null | undefined
): string {
  return formatOrderNumber(order).replace(/^#/, '')
}
