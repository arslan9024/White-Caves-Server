import { afterAll, describe, expect, it } from 'vitest';
import { formatLiveLogFooterPanel, getLiveLogLines } from './liveLogBuffer.js';

describe('liveLogBuffer safe serialization', () => {
  const origLog = console.log;
  const origWarn = console.warn;
  const origError = console.error;

  afterAll(() => {
    console.log = origLog;
    console.warn = origWarn;
    console.error = origError;
  });

  it('captures circular objects, BigInt, and Error instances without throwing', () => {
    formatLiveLogFooterPanel(100, 12);

    const circular: Record<string, unknown> = { label: 'loop' };
    circular.self = circular;

    expect(() => console.log('circular-test', circular)).not.toThrow();
    expect(() => console.warn('bigint-test', BigInt(987654321012345))).not.toThrow();
    expect(() => console.error('error-test', new Error('sample boom'))).not.toThrow();

    const lines = getLiveLogLines(12);
    expect(lines.some(line => line.includes('circular-test') && line.includes('Circular'))).toBe(true);
    expect(lines.some(line => line.includes('bigint-test') && line.includes('987654321012345'))).toBe(true);
    expect(lines.some(line => line.includes('error-test') && line.includes('sample boom'))).toBe(true);
  });
});
