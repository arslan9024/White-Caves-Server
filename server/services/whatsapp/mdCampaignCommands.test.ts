import { describe, expect, it, vi } from 'vitest';

const dispatch = vi.fn();
vi.mock('./LindaMultiSimPoolService.js', () => ({
  lindaMultiSimPool: {
    listPoolAccounts: () => [{ phoneNumber: '971503869886' }, { phoneNumber: '971505110636' }],
    dispatchRotatedOutreach: (input: any) => dispatch(input),
  },
}));

import { getLastCampaignRun, handleCampaignCommand } from './mdCampaignCommands.js';

describe('handleCampaignCommand', () => {
  it('ignores non-campaign text', async () => {
    expect(await handleCampaignCommand('status')).toBeNull();
  });

  it('dry run never sends and reports SIM distribution', async () => {
    dispatch.mockResolvedValueOnce({
      total: 2, sent: 0, dryRunCount: 2,
      plan: [{ assignedSim: '971503869886', status: 'dry_run' }, { assignedSim: '971505110636', status: 'dry_run' }],
    });
    const out = await handleCampaignCommand('campaign dry');
    expect(dispatch).toHaveBeenLastCalledWith(expect.objectContaining({ dryRun: true, scheduleCadence: false }));
    expect(out).toContain('DRY-RUN');
    expect(out).toContain('+971503869886: 1');
    expect(getLastCampaignRun()?.dryRun).toBe(2);
  });

  it('test send targets exactly one normalized number', async () => {
    dispatch.mockResolvedValueOnce({ total: 1, sent: 1, plan: [{ assignedSim: '971503869886', status: 'sent' }] });
    const out = await handleCampaignCommand('campaign test 0589969886');
    const input = dispatch.mock.lastCall![0];
    expect(input.dryRun).toBe(false);
    expect(input.recipients).toEqual([{ phone: '971589969886', ownerName: 'Test Owner' }]);
    expect(out).toContain('Sent: 1');
  });

  it('status returns last run', async () => {
    expect(await handleCampaignCommand('campaign status')).toContain('TEST SEND');
  });
});
