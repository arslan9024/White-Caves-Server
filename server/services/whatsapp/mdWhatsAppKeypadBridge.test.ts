import { describe, expect, it, vi } from 'vitest';

vi.mock('./mdWhatsAppAgentRouter.js', () => ({
  routeMdAgentOrKeypadCommand: vi.fn(async (t: string) => (t === '0' ? 'KEYPAD' : null)),
}));
vi.mock('./mdWhatsAppPairingHandler.js', async () => {
  const actual = await vi.importActual<typeof import('./mdWhatsAppPairingHandler.js')>('./mdWhatsAppPairingHandler.js');
  return { ...actual, handleMdPairingRequest: vi.fn(async (p: string) => `CODE for ${p}`) };
});
vi.mock('./LindaMultiSimPoolService.js', () => ({ lindaMultiSimPool: {} }));

import { handleMdWhatsAppCommand } from './mdWhatsAppKeypadBridge.js';

function fakeEngine() {
  return { sendMessage: vi.fn(async () => 'id') } as any;
}

describe('handleMdWhatsAppCommand', () => {
  it('replies when sender arrives as @lid but contact number is an MD master', async () => {
    const engine = fakeEngine();
    const handled = await handleMdWhatsAppCommand(engine, '123456789@lid', '0', '971589969886');
    expect(handled).toBe(true);
    expect(engine.sendMessage).toHaveBeenCalledWith('123456789@lid', 'KEYPAD');
  });

  it('handles pair <phone> from MD with device-suffixed jid', async () => {
    const engine = fakeEngine();
    const handled = await handleMdWhatsAppCommand(engine, '971503869886:14@c.us', 'pair 0505110636');
    expect(handled).toBe(true);
    expect(engine.sendMessage).toHaveBeenCalledWith('971503869886:14@c.us', 'CODE for 0505110636');
  });

  it('ignores non-MD senders (left for Linda)', async () => {
    const engine = fakeEngine();
    const handled = await handleMdWhatsAppCommand(engine, '971500000000@c.us', '0');
    expect(handled).toBe(false);
    expect(engine.sendMessage).not.toHaveBeenCalled();
  });
});
