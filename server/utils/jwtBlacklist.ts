/**
 * JWT Revocation Blacklist with TTL eviction (Point 18).
 */
export class JwtBlacklist {
  private revoked = new Map<string, number>();

  revoke(jti: string, expiresAtMs: number): void {
    this.revoked.set(jti, expiresAtMs);
  }

  isRevoked(jti: string, nowMs = Date.now()): boolean {
    const exp = this.revoked.get(jti);
    if (!exp) return false;
    if (nowMs > exp) {
      this.revoked.delete(jti);
      return false;
    }
    return true;
  }
}
