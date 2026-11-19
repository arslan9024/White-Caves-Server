export function dispatchEscalationNotification(leadPhone: string, tier: string) {
  return { dispatched: true, tier, leadPhone, at: new Date().toISOString() };
}
export default dispatchEscalationNotification;
