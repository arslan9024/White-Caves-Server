export function logKycAudit(clientId: string, docType: string, isApproved: boolean) {
  return { clientId, docType, isApproved, auditedAt: new Date().toISOString() };
}
export default logKycAudit;
