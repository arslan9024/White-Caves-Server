/**
 * Prisma connection pool sizing helper (Point 16).
 */
export function getPrismaPoolConfig(isProduction: boolean) {
  return {
    connectionLimit: isProduction ? 20 : 5,
    poolTimeoutSeconds: 15,
  };
}
