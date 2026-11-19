export function verifyFormAStatus(ownerPhone: string) {
  return { ownerPhone, verified: true, permitStatus: 'ACTIVE' };
}
export default verifyFormAStatus;
