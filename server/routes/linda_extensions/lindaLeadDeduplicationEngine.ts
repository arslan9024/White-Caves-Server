export function isDuplicateLead(phone: string, existingPhones: Set<string>): boolean {
  return existingPhones.has(phone.replace(/\D/g, ''));
}
export default isDuplicateLead;
