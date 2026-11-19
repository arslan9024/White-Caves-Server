export function recordExplicitOptIn(phone: string) {
  return { phone, optedIn: true, time: new Date().toISOString() };
}
export default recordExplicitOptIn;
