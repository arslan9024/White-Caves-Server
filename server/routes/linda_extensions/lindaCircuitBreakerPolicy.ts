export function evaluateConsecutiveFailures(fails: number) {
  return fails >= 5 ? 'TRIP_BREAKER' : 'CONTINUE';
}
export default evaluateConsecutiveFailures;
