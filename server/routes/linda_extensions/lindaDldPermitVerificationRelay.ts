export function verifyDldPermitFormat(permit: string): boolean {
  return /^RERA-\d{4}-[A-Z0-9]+-\d+$/i.test(permit.trim()) || permit.length >= 8;
}
export default verifyDldPermitFormat;
