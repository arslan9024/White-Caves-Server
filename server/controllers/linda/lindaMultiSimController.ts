import { Request, Response } from 'express';
import {
  DH2_CLUSTERS,
  DH2_LANDLORD_TEMPLATES,
  lindaMultiSimPool,
} from '../../services/whatsapp/LindaMultiSimPoolService.js';

export const getPoolTelemetry = async (_req: Request, res: Response) => {
  try {
    res.json({ success: true, data: lindaMultiSimPool.getPoolTelemetry() });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Telemetry error' });
  }
};

export const listPoolAccounts = async (_req: Request, res: Response) => {
  try {
    const accounts = lindaMultiSimPool.listPoolAccounts();
    res.json({ success: true, data: { accounts, total: accounts.length } });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Failed to list pool' });
  }
};

export const switchPoolAccount = async (req: Request, res: Response) => {
  try {
    const accountId = String(req.body?.accountId || req.body?.phone || '');
    if (!accountId) return res.status(400).json({ success: false, error: 'accountId or phone is required' });
    const active = lindaMultiSimPool.switchActiveAccount(accountId);
    res.json({ success: true, data: { activeAccount: active } });
  } catch (err) {
    res.status(404).json({ success: false, error: err instanceof Error ? err.message : 'Switch failed' });
  }
};

export const connectPoolAccount = async (req: Request, res: Response) => {
  try {
    const phone = String(req.params.phone || '');
    const result = await lindaMultiSimPool.connectAccount(phone);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, error: err instanceof Error ? err.message : 'Connect failed' });
  }
};

export const connectAllPoolAccounts = async (_req: Request, res: Response) => {
  try {
    const results = await lindaMultiSimPool.connectAllAccounts();
    res.json({ success: true, data: { accounts: results, total: results.length } });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Connect-all failed' });
  }
};

export const disconnectPoolAccount = async (req: Request, res: Response) => {
  try {
    const phone = String(req.params.phone || '');
    const result = await lindaMultiSimPool.disconnectAccount(phone);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, error: err instanceof Error ? err.message : 'Disconnect failed' });
  }
};

export const getPoolAccountQr = async (req: Request, res: Response) => {
  try {
    const phone = String(req.params.phone || '');
    const result = await lindaMultiSimPool.getAccountQr(phone);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, error: err instanceof Error ? err.message : 'QR fetch failed' });
  }
};

export const requestPoolAccountPairCode = async (req: Request, res: Response) => {
  try {
    const phone = String(req.params.phone || '');
    const result = await lindaMultiSimPool.requestAccountPairingCode(phone);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Pairing code failed' });
  }
};

export const dispatchPoolCampaignNow = async (req: Request, res: Response) => {
  try {
    const body = req.body || {};
    const recipients = Array.isArray(body.recipients)
      ? body.recipients
      : Array.isArray(body.phoneNumbers)
        ? body.phoneNumbers.map((phone: string) => ({ phone }))
        : [];
    if (!recipients.length) {
      return res.status(400).json({ success: false, error: 'recipients (or phoneNumbers) array is required' });
    }
    const templates = Array.isArray(body.templates)
      ? body.templates
      : typeof body.message === 'string' && body.message.trim()
        ? [body.message.trim()]
        : DH2_LANDLORD_TEMPLATES;
    const result = await lindaMultiSimPool.dispatchRotatedOutreach({
      recipients,
      templates,
      dryRun: body.dryRun === true,
      respectBusinessHours: body.respectBusinessHours !== false,
    });
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Dispatch failed' });
  }
};

export const launchDH2LandlordCampaign = async (req: Request, res: Response) => {
  try {
    const body = req.body || {};
    const cluster = typeof body.cluster === 'string' ? body.cluster : 'Camelia';
    const recipients = Array.isArray(body.recipients) ? body.recipients : [];
    if (!recipients.length) {
      return res.status(400).json({
        success: false,
        error: 'Provide recipients: [{ phone, ownerName?, cluster?, unitRef?, bedrooms? }]',
        supportedClusters: DH2_CLUSTERS,
        defaultTemplates: DH2_LANDLORD_TEMPLATES,
      });
    }
    const normalized = recipients.map((r: any) => ({
      phone: String(r.phone || r),
      ownerName: r.ownerName || 'Valued Owner',
      cluster: r.cluster || cluster,
      unitRef: r.unitRef || `${cluster} Villa`,
      bedrooms: String(r.bedrooms || '3'),
    }));
    const result = await lindaMultiSimPool.dispatchRotatedOutreach({
      recipients: normalized,
      templates: Array.isArray(body.templates) ? body.templates : DH2_LANDLORD_TEMPLATES,
      dryRun: body.dryRun === true,
      respectBusinessHours: body.respectBusinessHours !== false,
    });
    res.json({
      success: true,
      data: {
        campaign: `DH2 Landlord Outreach — ${cluster}`,
        antiBanPacing: '35–65s Gaussian Jitter across 5 SIMs (20/hr cap per SIM)',
        ...result,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'DH2 launch failed' });
  }
};

export const routeInboundTenantViewing = async (req: Request, res: Response) => {
  try {
    const { fromPhone, message, tenantName, receivedOnLine, preferredDate } = req.body || {};
    if (!fromPhone || !message) {
      return res.status(400).json({ success: false, error: 'fromPhone and message are required' });
    }
    const result = await lindaMultiSimPool.routeInboundTenantToViewing({
      fromPhone: String(fromPhone),
      message: String(message),
      tenantName: tenantName ? String(tenantName) : undefined,
      receivedOnLine: receivedOnLine ? String(receivedOnLine) : undefined,
      preferredDate: preferredDate ? String(preferredDate) : undefined,
    });
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Viewing routing failed' });
  }
};
