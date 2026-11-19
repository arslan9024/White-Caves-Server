export function aggregateHourlyStats() {
  return { timestamp: new Date().toISOString(), messagesSent: 68, activeLines: 5 };
}
export default aggregateHourlyStats;
