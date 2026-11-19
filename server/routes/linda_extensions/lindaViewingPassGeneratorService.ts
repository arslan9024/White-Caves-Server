export function generateGatePass(leadName: string, cluster: string, unit: string) {
  return { passId: `PASS-${Date.now()}`, leadName, cluster, unit, validUntil: new Date(Date.now() + 86400000).toISOString() };
}
export default generateGatePass;
