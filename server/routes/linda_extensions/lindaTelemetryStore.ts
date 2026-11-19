let poolMetrics = { active: 5, sent: 120, latencyMs: 38 };
export function getPoolMetrics() { return poolMetrics; }
export function updatePoolMetrics(m: any) { poolMetrics = { ...poolMetrics, ...m }; }
export default { getPoolMetrics, updatePoolMetrics };
