export function logCampaignStep(campaignId: string, event: string) {
  return { campaignId, event, loggedAt: new Date().toISOString() };
}
export default logCampaignStep;
