import { Router } from 'express';
import { requireRole } from '../middleware/rbac.js';
import { WebhookDlq } from '../utils/webhookDlq.js';
import {
  getStatusHandler,
  inboundWebhookHandler,
  sendImageHandler,
  sendMessageHandler,
  sendTemplateHandler,
  verifyWebhookHandler,
} from '../controllers/metaWebhook/index.js';

const router = Router();
export const metaWebhookDlq = new WebhookDlq();

// Inbound webhook verification & event ingestion
router.get('/verify', verifyWebhookHandler);
router.post('/', inboundWebhookHandler);

// Outbound message delivery (owner authenticated)
router.post('/send', requireRole('owner'), sendMessageHandler);
router.post('/template', requireRole('owner'), sendTemplateHandler);
router.get('/status', requireRole('owner'), getStatusHandler);
router.get('/dlq', requireRole('owner'), (_req, res) => {
  res.json({ success: true, entries: metaWebhookDlq.list() });
});
router.post('/image', requireRole('owner'), sendImageHandler);

export default router;
