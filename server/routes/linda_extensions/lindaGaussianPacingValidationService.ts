export function validatePacingParams(wpm: number, jitterMs: number): boolean {
  return wpm >= 20 && wpm <= 65 && jitterMs >= 50 && jitterMs <= 800;
}
export default validatePacingParams;
