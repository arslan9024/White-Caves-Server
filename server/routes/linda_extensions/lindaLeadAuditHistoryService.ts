export function getLeadAuditHistory(leadId: string) {
  return [{ leadId, action: 'FIRST_CONTACT', at: new Date().toISOString() }];
}
export default getLeadAuditHistory;
