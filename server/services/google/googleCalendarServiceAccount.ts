/**
 * googleCalendarServiceAccount.ts
 * White Caves Real Estate LLC — Managing Director Google Calendar Scheduler
 * Supports dedicated calendar service account keys (keys-amg-g-sa.json) with fallback to goraha-key.json
 */

import fs from 'node:fs';
import path from 'node:path';
import { google, type calendar_v3 } from 'googleapis';
import { CENTRAL_SECRETS_DIR } from '../../config/env.js';

export const DEFAULT_MD_CALENDAR_ID =
  process.env.GOOGLE_CALENDAR_ID || process.env.CREATOR_SUPERUSER_EMAIL || 'arslanmalikgoraha@gmail.com';

interface RawKey {
  type?: string;
  client_email?: string;
  private_key?: string;
}

function loadCalendarKey(): RawKey {
  const paths = [
    path.join(CENTRAL_SECRETS_DIR, 'keys-amg-g-sa.json'),
    path.join(CENTRAL_SECRETS_DIR, 'google', 'keys-amg-g-sa.json'),
    path.join(CENTRAL_SECRETS_DIR, 'google', 'goraha-key.json'),
    path.join(CENTRAL_SECRETS_DIR, 'goraha-key.json'),
  ];
  for (const p of paths) {
    if (fs.existsSync(p)) {
      const parsed = JSON.parse(fs.readFileSync(p, 'utf8')) as RawKey;
      if (parsed.type === 'service_account' && parsed.client_email && parsed.private_key) return parsed;
    }
  }
  const b64 = process.env.GOOGLE_ACCOUNT_CALENDAR_KEYS_BASE64 || process.env.GOOGLE_ACCOUNT_GORAHA_KEYS_BASE64;
  if (b64) {
    const parsed = JSON.parse(Buffer.from(b64.trim(), 'base64').toString('utf8')) as RawKey;
    if (parsed.type === 'service_account' && parsed.client_email && parsed.private_key) return parsed;
  }
  throw new Error(`Calendar service account key not found in ${CENTRAL_SECRETS_DIR}`);
}

export function createServiceAccountCalendarClient(): { calendar: calendar_v3.Calendar; email: string } {
  const credentials = loadCalendarKey();
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/calendar'],
  });
  return {
    calendar: google.calendar({ version: 'v3', auth }),
    email: credentials.client_email || 'amg-g-clnd@white-caves-prod.iam.gserviceaccount.com',
  };
}

export async function verifyMdCalendarAccess(
  calendarId = DEFAULT_MD_CALENDAR_ID,
  clientOverride?: { calendar: calendar_v3.Calendar; email: string }
) {
  const { calendar, email } = clientOverride || createServiceAccountCalendarClient();
  try {
    const res = await calendar.calendars.get({ calendarId });
    return {
      accessible: true,
      calendarId,
      summary: res.data.summary || calendarId,
      timeZone: res.data.timeZone || 'Asia/Dubai',
      serviceAccountEmail: email,
    };
  } catch (err) {
    return {
      accessible: false,
      calendarId,
      serviceAccountEmail: email,
      error: err instanceof Error ? err.message : 'Calendar not accessible',
      actionRequired: `Open Google Calendar Settings for ${calendarId} → Share with specific people → Add ${email} with permission "Make changes to events".`,
    };
  }
}

export async function scheduleMdLeasingAppointment(input: {
  kind: 'LANDLORD_PRICE_NEGOTIATION' | 'TENANT_PROPERTY_VIEWING' | 'VIP_CONTRACT_SIGNING';
  contactName: string;
  contactPhone: string;
  area?: string;
  project: string;
  unitNumber: string;
  startIso: string;
  durationMinutes?: number;
  channel?: 'GOOGLE_MEET' | 'PRIMARY_MOBILE_CALL' | 'IN_PERSON_VIEWING';
  notes?: string;
  calendarId?: string;
  clientOverride?: { calendar: calendar_v3.Calendar; email: string };
}) {
  const { calendar, email } = input.clientOverride || createServiceAccountCalendarClient();
  const calendarId = input.calendarId || DEFAULT_MD_CALENDAR_ID;
  const start = new Date(input.startIso);
  if (Number.isNaN(start.getTime())) throw new Error('Invalid startIso date string');
  const end = new Date(start.getTime() + (input.durationMinutes || 30) * 60000);

  const labelMap = {
    LANDLORD_PRICE_NEGOTIATION: 'Landlord Price Negotiation',
    TENANT_PROPERTY_VIEWING: 'Hot Tenant Viewing',
    VIP_CONTRACT_SIGNING: 'VIP Contract & Cheque Handover',
  };

  const summary = `[White Caves] ${labelMap[input.kind]} — ${input.project} Unit ${input.unitNumber} (${input.contactName})`;
  const description = [
    `Mission: ${labelMap[input.kind]}`,
    `Property Formula: ${input.area || 'Damac Hills 2'}/${input.project}/${input.unitNumber}`,
    `Contact: ${input.contactName} (${input.contactPhone})`,
    `Channel: ${input.channel || 'PRIMARY_MOBILE_CALL'} via Primary Master +971505760056`,
    input.notes ? `Notes: ${input.notes}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  const created = await calendar.events.insert({
    calendarId,
    requestBody: {
      summary,
      location: `${input.project}, ${input.area || 'DAMAC Hills 2'}, Dubai, UAE`,
      description,
      start: { dateTime: start.toISOString(), timeZone: 'Asia/Dubai' },
      end: { dateTime: end.toISOString(), timeZone: 'Asia/Dubai' },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'popup', minutes: 30 },
          { method: 'popup', minutes: 10 },
        ],
      },
    },
  });

  return {
    scheduled: true,
    eventId: created.data.id,
    htmlLink: created.data.htmlLink,
    summary,
    startIso: start.toISOString(),
    endIso: end.toISOString(),
    calendarId,
    serviceAccountEmail: email,
  };
}

export async function scheduleTenancyRenewalCalendarMilestones(input: {
  area?: string;
  project: string;
  unitNumber: string;
  landlordName: string;
  tenantName: string;
  contractEndDateIso: string;
  annualRentAed: number;
  calendarId?: string;
  clientOverride?: { calendar: calendar_v3.Calendar; email: string };
}) {
  const { calendar } = input.clientOverride || createServiceAccountCalendarClient();
  const calendarId = input.calendarId || DEFAULT_MD_CALENDAR_ID;
  const endDate = new Date(input.contractEndDateIso);
  if (Number.isNaN(endDate.getTime())) throw new Error('Invalid contractEndDateIso');

  const notice90Date = new Date(endDate.getTime() - 90 * 24 * 60 * 60 * 1000);
  const check30Date = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);

  const buildAllDay = (date: Date, summary: string, description: string) => {
    const dayStr = date.toISOString().slice(0, 10);
    const nextDay = new Date(date.getTime() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    return calendar.events.insert({
      calendarId,
      requestBody: {
        summary,
        description,
        start: { date: dayStr },
        end: { date: nextDay },
        reminders: { useDefault: false, overrides: [{ method: 'popup', minutes: 60 * 9 }] },
      },
    });
  };

  const propLabel = `${input.area || 'Damac Hills 2'}/${input.project}/${input.unitNumber}`;
  const ev90 = await buildAllDay(
    notice90Date,
    `[RERA 90-Day Notice] Renewal Window — ${input.project} Unit ${input.unitNumber}`,
    `UAE Law No. 33/2008 90-day notice deadline.\nUnit: ${propLabel}\nLandlord: ${input.landlordName}\nTenant: ${input.tenantName}\nCurrent Rent: AED ${input.annualRentAed.toLocaleString()}\nContract Ends: ${endDate.toISOString().slice(0, 10)}`
  );
  const ev30 = await buildAllDay(
    check30Date,
    `[Ejari Renewal Final Check] 30 Days Left — ${input.project} Unit ${input.unitNumber}`,
    `Collect renewal cheques, signed contract, renewed Ejari & latest DEWA bill PDF.\nUnit: ${propLabel}\nTenant: ${input.tenantName}`
  );

  return {
    scheduled: true,
    propertyPath: propLabel,
    notice90DayDate: notice90Date.toISOString().slice(0, 10),
    notice90EventId: ev90.data.id,
    final30DayDate: check30Date.toISOString().slice(0, 10),
    final30EventId: ev30.data.id,
  };
}
