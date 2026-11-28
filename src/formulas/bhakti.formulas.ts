/**
 * Pure Bhakti 1-12-108 organizational & rollup formulas.
 */

export const BHAKTI_CONSTANTS = {
  MD_COUNT: 1,
  DIRECTORS_COUNT: 12,
  MANAGERS_PER_DIRECTOR: 9,
  MANAGERS_COUNT: 108,
  ASSISTANT_MANAGERS_PER_MANAGER: 12,
  SUPERVISORS_PER_ASSISTANT_MANAGER: 9,
  TOTAL_FIXED_SEATS: 13081,
  OWN_WEIGHT: 0.3,
  SUBTREE_WEIGHT: 0.7,
} as const;

export interface BhaktiSeatBreakdown {
  md: number;
  directors: number;
  managers: number;
  assistantManagers: number;
  supervisors: number;
  total: number;
}

export interface SupervisorChainInput {
  departmentCode: string;
  divisionCode: string;
  unitCode: string;
  squadCode: string;
}

export interface SupervisorChainResult {
  md: string;
  coo: string;
  director: string;
  manager: string;
  assistantManager: string;
  supervisor: string;
  path: string[];
}

/**
 * Computes the fixed 1-12-108 Bhakti seat counts (13,081 total seats).
 */
export function computeBhaktiSeatCount(): BhaktiSeatBreakdown {
  const md = BHAKTI_CONSTANTS.MD_COUNT;
  const directors = BHAKTI_CONSTANTS.DIRECTORS_COUNT;
  const managers = directors * BHAKTI_CONSTANTS.MANAGERS_PER_DIRECTOR;
  const assistantManagers = managers * BHAKTI_CONSTANTS.ASSISTANT_MANAGERS_PER_MANAGER;
  const supervisors = assistantManagers * BHAKTI_CONSTANTS.SUPERVISORS_PER_ASSISTANT_MANAGER;
  const total = md + directors + managers + assistantManagers + supervisors;

  return { md, directors, managers, assistantManagers, supervisors, total };
}

/**
 * Computes weighted rollup score: 30% own score + 70% subtree average.
 * Returns ownScore when subtreeScores is empty.
 */
export function computeWeightedRollup(ownScore: number, subtreeScores: readonly number[]): number {
  if (subtreeScores.length === 0) {
    return Number(ownScore.toFixed(2));
  }
  const subtreeAvg = subtreeScores.reduce((sum, score) => sum + score, 0) / subtreeScores.length;
  const weighted = ownScore * BHAKTI_CONSTANTS.OWN_WEIGHT + subtreeAvg * BHAKTI_CONSTANTS.SUBTREE_WEIGHT;
  return Number(weighted.toFixed(2));
}

/**
 * Resolves the canonical top-to-bottom AI Supervisor chain.
 */
export function resolveSupervisorChain(input: SupervisorChainInput): SupervisorChainResult {
  const md = 'MD-01';
  const coo = 'AI Zoe (COO)';
  const director = `DIR-${input.departmentCode}`;
  const manager = `MGR-${input.divisionCode}`;
  const assistantManager = `AMGR-${input.unitCode}`;
  const supervisor = `SUP-${input.squadCode}`;

  return {
    md,
    coo,
    director,
    manager,
    assistantManager,
    supervisor,
    path: [md, coo, director, manager, assistantManager, supervisor],
  };
}
