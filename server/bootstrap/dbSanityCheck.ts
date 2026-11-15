/**
 * Pre-boot database URL & migration sanity check (Point 28).
 */
export function validateDatabaseUrl(url: string | undefined): { ok: boolean; reason?: string } {
  if (!url || !url.trim()) return { ok: false, reason: 'DATABASE_URL is missing' };
  if (!/^(mongodb(\+srv)?|postgres(ql)?):\/\//i.test(url.trim())) {
    return { ok: false, reason: 'Unsupported DATABASE_URL scheme' };
  }
  return { ok: true };
}
