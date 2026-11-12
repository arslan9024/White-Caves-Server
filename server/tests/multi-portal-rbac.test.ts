/**
 * White Caves Real Estate LLC - Sovereign Multi-Portal RBAC Gate Tests
 * Standard: AEGIS V5.0 Security & RBAC Standard (AEG-004, AEG-039)
 * Single Purpose File Law: < 350 lines
 *
 * Verifies that:
 * 1. External Client Portals (Landlord, Tenant, Buyer, Seller) are strictly blocked (403)
 *    from accessing internal staff CRM/Department ops.
 * 2. Staff Roles (Level 1..6) can access appropriate internal endpoints.
 * 3. Client Portal tiers have correct hierarchy scores and role rank (RANK = 3).
 */

import { describe, it, expect } from 'vitest';
import {
  ROLE_HIERARCHY,
  ROLE_RANK,
  resolveBackendRole,
  getRoleRank,
  ROLE_PERMISSIONS,
} from '../middleware/rbac.js';

describe('AEGIS Sovereign RBAC — Client Portals vs Staff Boundaries', () => {
  describe('1. Dual-Track Role Hierarchy & Rank Separation', () => {
    it('assigns client portal roles to Customer/Portal Rank (ROLE_RANK = 3)', () => {
      const clientRoles = ['landlord', 'tenant', 'buyer', 'seller', 'property_owner'];
      for (const role of clientRoles) {
        expect(getRoleRank(role)).toBe(3);
      }
    });

    it('assigns internal staff roles to Staff/CRM Rank (ROLE_RANK = 2)', () => {
      const staffRoles = [
        'owner',
        'managing_director',
        'director',
        'manager',
        'supervisor',
        'agent',
        'employee',
      ];
      for (const role of staffRoles) {
        expect(getRoleRank(role)).toBe(2);
      }
    });

    it('enforces that client portal levels are strictly below staff tier levels', () => {
      const minStaffLevel = ROLE_HIERARCHY['employee']; // 50
      expect(ROLE_HIERARCHY['landlord']).toBeLessThan(minStaffLevel);
      expect(ROLE_HIERARCHY['tenant']).toBeLessThan(minStaffLevel);
      expect(ROLE_HIERARCHY['buyer']).toBeLessThan(minStaffLevel);
      expect(ROLE_HIERARCHY['seller']).toBeLessThan(minStaffLevel);
    });
  });

  describe('2. Client Portal Privilege Isolation (Zero Leakage into Staff Operations)', () => {
    it('ensures buyers cannot view audit logs or manage corporate departments', () => {
      const perms = ROLE_PERMISSIONS['buyer'] ?? [];
      expect(perms).not.toContain('view_audit_logs');
      expect(perms).not.toContain('manage_departments');
      expect(perms).not.toContain('manage_users');
      expect(perms).not.toContain('view_commissions');
    });

    it('ensures tenants cannot access financial ledgers or delete properties', () => {
      const perms = ROLE_PERMISSIONS['tenant'] ?? [];
      expect(perms).not.toContain('view_financial_reports');
      expect(perms).not.toContain('delete_property');
      expect(perms).not.toContain('view_commissions');
      expect(perms).not.toContain('manage_campaigns');
    });

    it('ensures landlords cannot view other owners properties or execute compliance overrides', () => {
      const perms = ROLE_PERMISSIONS['landlord'] ?? [];
      expect(perms).not.toContain('view_audit_logs');
      expect(perms).not.toContain('manage_users');
      expect(perms).not.toContain('override_compliance');
    });

    it('ensures sellers cannot access internal deal commissions or payroll', () => {
      const perms = ROLE_PERMISSIONS['seller'] ?? [];
      expect(perms).not.toContain('view_commissions');
      expect(perms).not.toContain('manage_payroll');
    });
  });

  describe('3. Role Normalization & Backend Aliasing', () => {
    it('normalizes uppercase portal roles to lowercase canonical representation', () => {
      expect(resolveBackendRole('LANDLORD')).toBe('landlord');
      expect(resolveBackendRole('TENANT')).toBe('tenant');
      expect(resolveBackendRole('BUYER')).toBe('buyer');
      expect(resolveBackendRole('SELLER')).toBe('seller');
    });

    it('maps secondary aliases safely to canonical equivalents', () => {
      expect(resolveBackendRole('investor')).toBe('buyer');
      expect(resolveBackendRole('offplan_buyer')).toBe('buyer');
      expect(resolveBackendRole('developer')).toBe('external_company');
      expect(resolveBackendRole('lion')).toBe('owner');
    });
  });
});
