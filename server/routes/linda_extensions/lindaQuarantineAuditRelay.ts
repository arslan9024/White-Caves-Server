export function logQuarantinedLead(phone: string, reason: string) {
  return { phone, reason, quarantinedAt: new Date().toISOString() };
}
export default logQuarantinedLead;
