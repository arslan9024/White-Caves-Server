export function evaluateFleetUptime(sessions: any[]) {
  const active = sessions.filter(s => s.isConnected).length;
  return { active, total: sessions.length, healthRatio: active / (sessions.length || 1) };
}
export default evaluateFleetUptime;
