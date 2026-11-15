/**
 * Express sub-router 350-line limit guard (Point 30 / AEG-042).
 */
export function isWithinRouterLineLimit(lineCount: number, maxLines = 350): boolean {
  return lineCount > 0 && lineCount <= maxLines;
}
