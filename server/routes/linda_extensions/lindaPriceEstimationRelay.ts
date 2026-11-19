export function estimateClusterUnitPrice(sqft: number, ratePerSqft = 920): number {
  return sqft * ratePerSqft;
}
export default estimateClusterUnitPrice;
