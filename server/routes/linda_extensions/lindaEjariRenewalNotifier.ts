export function isRenewalDue(daysRemaining: number): boolean {
  return daysRemaining <= 90; // Dubai standard 90-day renewal notice
}
export default isRenewalDue;
