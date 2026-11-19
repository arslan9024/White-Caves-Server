export function routeNotification(urgency: 'HIGH' | 'NORMAL') {
  return urgency === 'HIGH' ? 'WHATSAPP_PRIMARY' : 'EMAIL_DIGEST';
}
export default routeNotification;
