export function calculateBatchMetrics(total: number, sent: number) {
  return { total, sent, remaining: Math.max(0, total - sent) };
}
export default calculateBatchMetrics;
