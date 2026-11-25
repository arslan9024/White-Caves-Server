import { Request, Response } from 'express';
import { LINDA_ENABLED } from '../../config/env.js';
import { getLindaClientForMode } from '../../services/whatsapp/linda-core/adapters/LindaCoreAdapter.js';
import {
  buildLindaParitySnapshot,
  emitLindaParitySnapshot,
} from '../../services/whatsapp/linda-core/bridge/shadowParityReporter.js';
import { getOrInitLindaRuntime } from './lindaCommon.js';
import { lindaMultiSimPool } from '../../services/whatsapp/LindaMultiSimPoolService.js';

export const getStatus = async (_req: Request, res: Response) => {
  try {
    const { linda, mode } = await getOrInitLindaRuntime();
    const legacyStats = linda.getStats();
    const poolAccounts = lindaMultiSimPool.listPoolAccounts();
    const connectedPoolLines = poolAccounts.filter(a => a.isConnected);
    const primary = poolAccounts.find(a => a.simTier === 'PRIMARY_MASTER_CLOSER') || poolAccounts[0];
    const anyConnected = connectedPoolLines.length > 0 || legacyStats.isConnected;
    const effectiveStatus = connectedPoolLines.length > 0
      ? 'READY'
      : primary?.engineStatus && primary.engineStatus !== 'DISCONNECTED'
        ? primary.engineStatus
        : legacyStats.status;

    if (mode === 'shadow') {
      emitLindaParitySnapshot(buildLindaParitySnapshot('route_status', linda, mode));
    }

    res.json({
      success: true,
      data: {
        ...legacyStats,
        status: effectiveStatus,
        isConnected: anyConnected,
        primaryMasterConnected: Boolean(primary?.isConnected),
        enabled: LINDA_ENABLED,
        poolSize: poolAccounts.length,
        connectedLines: connectedPoolLines.length,
        messagesSent:
          poolAccounts.reduce((sum, a) => sum + a.messagesSent, 0) + legacyStats.messagesSent,
        messagesReceived:
          poolAccounts.reduce((sum, a) => sum + a.messagesReceived, 0) + legacyStats.messagesReceived,
        sessions: poolAccounts.map(a => ({
          id: a.id,
          botId: a.sessionId,
          phone: a.phoneNumber,
          displayName: a.displayName,
          role: a.role,
          status: a.engineStatus.toLowerCase(),
          isConnected: a.isConnected,
          isActive: a.isActive,
          qrAvailable: a.qrAvailable,
          sessionDirExists: a.sessionDirExists,
          hourlySent: a.hourlySent,
          hourlyRemaining: a.hourlyRemaining,
          messagesSent: a.messagesSent,
          messagesReceived: a.messagesReceived,
        })),
      },
    });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, error: err instanceof Error ? err.message : 'Unknown error' });
  }
};

export const getQr = async (_req: Request, res: Response) => {
  try {
    const primary = lindaMultiSimPool.getPrimaryAccount();
    const primaryQr = await lindaMultiSimPool.getAccountQr(primary.phoneNumber);
    if (primaryQr.isConnected || primaryQr.rawQr) {
      return res.json({
        success: true,
        data: {
          qr: primaryQr.rawQr,
          rawQr: primaryQr.rawQr,
          qrCode: primaryQr.qrCode,
          phoneNumber: primaryQr.phoneNumber,
          isConnected: primaryQr.isConnected,
          status: primaryQr.status,
          message: primaryQr.message,
        },
      });
    }

    const { linda, mode } = await getOrInitLindaRuntime();
    const qr = linda.getQRCode();
    if (mode === 'shadow') {
      emitLindaParitySnapshot(buildLindaParitySnapshot('route_qr', linda, mode));
    }

    if (!qr) {
      return res.json({
        success: true,
        data: {
          qr: null,
          rawQr: null,
          qrCode: null,
          phoneNumber: primary.phoneNumber,
          message: linda.isConnected()
            ? 'Already authenticated — no QR needed'
            : primaryQr.message || 'QR not yet generated — initialize first',
          isConnected: linda.isConnected(),
        },
      });
    }

    res.json({ success: true, data: { qr, rawQr: qr, isConnected: false } });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, error: err instanceof Error ? err.message : 'Unknown error' });
  }
};

export const connectLinda = async (req: Request, res: Response) => {
  try {
    if (!LINDA_ENABLED) {
      return res
        .status(400)
        .json({ success: false, error: 'Linda channel is disabled (LINDA_ENABLED=false)' });
    }
    const targetPhone = String(req.body?.phone || lindaMultiSimPool.getPrimaryAccount().phoneNumber);
    const result = await lindaMultiSimPool.connectAccount(targetPhone);
    res.json({
      success: true,
      data: result,
      message: `Linda initialization started for ${result.account} — poll /api/linda/pool/${encodeURIComponent(result.account)}/qr for live QR`,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : 'Initialization failed',
    });
  }
};

export const disconnectLinda = async (req: Request, res: Response) => {
  try {
    const targetPhone = String(req.body?.phone || lindaMultiSimPool.getPrimaryAccount().phoneNumber);
    await lindaMultiSimPool.disconnectAccount(targetPhone);
    const legacy = getLindaClientForMode();
    if (legacy.isConnected()) {
      await legacy.disconnect();
    }
    res.json({ success: true, message: `Linda (${targetPhone}) disconnected` });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, error: err instanceof Error ? err.message : 'Unknown error' });
  }
};

export const getStats = async (_req: Request, res: Response) => {
  try {
    const { linda, mode } = await getOrInitLindaRuntime();
    const poolTelemetry = lindaMultiSimPool.getPoolTelemetry();
    const legacyStats = linda.getStats();
    if (mode === 'shadow') {
      emitLindaParitySnapshot(buildLindaParitySnapshot('route_stats', linda, mode));
    }
    res.json({
      success: true,
      data: {
        ...legacyStats,
        isConnected: poolTelemetry.connectedCount > 0 || legacyStats.isConnected,
        connectedLines: poolTelemetry.connectedCount,
        poolSize: poolTelemetry.poolSize,
      },
      timestamp: new Date(),
    });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, error: err instanceof Error ? err.message : 'Unknown error' });
  }
};

export const getSessions = async (_req: Request, res: Response) => {
  try {
    const { mode, sessionBridge } = await getOrInitLindaRuntime();
    const poolAccounts = lindaMultiSimPool.listPoolAccounts();

    if (mode === 'shadow') {
      sessionBridge.traceSnapshot('route_sessions');
    }

    const sessions = poolAccounts.map(acc => ({
      id: acc.id,
      botId: acc.sessionId,
      phone: acc.phoneNumber,
      displayName: acc.displayName,
      role: acc.role,
      status: acc.engineStatus,
      isConnected: acc.isConnected,
      isActive: acc.isActive,
      qrAvailable: acc.qrAvailable,
      sessionDirExists: acc.sessionDirExists,
      hourlySent: acc.hourlySent,
      hourlyRemaining: acc.hourlyRemaining,
      messagesSent: acc.messagesSent,
      messagesReceived: acc.messagesReceived,
    }));
    res.json({ success: true, data: { sessions, total: sessions.length } });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, error: err instanceof Error ? err.message : 'Unknown error' });
  }
};

export const getHealth = async (_req: Request, res: Response) => {
  try {
    const poolTelemetry = lindaMultiSimPool.getPoolTelemetry();
    const legacyStats = getLindaClientForMode().getStats();
    const healthy = poolTelemetry.connectedCount > 0 || legacyStats.isConnected;
    res.status(healthy ? 200 : 503).json({
      success: healthy,
      status: healthy ? 'READY' : legacyStats.status,
      isConnected: healthy,
      connectedLines: poolTelemetry.connectedCount,
      poolSize: poolTelemetry.poolSize,
      enabled: LINDA_ENABLED,
      timestamp: new Date(),
    });
  } catch {
    res.status(500).json({ success: false, error: 'Health check failed' });
  }
};

export const readyCheck = async (_req: Request, res: Response) => {
  try {
    const poolTelemetry = lindaMultiSimPool.getPoolTelemetry();
    const legacy = getLindaClientForMode();
    if (poolTelemetry.connectedCount === 0 && !legacy.isConnected()) {
      return res.status(503).json({
        success: false,
        error: 'No Linda WhatsApp SIM connected — pair Primary Master (+971505760056) via /api/linda/qr',
      });
    }
    res.json({
      success: true,
      message: `Linda is ready (${poolTelemetry.connectedCount}/${poolTelemetry.poolSize} SIM lines connected)`,
    });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, error: err instanceof Error ? err.message : 'Unknown error' });
  }
};
