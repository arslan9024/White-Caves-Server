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
    const stats = linda.getStats();
    const poolAccounts = lindaMultiSimPool.listPoolAccounts();

    if (mode === 'shadow') {
      emitLindaParitySnapshot(buildLindaParitySnapshot('route_status', linda, mode));
    }

    res.json({
      success: true,
      data: {
        ...stats,
        enabled: LINDA_ENABLED,
        poolSize: poolAccounts.length,
        connectedLines: poolAccounts.filter(a => a.isConnected).length,
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
          hourlySent: a.hourlySent,
          hourlyRemaining: a.hourlyRemaining,
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
          message: linda.isConnected()
            ? 'Already authenticated — no QR needed'
            : 'QR not yet generated — initialize first',
          isConnected: linda.isConnected(),
        },
      });
    }

    res.json({ success: true, data: { qr, isConnected: false } });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, error: err instanceof Error ? err.message : 'Unknown error' });
  }
};

export const connectLinda = async (_req: Request, res: Response) => {
  try {
    if (!LINDA_ENABLED) {
      return res
        .status(400)
        .json({ success: false, error: 'Linda channel is disabled (LINDA_ENABLED=false)' });
    }
    const linda = getLindaClientForMode();
    await linda.initialize();
    res.json({
      success: true,
      message: 'Linda initialization started — scan the QR code at /api/linda/qr',
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : 'Initialization failed',
    });
  }
};

export const disconnectLinda = async (_req: Request, res: Response) => {
  try {
    const linda = getLindaClientForMode();
    await linda.disconnect();
    res.json({ success: true, message: 'Linda disconnected' });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, error: err instanceof Error ? err.message : 'Unknown error' });
  }
};

export const getStats = async (_req: Request, res: Response) => {
  try {
    const { linda, mode } = await getOrInitLindaRuntime();
    if (mode === 'shadow') {
      emitLindaParitySnapshot(buildLindaParitySnapshot('route_stats', linda, mode));
    }
    res.json({ success: true, data: linda.getStats(), timestamp: new Date() });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, error: err instanceof Error ? err.message : 'Unknown error' });
  }
};

export const getSessions = async (_req: Request, res: Response) => {
  try {
    const { linda, mode, sessionBridge } = await getOrInitLindaRuntime();
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
    const linda = getLindaClientForMode();
    const stats = linda.getStats();
    const healthy = stats.isConnected;
    res.status(healthy ? 200 : 503).json({
      success: healthy,
      status: stats.status,
      isConnected: stats.isConnected,
      enabled: LINDA_ENABLED,
      timestamp: new Date(),
    });
  } catch {
    res.status(500).json({ success: false, error: 'Health check failed' });
  }
};

export const readyCheck = async (_req: Request, res: Response) => {
  try {
    const linda = getLindaClientForMode();
    if (!linda.isConnected()) {
      return res.status(503).json({
        success: false,
        error: 'Linda not connected — scan QR at /api/linda/qr',
      });
    }
    res.json({ success: true, message: 'Linda is ready' });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, error: err instanceof Error ? err.message : 'Unknown error' });
  }
};

