const logs: any[] = [];
export function logLindaAction(action: string, meta: any): void {
  logs.unshift({ timestamp: new Date().toISOString(), action, meta });
  if (logs.length > 100) logs.pop();
}
export function getRecentLogs() { return logs; }
export default { logLindaAction, getRecentLogs };
