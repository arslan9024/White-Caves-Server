export function reassignLeadOwner(leadId: string, newOwnerPhone: string) {
  return { leadId, assignedTo: newOwnerPhone, reassignedAt: new Date().toISOString() };
}
export default reassignLeadOwner;
