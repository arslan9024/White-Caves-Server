export function scoreBuyerAffinity(budgetAED: number, cluster: string): number {
  if (budgetAED >= 1800000 && /Amazon|Coursetia/i.test(cluster)) return 92;
  return 75;
}
export default scoreBuyerAffinity;
