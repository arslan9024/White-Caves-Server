export function computeFleetThroughput(sentCounts: Record<string, number>) {
  const total = Object.values(sentCounts).reduce((a, b) => a + b, 0);
  return { totalSent: total, activeLines: Object.keys(sentCounts).length, avgPerLine: Math.round(total / (Object.keys(sentCounts).length || 1)) };
}
export default computeFleetThroughput;
