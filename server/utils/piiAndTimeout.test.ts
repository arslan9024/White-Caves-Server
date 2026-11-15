import { describe, it, expect } from 'vitest';
import { maskEmiratesId, maskIban, maskPassport } from './piiAndTimeout.js';

describe('piiAndTimeout utilities', () => {
  it('masks Emirates ID preserving prefix and last 2 digits', () => {
    expect(maskEmiratesId('784-1990-1234567-1')).toBe('784-****-*****7-1');
  });

  it('masks IBAN preserving first 4 and last 4 characters', () => {
    expect(maskIban('AE07 0331 2345 6789 0123 456')).toBe('AE07****3456');
  });

  it('masks passport preserving first 2 and last 2 characters', () => {
    expect(maskPassport('AB1234567')).toBe('AB****67');
  });
});
