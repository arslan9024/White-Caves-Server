/**
 * dianaEmailRoutes.ts — Express Routes for AI Diana Supervisor (SUP-02-6-01-1 under MGR-02-6 AI Celine) Email Campaign Engine
 * Endpoints: GET /status, POST /preview, POST /send
 * Standard: AEGIS Single Purpose File Law (< 350 lines, AEG-042)
 */
import { Router, Request, Response } from 'express';
import {
  buildWhiteCavesLuxuryHtml,
  dispatchDianaCampaign,
  getDianaMailerStatus,
  type DianaCampaignPayload,
} from '../services/dianaEmailCampaignService.js';

const router = Router();

router.get('/status', (_req: Request, res: Response) => {
  res.json({ success: true, data: getDianaMailerStatus() });
});

router.post('/preview', (req: Request, res: Response) => {
  const { headline, bodyText, ownerName, propertyTitle, community } = req.body || {};
  if (!headline || !bodyText) {
    return res.status(400).json({ success: false, error: 'headline and bodyText are required' });
  }
  const html = buildWhiteCavesLuxuryHtml(String(headline), String(bodyText), {
    email: 'preview@owner.ae',
    ownerName,
    propertyTitle,
    community,
  });
  return res.json({ success: true, html });
});

router.post('/send', async (req: Request, res: Response) => {
  const payload = req.body as DianaCampaignPayload;
  if (!payload?.subject || !payload?.headline || !payload?.bodyText || !Array.isArray(payload?.recipients)) {
    return res.status(400).json({
      success: false,
      error: 'subject, headline, bodyText, and recipients[] are required',
    });
  }
  if (payload.recipients.length === 0 || payload.recipients.length > 200) {
    return res.status(400).json({
      success: false,
      error: 'recipients[] must contain between 1 and 200 addresses per batch',
    });
  }

  const result = await dispatchDianaCampaign(payload);
  return res.json({ success: true, data: result });
});

export default router;
