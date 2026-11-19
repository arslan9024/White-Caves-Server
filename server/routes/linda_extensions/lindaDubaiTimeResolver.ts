export function getDubaiDateString(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Dubai' });
}
export default getDubaiDateString;
