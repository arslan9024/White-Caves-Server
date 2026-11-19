export function verifyMessageCompliance(text: string): { compliant: boolean; issues: string[] } {
  const issues: string[] = [];
  if (text.length > 1000) issues.push('Message exceeds WhatsApp 1000 char recommendation');
  return { compliant: issues.length === 0, issues };
}
export default verifyMessageCompliance;
