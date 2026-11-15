/**
 * Multi-tenant WebSocket room partitioning helper (Point 27).
 */
export function buildTenantRoom(orgId: string, channel = 'default'): string {
  return `tenant:${orgId.trim()}:${channel.trim()}`;
}
