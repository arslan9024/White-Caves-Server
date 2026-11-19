export function convertAedToCurrency(amountAed: number, targetCurr: 'USD' | 'EUR' | 'GBP'): number {
  const rates = { USD: 0.272, EUR: 0.252, GBP: 0.216 };
  return Math.round(amountAed * (rates[targetCurr] || 1));
}
export default convertAedToCurrency;
