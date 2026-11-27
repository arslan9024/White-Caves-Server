import { describe, expect, it } from 'vitest';
import {
  buildCompliantDh2BroadcastMessage,
  sanitizePublicListingMessage,
  segmentDh2Rows,
} from './dh2PmsCampaignSync.js';
import { triageIncomingDh2Reply } from './dh2ReplyTriage.js';

describe('DH2 PMS Campaign Sync & Segmentation', () => {
  it('segments landlords and tenants while filtering invalid and opted-out numbers', () => {
    const res = segmentDh2Rows({
      ownersRows: [
        ['Name', 'Phone', 'Cluster', 'Bedrooms', 'Expiry', 'Status'],
        ['Ahmed', '050 123 4567', 'Vardon', '3BR', '2026-12-30', 'Active'],
        ['Bad Landline', '04 123 4567', 'Vardon', '3BR', '2026-12-30', 'Active'],
        ['Opted Out', '055 999 8888', 'Claret', '4BR', '2026-12-30', 'STOP'],
      ],
      propertiesRows: [
        ['Name', 'Phone', 'Cluster', 'Bedrooms', 'Expiry', 'Status'],
        ['Sara', '052 765 4321', 'Amazonia', '3BR', '2026-12-15', 'Active'],
      ],
      henryTenancyRows: [
        ['Name', 'Phone', 'Cluster', 'Bedrooms', 'Expiry', 'Status'],
        ['Omar', '056 111 2222', 'Pacifica', '3BR', '2026-12-20', 'Active'],
      ],
    });

    expect(res.landlords).toHaveLength(1);
    expect(res.landlords[0].phone).toBe('971501234567');
    expect(res.tenants).toHaveLength(2);
    expect(res.skippedInvalid).toBe(1);
    expect(res.skippedOptOut).toBe(1);
  });

  it('enforces Public Listing Privacy and whitecaves.ae + Arslan Malik CTA', () => {
    const sanitized = sanitizePublicListingMessage('Check out Villa 45 and Unit A-102 in Vardon');
    expect(sanitized).not.toContain('Villa 45');
    expect(sanitized).not.toContain('Unit A-102');

    const msg = buildCompliantDh2BroadcastMessage('LANDLORD_RETENTION_RENEWAL', {
      name: 'Ahmed',
      cluster: 'Vardon',
    });
    expect(msg).toContain('https://whitecaves.ae');
    expect(msg).toContain('Arslan Malik');
    expect(msg).toContain('RERA/DLD Compliant');
    expect(msg).toContain('Reply STOP to opt out');
  });
});

describe('DH2 Incoming Reply Triage', () => {
  it('classifies hot leads and auto-escalates to sim-01-master', () => {
    const triage = triageIncomingDh2Reply('971501234567', 'Yes, interested in viewing and renewal');
    expect(triage.intent).toBe('RENEWAL_INTEREST');
    expect(triage.sentiment).toBe('positive');
    expect(triage.escalateToMaster).toBe(true);
    expect(triage.escalationTarget).toBe('sim-01-master');
  });

  it('handles opt-out replies without escalation', () => {
    const triage = triageIncomingDh2Reply('971501234567', 'STOP please remove me');
    expect(triage.intent).toBe('OPT_OUT');
    expect(triage.optedOut).toBe(true);
    expect(triage.escalateToMaster).toBe(false);
    expect(triage.escalationTarget).toBeNull();
  });
});
