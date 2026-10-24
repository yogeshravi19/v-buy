/**
 * V FOODS — Client Error Logger & Telemetry Sanitizer
 * Persists runtime errors and redirects to `app_error_log` mapped to stable Registry IDs.
 * 
 * Strict Privacy & Resilience Guarantees:
 * 1. Automatically strips tokens, emails, phone numbers, and secrets.
 * 2. Capped at 255 characters.
 * 3. Never throws; never blocks cart, checkout, POS, or user workflows.
 */

import { supabase } from './supabase'

export interface LogErrorParams {
  cardId: string
  role?: string
  route?: string
  endpoint?: string
  httpStatus?: number
  message: string
  requestId?: string
}

// Regex patterns to scrub sensitive customer & authentication data
const BEARER_REGEX = /Bearer\s+[A-Za-z0-9-_=.]+/gi
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
const PHONE_REGEX = /\b(?:\+91|91)?[6-9]\d{9}\b/g
const JWT_REGEX = /eyJ[A-Za-z0-9-_]+\.eyJ[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+/g
const OTP_REGEX = /\b(?:otp|password|pin|secret|token)\s*[:=]\s*["']?[A-Za-z0-9]+["']?/gi

export function sanitizeErrorMessage(rawMessage: string): string {
  if (!rawMessage || typeof rawMessage !== 'string') return 'Unknown Error'

  let cleaned = rawMessage
    .replace(BEARER_REGEX, '[TOKEN_REDACTED]')
    .replace(JWT_REGEX, '[JWT_REDACTED]')
    .replace(EMAIL_REGEX, '[EMAIL_REDACTED]')
    .replace(PHONE_REGEX, '[PHONE_REDACTED]')
    .replace(OTP_REGEX, '[SECRET_REDACTED]')
    .trim()

  // Hard truncate to 255 characters
  return cleaned.substring(0, 255)
}

export async function logAppError(params: LogErrorParams): Promise<void> {
  try {
    const cardId = params.cardId || 'R-UNKNOWN'
    const role = (params.role || 'user').toLowerCase()
    const route = params.route || (typeof window !== 'undefined' ? window.location.pathname : '/')
    const endpoint = params.endpoint || null
    const httpStatus = params.httpStatus || null
    const cleanMessage = sanitizeErrorMessage(params.message)
    const requestId = params.requestId || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : null)

    // Call stored procedure or direct insert
    if (supabase) {
      // Non-blocking invocation
      supabase.rpc('log_app_error', {
        p_card_id: cardId,
        p_role: role,
        p_route: route,
        p_endpoint: endpoint,
        p_http_status: httpStatus,
        p_short_message: cleanMessage,
        p_request_id: requestId
      }).then(({ error }: any) => {
        if (error) {
          // If RPC fails, try direct insert as graceful fallback
          supabase.from('app_error_log').insert({
            card_id: cardId,
            role,
            route,
            endpoint,
            http_status: httpStatus,
            short_message: cleanMessage,
            request_id: requestId
          }).catch(() => {})
        }
      }).catch(() => {})
    }
  } catch (err) {
    // Non-blocking guarantee: silently discard telemetry failure
  }
}

/**
 * Log enforced redirects for security and navigation observability
 */
export function logRedirectEvent(
  redirectId: string,
  fromPath: string,
  toPath: string,
  role: string,
  reason: string
): void {
  logAppError({
    cardId: redirectId,
    role,
    route: fromPath,
    message: `Redirect to ${toPath}: ${reason}`
  })
}
