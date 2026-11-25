/**
 * lindaWarmCampaignController.ts
 * White Caves Real Estate LLC — Warm DH2 Contacts, DLD-Compliant Sequences,
 * Delivery Logs, Global DNC Unblock, Pairing Alias & End-to-End Test Dispatch
 */

import { Request, Response } from 'express';
import { getDh2WarmContacts, type WarmContactCategory } from '../../services/whatsapp/dh2WarmContactsService.js';
import {
  CAMPAIGN_SEQUENCE_LIBRARY,
  getRecentDeliveryLogs,
  launchWarmSequenceCampaign,
  runEndToEndDispatchAndTriageTest,
  sanitizeAndAuditOutboundMessage,
  type CampaignSequenceKey,
} from '../../services/whatsapp/dh2CampaignSequencesService.js';
import { removePhoneOptOut } from '../../services/whatsapp/dh2OutreachGovernanceService.js';
import { lindaMultiSimPool } from '../../services/whatsapp/LindaMultiSimPoolService.js';

export const getWarmDh2Contacts = async (req: Request, res: Response) => {
  try {
    const rawCat = String(req.query.category || 'ALL').toUpperCase();
    const category: WarmContactCategory | 'ALL' =
      rawCat === 'LANDLORD_RETENTION_RENEWAL' || rawCat === 'TENANT_FOLLOWUP' ? rawCat : 'ALL';
    const cluster = typeof req.query.cluster === 'string' ? req.query.cluster : undefined;
    const limit = req.query.limit ? Number(req.query.limit) : 120;

    const summary = await getDh2WarmContacts({ category, cluster, limit });
    res.json({ success: true, data: summary });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : 'Failed to load DH2 warm contacts',
    });
  }
};

export const getWarmSequenceTemplates = async (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      sequences: CAMPAIGN_SEQUENCE_LIBRARY,
      complianceRules: {
        privacyRule: 'Public Listing Privacy Rule enforced — private unit/villa/plot numbers are stripped automatically.',
        antiBanPacing: '35–65s Gaussian jitter · 18/hr Hunter cap · 7-day SIM warmup · Friday prayer pause 12:00–14:30 GST',
        conversionCta: 'https://whitecaves.ae + Direct viewing/consultation booking with Arslan Malik (MD)',
      },
    },
  });
};

export const launchWarmDh2Sequence = async (req: Request, res: Response) => {
  try {
    const body = req.body || {};
    const rawKey = String(body.sequenceKey || 'LANDLORD_RETENTION_RENEWAL').toUpperCase();
    const sequenceKey: CampaignSequenceKey =
      rawKey === 'TENANT_FOLLOWUP' || rawKey === 'DH2_LANDLORD_DISCOVERY'
        ? rawKey
        : 'LANDLORD_RETENTION_RENEWAL';

    const result = await launchWarmSequenceCampaign({
      sequenceKey,
      cluster: typeof body.cluster === 'string' && body.cluster !== 'All 38 Clusters' ? body.cluster : undefined,
      limit: body.limit ? Number(body.limit) : 25,
      dryRun: body.dryRun !== false,
      respectBusinessHours: body.respectBusinessHours !== false,
      scheduleFollowUps: body.scheduleFollowUps !== false,
      customTemplate: typeof body.customTemplate === 'string' ? body.customTemplate : undefined,
      recipientsOverride: Array.isArray(body.recipients) ? body.recipients : undefined,
    });

    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : 'Warm sequence launch failed',
    });
  }
};

export const getCampaignDeliveryLogs = async (req: Request, res: Response) => {
  const limit = req.query.limit ? Number(req.query.limit) : 50;
  const logs = getRecentDeliveryLogs(limit);
  res.json({ success: true, data: { total: logs.length, logs } });
};

export const runLindaTestDispatch = async (req: Request, res: Response) => {
  try {
    const body = req.body || {};
    const rawKey = String(body.sequenceKey || 'LANDLORD_RETENTION_RENEWAL').toUpperCase();
    const sequenceKey: CampaignSequenceKey =
      rawKey === 'TENANT_FOLLOWUP' || rawKey === 'DH2_LANDLORD_DISCOVERY'
        ? rawKey
        : 'LANDLORD_RETENTION_RENEWAL';

    const report = await runEndToEndDispatchAndTriageTest({
      testPhone: body.testPhone ? String(body.testPhone) : undefined,
      contactName: body.contactName ? String(body.contactName) : undefined,
      cluster: body.cluster ? String(body.cluster) : undefined,
      sequenceKey,
      simulatedInboundReply: body.simulatedInboundReply ? String(body.simulatedInboundReply) : undefined,
    });

    res.json({ success: true, data: report });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : 'End-to-end test dispatch failed',
    });
  }
};

export const auditOutboundMessageHandler = async (req: Request, res: Response) => {
  const message = String(req.body?.message || '');
  if (!message.trim()) {
    return res.status(400).json({ success: false, error: 'message is required' });
  }
  const audit = sanitizeAndAuditOutboundMessage(message);
  res.json({ success: true, data: audit });
};

export const removeDncSuppression = async (req: Request, res: Response) => {
  try {
    const phone = String(req.params.phone || req.body?.phone || '');
    if (!phone.trim()) return res.status(400).json({ success: false, error: 'phone is required' });
    const result = await removePhoneOptOut(phone);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : 'DNC unblock failed',
    });
  }
};

export const requestPairCodeByBody = async (req: Request, res: Response) => {
  try {
    const phone = String(req.body?.phone || req.body?.phoneNumber || '+971505760056').trim();
    const result = await lindaMultiSimPool.requestAccountPairingCode(phone);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err instanceof Error ? err.message : 'Pairing code request failed',
    });
  }
};
