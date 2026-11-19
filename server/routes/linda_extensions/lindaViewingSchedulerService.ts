export function scheduleViewingSlot(leadId: string, slotTime: string) {
  return { leadId, slotTime, status: 'CONFIRMED' };
}
export default scheduleViewingSlot;
