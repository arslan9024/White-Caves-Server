export function routeLeadByIntent(intent: string) {
  return intent === 'VIEWING_REQUEST' ? 'SENIOR_BROKER' : 'AUTO_RESPONDER';
}
export default routeLeadByIntent;
