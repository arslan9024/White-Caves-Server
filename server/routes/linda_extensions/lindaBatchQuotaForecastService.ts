export function forecastQuotaRemaining(fleetSent: number, maxCap = 225): number {
  return Math.max(0, maxCap - fleetSent);
}
export default forecastQuotaRemaining;
