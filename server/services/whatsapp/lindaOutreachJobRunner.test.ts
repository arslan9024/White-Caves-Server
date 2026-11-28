import fs from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { lindaMultiSimPool } from './LindaMultiSimPoolService.js';
import { PRIMARY_MASTER_PHONE } from './leasingSimOutreachFormula.js';
import { WhatsAppEngineStatus } from './WhatsAppEngine.js';
import { cleanStaleChromiumLocks, parsePositiveDelayMs, runPrimaryMasterKeepAliveTick, shouldRecoverPrimaryMaster, startLindaPairedSessionAutoReconnect } from './lindaOutreachJobRunner.js';

describe('lindaOutreachJobRunner keep-alive & safety guards', () => {
  afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); });

  it('recovers primary master only when DISCONNECTED or ERROR and skips AUTHENTICATING/QR_READY/connected', () => {
    expect(shouldRecoverPrimaryMaster({ isConnected: false, engineStatus: WhatsAppEngineStatus.DISCONNECTED })).toBe(true);
    expect(shouldRecoverPrimaryMaster({ isConnected: false, engineStatus: WhatsAppEngineStatus.ERROR })).toBe(true);
    expect(shouldRecoverPrimaryMaster({ isConnected: false, engineStatus: WhatsAppEngineStatus.AUTHENTICATING })).toBe(false);
    expect(shouldRecoverPrimaryMaster({ isConnected: false, engineStatus: 'QR_READY' })).toBe(false);
    expect(shouldRecoverPrimaryMaster({ isConnected: true, engineStatus: WhatsAppEngineStatus.READY })).toBe(false);
  });

  const setupMasterPool = (engineStatus = WhatsAppEngineStatus.DISCONNECTED, isConnected = false) => {
    vi.spyOn(fs, 'existsSync').mockReturnValue(true);
    const lstatSpy = vi.spyOn(fs, 'lstatSync').mockImplementation(() => { throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' }); });
    const listSpy = vi.spyOn(lindaMultiSimPool, 'listPoolAccounts').mockReturnValue([{ id: 'sim-01-master', displayName: 'Master', phoneNumber: PRIMARY_MASTER_PHONE, isConnected, isActive: true, engineStatus } as never]);
    return { lstatSpy, listSpy };
  };

  it('runPrimaryMasterKeepAliveTick recovers DISCONNECTED sim-01-master even with isActive=true and skips AUTHENTICATING', async () => {
    const { listSpy } = setupMasterPool();
    const connectSpy = vi.spyOn(lindaMultiSimPool, 'connectAccount').mockResolvedValue({} as never);
    await expect(runPrimaryMasterKeepAliveTick()).resolves.toBe(true);
    expect(connectSpy).toHaveBeenCalledWith(PRIMARY_MASTER_PHONE);

    listSpy.mockReturnValueOnce([{ id: 'sim-01-master', phoneNumber: PRIMARY_MASTER_PHONE, isConnected: false, isActive: false, engineStatus: WhatsAppEngineStatus.AUTHENTICATING } as never]);
    await expect(runPrimaryMasterKeepAliveTick()).resolves.toBe(false);
    expect(connectSpy).toHaveBeenCalledTimes(1);
  });

  it('parsePositiveDelayMs falls back safely on invalid env values, enforces minMs, and clamps 32-bit timer max', () => {
    expect(parsePositiveDelayMs('invalid', 60000, 30000)).toBe(60000);
    expect(parsePositiveDelayMs('abc', 5000, 2000)).toBe(5000);
    expect(parsePositiveDelayMs('1000', 60000, 30000)).toBe(30000);
    expect(parsePositiveDelayMs('90000', 60000, 30000)).toBe(90000);
    expect(parsePositiveDelayMs('1000000000000', 60000, 30000)).toBeLessThanOrEqual(2147483647);
  });

  it('runPrimaryMasterKeepAliveTick enforces single-flight concurrency and clears lock on rejection', async () => {
    const { lstatSpy } = setupMasterPool();
    let release!: () => void;
    const connectSpy = vi.spyOn(lindaMultiSimPool, 'connectAccount').mockImplementationOnce(() => new Promise<never>(r => { release = () => r({} as never); }));

    const [p1, p2] = [runPrimaryMasterKeepAliveTick(), runPrimaryMasterKeepAliveTick()];
    expect(connectSpy).toHaveBeenCalledTimes(1);
    expect(lstatSpy).toHaveBeenCalledTimes(3);
    release();
    await expect(Promise.all([p1, p2])).resolves.toEqual([true, true]);

    connectSpy.mockRejectedValueOnce(new Error('SIMULATED_CONNECT_FAILURE'));
    await expect(Promise.all([runPrimaryMasterKeepAliveTick(), runPrimaryMasterKeepAliveTick()])).rejects.toThrow('SIMULATED_CONNECT_FAILURE');
    expect(connectSpy).toHaveBeenCalledTimes(2);

    connectSpy.mockResolvedValueOnce({} as never);
    await expect(runPrimaryMasterKeepAliveTick()).resolves.toBe(true);
    expect(connectSpy).toHaveBeenCalledTimes(3);
  });

  it('startLindaPairedSessionAutoReconnect deduplicates concurrent boot reconnects in production mode', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('VITEST', '');
    setupMasterPool(WhatsAppEngineStatus.READY, true);
    let release!: () => void;
    const intervalSpy = vi.spyOn(globalThis, 'setInterval').mockReturnValue({ unref: vi.fn() } as unknown as NodeJS.Timeout);
    const clearSpy = vi.spyOn(globalThis, 'clearInterval').mockImplementation(() => undefined);
    const connectSpy = vi.spyOn(lindaMultiSimPool, 'connectAccount').mockImplementation(() => new Promise<never>(r => { release = () => r({} as never); }));

    startLindaPairedSessionAutoReconnect();
    startLindaPairedSessionAutoReconnect();
    expect(connectSpy).toHaveBeenCalledTimes(1);
    expect(intervalSpy).toHaveBeenCalledTimes(2);
    expect(clearSpy).toHaveBeenCalledTimes(1);
    release();
    await new Promise(r => setTimeout(r, 10));
  });

  it('cleanStaleChromiumLocks unlinks broken POSIX SingletonLock symlinks safely', () => {
    vi.spyOn(fs, 'lstatSync').mockReturnValue({ isSymbolicLink: () => true, isFile: () => false } as fs.Stats);
    const unlinkSpy = vi.spyOn(fs, 'unlinkSync').mockImplementation(() => undefined);
    expect(() => cleanStaleChromiumLocks(PRIMARY_MASTER_PHONE)).not.toThrow();
    expect(unlinkSpy).toHaveBeenCalledTimes(3);
  });

  it('startLindaPairedSessionAutoReconnect creates 0 intervals in test/vitest mode', () => {
    const intervalSpy = vi.spyOn(globalThis, 'setInterval');
    startLindaPairedSessionAutoReconnect();
    expect(intervalSpy).not.toHaveBeenCalled();
  });
});
