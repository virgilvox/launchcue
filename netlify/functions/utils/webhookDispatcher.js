const https = require('https');
const http = require('http');
const crypto = require('crypto');
const logger = require('./logger');

async function dispatchWebhooks(db, teamId, eventType, payload) {
  try {
    const webhooks = await db.collection('webhooks').find({
      teamId,
      active: true,
      events: eventType,
    }).toArray();

    for (const webhook of webhooks) {
      try {
        const body = JSON.stringify({ event: eventType, data: payload, timestamp: new Date().toISOString() });
        const signature = crypto.createHmac('sha256', webhook.secret).update(body).digest('hex');

        // Fire and forget - use native https/http
        const url = new URL(webhook.url);
        const client = url.protocol === 'https:' ? https : http;

        const req = client.request(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Webhook-Signature': signature,
            'X-Webhook-Event': eventType,
          },
          timeout: 5000,
        });

        req.on('error', (err) => {
          logger.error(`Webhook delivery failed for ${webhook.url}:`, err.message);
        });

        req.write(body);
        req.end();
      } catch (err) {
        logger.error(`Webhook dispatch error for ${webhook.url}:`, err.message);
      }
    }
  } catch (error) {
    logger.error('Failed to dispatch webhooks:', error.message);
  }
}

module.exports = { dispatchWebhooks };
