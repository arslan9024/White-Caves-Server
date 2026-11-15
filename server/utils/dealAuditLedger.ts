/**
 * Immutable Audit Ledger for deal stage transitions & commission payouts (Point 31).
 */
export interface DealAuditEntry {
  dealId: string;
  actorId: string;
  fromStage: string;
  toStage: string;
  commissionAed?: number;
  recordedAtIso: string;
}

export function createDealAuditEntry(
  dealId: string,
  actorId: string,
  fromStage: string,
  toStage: string,
  commissionAed?: number
): Readonly<DealAuditEntry> {
  return Object.freeze({
    dealId,
    actorId,
    fromStage,
    toStage,
    ...(commissionAed !== undefined ? { commissionAed } : {}),
    recordedAtIso: new Date().toISOString(),
  });
}
