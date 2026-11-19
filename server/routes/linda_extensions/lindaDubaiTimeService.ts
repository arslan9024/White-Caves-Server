export function getDubaiTimeISO(): string {
  return new Date().toLocaleString('en-US', { timeZone: 'Asia/Dubai' });
}
export default getDubaiTimeISO;
