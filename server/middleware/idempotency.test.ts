import { describe, it, expect, vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { requireIdempotencyKey } from './idempotency.js';

function mockReqRes(key?: string) {
  const req = { header: (name: string) => (name === 'Idempotency-Key' ? key : undefined) } as unknown as Request;
  const json = vi.fn();
  const status = vi.fn().mockReturnValue({ json });
  const res = { statusCode: 201, status, json } as unknown as Response;
  const next = vi.fn() as unknown as NextFunction;
  return { req, res, next, status, json };
}

describe('requireIdempotencyKey', () => {
  it('rejects requests without Idempotency-Key', () => {
    const { req, res, next, status } = mockReqRes();
    requireIdempotencyKey()(req, res, next);
    expect(status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });

  it('replays cached response for duplicate Idempotency-Key', () => {
    const mw = requireIdempotencyKey();
    const first = mockReqRes('ejari-reg-001');
    mw(first.req, first.res, first.next);
    expect(first.next).toHaveBeenCalledTimes(1);
    first.res.json({ ok: true, id: 'ej-1' });

    const second = mockReqRes('ejari-reg-001');
    mw(second.req, second.res, second.next);
    expect(second.next).not.toHaveBeenCalled();
    expect(second.status).toHaveBeenCalledWith(201);
    expect(second.json).toHaveBeenCalledWith({ ok: true, id: 'ej-1' });
  });
});
