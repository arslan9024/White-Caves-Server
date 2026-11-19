export function signalSessionUnlocked(phone: string) {
  return { phone, unlocked: true };
}
export default signalSessionUnlocked;
