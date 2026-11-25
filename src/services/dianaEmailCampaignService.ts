/**
 * dianaEmailCampaignService.ts — AI Diana (MGR-02-6) Property Owner Email Campaign Engine
 * Sender: the.arslan.broker@gmail.com (Gmail SMTP via App Password)
 * Standard: AEGIS Canonical Architecture & Single Purpose File Law (< 350 lines, AEG-042)
 */
import nodemailer from 'nodemailer';
import fs from 'node:fs';
import path from 'node:path';

function loadCentralizedGmailSecrets(): Record<string, string> {
  const candidates = [
    path.resolve(process.cwd(), '../secrets/google/gmail.tab.env'),
    path.resolve(process.cwd(), '../secrets/google/google.tab.env'),
    path.resolve(process.cwd(), 'secrets/google/gmail.tab.env'),
    path.resolve(process.cwd(), 'secrets/google/google.tab.env'),
  ];
  const parsed: Record<string, string> = {};
  for (const filePath of candidates) {
    if (!fs.existsSync(filePath)) continue;
    const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) continue;
      const eqIdx = line.indexOf('=');
      if (eqIdx === -1) continue;
      const key = line.slice(0, eqIdx).trim();
      const val = line.slice(eqIdx + 1).trim().replace(/^['"]|['"]$/g, '');
      if (key && !parsed[key]) parsed[key] = val;
    }
  }
  return parsed;
}

export interface DianaRecipient {
  email: string;
  ownerName?: string;
  propertyTitle?: string;
  community?: string;
}

export interface DianaCampaignPayload {
  subject: string;
  headline: string;
  bodyText: string;
  recipients: DianaRecipient[];
  dryRun?: boolean;
}

export interface DianaDispatchResult {
  sender: string;
  mode: 'LIVE_SMTP' | 'DRY_RUN';
  totalRequested: number;
  sentCount: number;
  failedCount: number;
  results: Array<{ email: string; status: 'SENT' | 'PREVIEW' | 'FAILED'; messageId?: string; error?: string }>;
}

const DEFAULT_SENDER = process.env.DIANA_GMAIL_USER || 'the.arslan.broker@gmail.com';

export function buildWhiteCavesLuxuryHtml(
  headline: string,
  bodyText: string,
  recipient: DianaRecipient
): string {
  const greeting = recipient.ownerName ? `Dear ${recipient.ownerName},` : 'Dear Property Owner,';
  const propertyNote = recipient.propertyTitle
    ? `<p style="margin:0 0 12px;color:#EF4444;font-weight:700;font-size:13px;">Regarding: ${recipient.propertyTitle}${recipient.community ? ` (${recipient.community})` : ''}</p>`
    : '';

  return `
  <div style="font-family:Inter,Arial,sans-serif;background:#0F172A;padding:28px;color:#FFFFFF;">
    <div style="max-width:600px;margin:0 auto;background:#1E293B;border-radius:16px;border:1px solid rgba(239,68,68,0.35);overflow:hidden;">
      <div style="background:#0B0F19;padding:20px 24px;border-bottom:2px solid #EF4444;">
        <div style="font-size:11px;letter-spacing:2px;color:#EF4444;font-weight:800;">WHITE CAVES REAL ESTATE LLC · DUBAI</div>
        <h1 style="margin:6px 0 0;font-size:20px;color:#FFFFFF;">${headline}</h1>
      </div>
      <div style="padding:24px;font-size:14px;line-height:1.65;color:#E2E8F0;">
        <p style="margin:0 0 12px;font-weight:600;color:#FFFFFF;">${greeting}</p>
        ${propertyNote}
        <p style="margin:0 0 18px;white-space:pre-line;">${bodyText}</p>
        <div style="margin-top:24px;padding-top:16px;border-top:1px solid rgba(255,255,255,0.1);font-size:12px;color:#94A3B8;">
          <strong style="color:#FFFFFF;">Arslan Malik</strong> · Managing Director<br/>
          White Caves Real Estate LLC · RERA ORN #12849 · Dubai, UAE<br/>
          Dispatched via AI Diana (MGR-02-6 · Investor &amp; Owner Outreach)
        </div>
      </div>
    </div>
  </div>`;
}

function resolveDianaCredentials() {
  const secrets = loadCentralizedGmailSecrets();
  const user =
    process.env.DIANA_GMAIL_USER ||
    secrets.DIANA_GMAIL_USER ||
    secrets.GMAIL_USER ||
    'the.arslan.broker@gmail.com';
  const pass =
    process.env.DIANA_GMAIL_APP_PASSWORD ||
    process.env.GMAIL_APP_PASSWORD ||
    secrets.DIANA_GMAIL_APP_PASSWORD ||
    secrets.GMAIL_APP_PASSWORD ||
    '';
  return { user, pass };
}

function createDianaTransporter() {
  const { user, pass } = resolveDianaCredentials();

  if (!pass) {
    return null;
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass },
  });
}

export function getDianaMailerStatus() {
  const { user, pass } = resolveDianaCredentials();
  return {
    agentCode: 'MGR-02-6',
    agentName: 'AI Diana Newsletter',
    senderEmail: user,
    transportReady: Boolean(pass),
    secretsSource: 'secrets/google/gmail.tab.env',
  };
}

export async function dispatchDianaCampaign(
  payload: DianaCampaignPayload
): Promise<DianaDispatchResult> {
  const transporter = payload.dryRun ? null : createDianaTransporter();
  const mode: 'LIVE_SMTP' | 'DRY_RUN' = transporter ? 'LIVE_SMTP' : 'DRY_RUN';
  const results: DianaDispatchResult['results'] = [];

  for (const recipient of payload.recipients) {
    const html = buildWhiteCavesLuxuryHtml(payload.headline, payload.bodyText, recipient);

    if (!transporter) {
      results.push({ email: recipient.email, status: 'PREVIEW' });
      continue;
    }

    try {
      const info = await transporter.sendMail({
        from: `"White Caves Real Estate — Arslan Malik" <${DEFAULT_SENDER}>`,
        to: recipient.email,
        subject: payload.subject,
        text: payload.bodyText,
        html,
      });
      results.push({ email: recipient.email, status: 'SENT', messageId: info.messageId });
    } catch (err) {
      results.push({
        email: recipient.email,
        status: 'FAILED',
        error: err instanceof Error ? err.message : 'Unknown SMTP error',
      });
    }
  }

  const sentCount = results.filter(r => r.status === 'SENT' || r.status === 'PREVIEW').length;
  const failedCount = results.filter(r => r.status === 'FAILED').length;

  return {
    sender: DEFAULT_SENDER,
    mode,
    totalRequested: payload.recipients.length,
    sentCount,
    failedCount,
    results,
  };
}
