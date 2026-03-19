import cron from 'node-cron'
import crypto from 'crypto'
import { getSupabase } from './supabase.js'
import { validateWebhookUrl } from './utils/url-validation.js'

/**
 * Webhook queue processor — delivers queued webhooks with retry logic.
 * Runs every 30 seconds via node-cron.
 */
export function startWebhookProcessor(): void {
  cron.schedule('*/30 * * * * *', async () => {
    try {
      await processQueue()
    } catch (err) {
      console.error('Webhook processor error:', err)
    }
  })
}

async function processQueue(): Promise<void> {
  const sb = getSupabase()

  // Fetch pending items ready for delivery
  const { data: items, error } = await sb
    .from('webhook_queue')
    .select('*, webhooks(url, secret)')
    .is('completed_at', null)
    .is('failed_at', null)
    .lte('next_retry_at', new Date().toISOString())
    .lt('attempts', 5)
    .order('created_at', { ascending: true })
    .limit(10)

  if (error || !items?.length) return

  for (const item of items) {
    const webhook = item.webhooks as { url: string; secret: string }
    if (!webhook) continue

    // SSRF protection: validate URL before delivery
    const urlCheck = await validateWebhookUrl(webhook.url)
    if (!urlCheck.valid) {
      await handleFailure(sb, item, `URL validation failed: ${urlCheck.error}`)
      continue
    }

    try {
      const payload = JSON.stringify(item.payload)
      const signature = crypto
        .createHmac('sha256', webhook.secret)
        .update(payload)
        .digest('hex')

      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-LaunchCue-Signature': `sha256=${signature}`,
          'X-LaunchCue-Event': item.event,
        },
        body: payload,
        signal: AbortSignal.timeout(10000), // 10s timeout
      })

      if (response.ok) {
        // Mark as completed
        await sb
          .from('webhook_queue')
          .update({ completed_at: new Date().toISOString(), attempts: item.attempts + 1 })
          .eq('id', item.id)
      } else {
        await handleFailure(sb, item, `HTTP ${response.status}`)
      }
    } catch (err) {
      await handleFailure(sb, item, (err as Error).message)
    }
  }
}

async function handleFailure(
  sb: ReturnType<typeof getSupabase>,
  item: { id: string; attempts: number; max_attempts: number },
  errorMsg: string
): Promise<void> {
  const nextAttempt = item.attempts + 1

  if (nextAttempt >= item.max_attempts) {
    // Max retries reached — mark as failed
    await sb
      .from('webhook_queue')
      .update({
        failed_at: new Date().toISOString(),
        attempts: nextAttempt,
        last_error: errorMsg,
      })
      .eq('id', item.id)
  } else {
    // Exponential backoff: 30s, 2m, 8m, 32m
    const backoffMs = Math.pow(4, nextAttempt) * 30000
    const nextRetry = new Date(Date.now() + backoffMs).toISOString()

    await sb
      .from('webhook_queue')
      .update({
        attempts: nextAttempt,
        next_retry_at: nextRetry,
        last_error: errorMsg,
      })
      .eq('id', item.id)
  }
}
