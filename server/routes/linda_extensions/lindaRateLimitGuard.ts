const hits = new Map<string, number>();
export function checkRate(ip: string, limit = 60): boolean {
  const count = (hits.get(ip) || 0) + 1;
  hits.set(ip, count);
  return count <= limit;
}
export default checkRate;
