import { describe, it, expect } from 'vitest';
import { DldEjariGatewayService } from '../services/dldEjariGatewayService.js';

describe('DldEjariGatewayService Statutory Compliance', () => {
  it('correctly calculates rent cap according to Dubai Decree 43 of 2013', () => {
    // Current rent 100k vs market 125k (20% below market -> allows 5%)
    const eval1 = DldEjariGatewayService.evaluateRentCap(100000, 125000);
    expect(eval1.variancePercentage).toBe(20);
    expect(eval1.permittedIncreasePercentage).toBe(5);
    expect(eval1.newMaxPermittedRent).toBe(105000);
    expect(eval1.increaseAllowed).toBe(true);

    // Current rent 100k vs market 105k (<10% below market -> allows 0%)
    const eval2 = DldEjariGatewayService.evaluateRentCap(100000, 105000);
    expect(eval2.permittedIncreasePercentage).toBe(0);
    expect(eval2.increaseAllowed).toBe(false);

    // Current rent 100k vs market 150k (>40% below market -> allows max 20%)
    const eval3 = DldEjariGatewayService.evaluateRentCap(100000, 180000);
    expect(eval3.permittedIncreasePercentage).toBe(20);
    expect(eval3.newMaxPermittedRent).toBe(120000);
  });

  it('generates an Ejari registration certificate with statutory fee calculations', async () => {
    const result = await DldEjariGatewayService.registerTenancyContract({
      propertyId: 'prop-dh2-v14',
      landlordName: 'White Caves Properties',
      landlordEmiratesId: '784-1985-1234567-1',
      tenantName: 'John Doe',
      tenantEmiratesId: '784-1990-7654321-2',
      tenantPhone: '+971501234567',
      annualRent: 120000,
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      chequeCount: 4,
      securityDeposit: 6000,
      idempotencyKey: 'test-ejari-001',
    });

    expect(result.status).toBe('REGISTERED');
    expect(result.ejariCertificateNumber).toMatch(/^EJR-2026-/);
    expect(result.statutoryFees.ejariFeeAed).toBe(155);
    expect(result.statutoryFees.innovationFeeAed).toBe(20);
    expect(result.statutoryFees.vatAed).toBe(8.75); // 5% on 175
    expect(result.statutoryFees.totalFeeAed).toBe(183.75);
  });

  it('verifies DLD title deeds with formatted active status', () => {
    const verification = DldEjariGatewayService.verifyTitleDeed('TD-2024-998877', 'Arslan Malik');
    expect(verification.isValid).toBe(true);
    expect(verification.status).toBe('ACTIVE');
    expect(verification.verifiedOwner).toBe('Arslan Malik');
  });
});
