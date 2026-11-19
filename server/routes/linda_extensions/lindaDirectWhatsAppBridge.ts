export function getWhatsAppSendEndpoint(phone: string) {
  return `/api/linda/send/LINDA_${phone.replace(/\D/g, '')}`;
}
export default getWhatsAppSendEndpoint;
