export function getDamacHills2EstValuation(type: string): number {
  if (type === 'V2') return 1650000;
  if (type === 'V3') return 1850000;
  return 1400000;
}
export default getDamacHills2EstValuation;
