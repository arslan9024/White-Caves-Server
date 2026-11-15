/**
 * Deal & Payment route payload validator (Point 35).
 */
export function validateDealPaymentPayload(input: { dealId?: string; amountAed?: number }): boolean {
  return Boolean(input.dealId?.trim() && typeof input.amountAed === 'number' && input.amountAed > 0);
}
