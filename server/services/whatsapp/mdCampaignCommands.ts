import { lindaMultiSimPool } from './LindaMultiSimPoolService.js';
import { normalizeMdPhoneDigits } from './mdWhatsAppPairingHandler.js';

interface CampaignRunSummary {
  mode: 'dry' | 'test';
  at: string;
  total: number;
  sent: number;
  dryRun: number;
  failed: number;
  bySim: Record<string, number>;
  notes: string[];
}

let lastRun: CampaignRunSummary | null = null;

export function getLastCampaignRun(): CampaignRunSummary | null {
  return lastRun;
}

function summarize(mode: 'dry' | 'test', res: any): CampaignRunSummary {
  const plan: Array<{ assignedSim: string; status: string; error?: string }> = Array.isArray(res?.plan) ? res.plan : [];
  const bySim: Record<string, number> = {};
  for (const p of plan) bySim[p.assignedSim] = (bySim[p.assignedSim] ?? 0) + 1;
  const failed = plan.filter(p => !['sent', 'dry_run'].includes(p.status));
  return {
    mode,
    at: new Date().toLocaleTimeString('en-GB', { hour12: false }),
    total: res?.total ?? plan.length,
    sent: res?.sent ?? 0,
    dryRun: res?.dryRunCount ?? 0,
    failed: failed.length,
    bySim,
    notes: [...new Set(failed.map(f => `${f.status}${f.error ? `: ${f.error}` : ''}`))].slice(0, 3),
  };
}

function formatSummary(s: CampaignRunSummary): string {
  const sims = Object.entries(s.bySim).map(([sim, n]) => `• +${sim}: ${n}`).join('\n') || '• (none)';
  return [
    `*CAMPAIGN ${s.mode === 'dry' ? 'DRY-RUN' : 'TEST SEND'}* (${s.at})`,
    `Total: ${s.total} | Sent: ${s.sent} | Dry: ${s.dryRun} | Failed: ${s.failed}`,
    `*SIM distribution*`,
    sims,
    ...(s.notes.length ? ['*Notes*', ...s.notes.map(n => `• ${n}`)] : []),
  ].join('\n');
}

/**
 * MD campaign commands (WhatsApp chat + terminal):
 *  - `campaign dry`          → simulate rotation across hunter SIMs (no messages sent)
 *  - `campaign test <phone>` → send ONE real message to a safe test number
 *  - `campaign status`       → last run summary
 */
export async function handleCampaignCommand(text: string): Promise<string | null> {
  const parts = text.trim().split(/\s+/);
  if (parts[0]?.toLowerCase() !== 'campaign') return null;
  const sub = (parts[1] || 'status').toLowerCase();

  if (sub === 'status') {
    return lastRun ? formatSummary(lastRun) : 'No campaign run yet. Try `campaign dry`.';
  }

  if (sub === 'dry') {
    const accounts = lindaMultiSimPool.listPoolAccounts();
    const recipients = accounts.map((_, i) => ({ phone: `97150000${String(1000 + i)}`, ownerName: `Dry Owner ${i + 1}` }));
    const res = await lindaMultiSimPool.dispatchRotatedOutreach({
      recipients, dryRun: true, respectBusinessHours: false, scheduleCadence: false,
    });
    lastRun = summarize('dry', res);
    console.log(`[Linda Campaign] Dry-run: ${lastRun.dryRun}/${lastRun.total} planned across ${Object.keys(lastRun.bySim).length} SIM(s)`);
    return formatSummary(lastRun);
  }

  if (sub === 'test') {
    const target = normalizeMdPhoneDigits(parts[2] || '');
    if (target.length < 9) return 'Usage: `campaign test <phone>` (e.g. `campaign test 0589969886`)';
    const res = await lindaMultiSimPool.dispatchRotatedOutreach({
      recipients: [{ phone: target, ownerName: 'Test Owner' }],
      dryRun: false, respectBusinessHours: false, scheduleCadence: false,
    });
    lastRun = summarize('test', res);
    console.log(`[Linda Campaign] Test send to +${target}: sent=${lastRun.sent} failed=${lastRun.failed}`);
    return formatSummary(lastRun);
  }

  return 'Campaign commands: `campaign dry` | `campaign test <phone>` | `campaign status`';
}
