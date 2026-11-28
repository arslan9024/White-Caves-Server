import { describe, expect, it } from 'vitest';
import {
  BHAKTI_CONSTANTS,
  compose,
  computeBhaktiSeatCount,
  computeCommissionSplit,
  computeCorporateTaxReserve,
  computeStatutoryGateXp,
  computeVatAmount,
  computeWeightedRollup,
  pipe,
  resolveSupervisorChain,
  sanitizePublicProperty,
  splitPdcCheques,
} from './index';

describe('pipe & compose', () => {
  it('pipes values left-to-right', () => {
    const result = pipe(
      10,
      (x) => x + 5,
      (x) => x * 2
    );
    expect(result).toBe(30);
  });

  it('composes functions right-to-left', () => {
    const fn = compose(
      (x: number) => x * 2,
      (x: number) => x + 5
    );
    expect(fn(10)).toBe(30);
  });
});

describe('bhakti.formulas', () => {
  it('computes exact 1-12-108 seat breakdown totaling 13,081', () => {
    const seats = computeBhaktiSeatCount();
    expect(seats).toEqual({
      md: 1,
      directors: 12,
      managers: 108,
      assistantManagers: 1296,
      supervisors: 11664,
      total: BHAKTI_CONSTANTS.TOTAL_FIXED_SEATS,
    });
  });

  it('computes 30% own + 70% subtree weighted rollup', () => {
    expect(computeWeightedRollup(80, [100, 100])).toBe(94);
    expect(computeWeightedRollup(75, [])).toBe(75);
  });

  it('resolves canonical top-to-bottom supervisor chain', () => {
    const chain = resolveSupervisorChain({
      departmentCode: '02',
      divisionCode: '02-1',
      unitCode: '02-1-01',
      squadCode: '02-1-01-1',
    });
    expect(chain.path).toEqual([
      'MD-01',
      'AI Zoe (COO)',
      'DIR-02',
      'MGR-02-1',
      'AMGR-02-1-01',
      'SUP-02-1-01-1',
    ]);
  });
});

describe('dubaiRealEstate.formulas', () => {
  it('splits PDC cheques evenly with exact sum', () => {
    const cheques = splitPdcCheques(100000, 3);
    expect(cheques).toHaveLength(3);
    expect(cheques.reduce((a, b) => a + b, 0)).toBeCloseTo(100000, 2);
  });

  it('computes 5% VAT and 9% corporate tax reserve', () => {
    expect(computeVatAmount(1000)).toBe(50);
    expect(computeCorporateTaxReserve(100000)).toBe(9000);
    expect(computeCorporateTaxReserve(-500)).toBe(0);
  });

  it('computes 60%->70% commission split and +500 XP statutory gate rewards', () => {
    expect(computeCommissionSplit(10000, 'standard')).toEqual({
      agentShare: 6000,
      companyShare: 4000,
      splitRate: 0.6,
    });
    expect(computeCommissionSplit(10000, 'senior')).toEqual({
      agentShare: 7000,
      companyShare: 3000,
      splitRate: 0.7,
    });
    expect(computeStatutoryGateXp(3)).toBe(1500);
  });
});

describe('privacy.formulas', () => {
  it('strictly strips unitNumber, villaNumber, and plotNumber without mutating input', () => {
    const input = {
      id: 'prop-1',
      title: 'Marina Gate',
      unitNumber: '2401',
      villaNumber: 'V-12',
      plotNumber: 'P-99',
      priceAed: 2500000,
    };
    const sanitized = sanitizePublicProperty(input);
    expect(sanitized).toEqual({
      id: 'prop-1',
      title: 'Marina Gate',
      priceAed: 2500000,
    });
    expect('unitNumber' in sanitized).toBe(false);
    expect('villaNumber' in sanitized).toBe(false);
    expect('plotNumber' in sanitized).toBe(false);
    expect(input.unitNumber).toBe('2401');
  });
});
