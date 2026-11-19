export function pushDealToPipeline(dealData: any) {
  return { dealId: `DEAL-${Date.now()}`, ...dealData, stage: 'LEAD_CAPTURED' };
}
export default pushDealToPipeline;
