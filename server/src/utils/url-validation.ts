import { lookup } from 'dns/promises'

// Private/reserved IP ranges that should not be used for webhooks (SSRF protection)
const PRIVATE_RANGES = [
  /^127\./, // 127.0.0.0/8 loopback
  /^10\./, // 10.0.0.0/8
  /^172\.(1[6-9]|2\d|3[01])\./, // 172.16.0.0/12
  /^192\.168\./, // 192.168.0.0/16
  /^169\.254\./, // 169.254.0.0/16 link-local
  /^0\./, // 0.0.0.0/8
  /^::1$/, // IPv6 loopback
  /^fc00:/, // IPv6 unique local
  /^fe80:/, // IPv6 link-local
]

function isPrivateIP(ip: string): boolean {
  return PRIVATE_RANGES.some(range => range.test(ip))
}

/**
 * Validate a webhook URL for safety:
 * - Must be valid URL
 * - Must be HTTPS (HTTP allowed only in development)
 * - Must not resolve to a private/reserved IP (SSRF protection)
 */
export async function validateWebhookUrl(url: string): Promise<{ valid: boolean; error?: string }> {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return { valid: false, error: 'Invalid URL format' }
  }

  // Protocol check
  const isDev = process.env.NODE_ENV === 'development'
  if (parsed.protocol !== 'https:' && !(isDev && parsed.protocol === 'http:')) {
    return { valid: false, error: 'Webhook URL must use HTTPS' }
  }

  // Reject localhost/loopback hostnames
  const hostname = parsed.hostname.toLowerCase()
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1' || hostname === '0.0.0.0') {
    if (!isDev) {
      return { valid: false, error: 'Webhook URL cannot point to localhost' }
    }
  }

  // DNS resolution check — reject private IPs (prevent DNS rebinding SSRF)
  if (!isDev) {
    try {
      const { address } = await lookup(hostname)
      if (isPrivateIP(address)) {
        return { valid: false, error: 'Webhook URL resolves to a private IP address' }
      }
    } catch {
      return { valid: false, error: 'Webhook URL hostname could not be resolved' }
    }
  }

  return { valid: true }
}
