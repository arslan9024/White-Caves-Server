export function triggerSmsFallback(phone: string, text: string) {
  return { phone, dispatched: true, provider: 'TWILIO_UAE' };
}
export default triggerSmsFallback;
