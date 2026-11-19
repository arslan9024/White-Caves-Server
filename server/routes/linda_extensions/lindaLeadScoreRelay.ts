export function calculateLeadConfidence(text: string): number {
  if (/cash|cheque|ready/i.test(text)) return 95;
  if (/price|cost|how much/i.test(text)) return 80;
  return 60;
}
export default calculateLeadConfidence;
