export function aggregateAccountsHealth(sessions: { phone: string; isConnected: boolean }[]) {
  const online = sessions.filter(s => s.isConnected).length;
  return { online, total: sessions.length, allConnected: online === 5 };
}
export default aggregateAccountsHealth;
