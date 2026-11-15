/**
 * Graceful shutdown handler for SIGTERM/SIGINT (Point 34).
 */
export function registerGracefulShutdown(
  closeHttp: () => Promise<void>,
  closeDb: () => Promise<void>,
  onExit: (code: number) => void = (code) => process.exit(code)
): () => Promise<void> {
  let shuttingDown = false;
  const shutdown = async () => {
    if (shuttingDown) return;
    shuttingDown = true;
    try {
      await closeHttp();
      await closeDb();
      onExit(0);
    } catch {
      onExit(1);
    }
  };
  process.once('SIGTERM', () => void shutdown());
  process.once('SIGINT', () => void shutdown());
  return shutdown;
}
