export function calculateGrossYield(annualRent: number, purchasePrice: number): string {
  if (!purchasePrice) return '0.0%';
  return `${((annualRent / purchasePrice) * 100).toFixed(1)}%`;
}
export default calculateGrossYield;
