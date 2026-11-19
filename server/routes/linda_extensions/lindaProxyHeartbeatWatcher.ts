export function checkBotConnectivity(ok: boolean) {
  return ok ? 'UPSTREAM_READY' : 'UPSTREAM_DEGRADED';
}
export default checkBotConnectivity;
