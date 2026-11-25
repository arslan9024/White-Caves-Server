import { Request, Response } from 'express';
import { getSocketServer } from '../../services/socketServer.js';
import {
  buildLindaParitySnapshot,
  emitLindaParitySnapshot,
} from '../../services/whatsapp/linda-core/bridge/shadowParityReporter.js';
import { checkPhoneSavedInGoraha } from '../../services/whatsapp/gorahaContactCheckService.js';
import { lindaMultiSimPool } from '../../services/whatsapp/LindaMultiSimPoolService.js';
import { processLandlordAvailabilityReply } from '../../services/whatsapp/dh2LandlordReplyVaultSync.js';
import { applyTemplate, getOrInitLindaRuntime } from './lindaCommon.js';
import { createLogger } from '../../utils/logger.js';

const log = createLogger('lindaMessageController');

export const sendMessage = async (req: Request, res: Response) => {
  try {
    const { phoneNumber, message, accountPhone } = req.body;
    const { conversationId } = req.params as Record<string, string>;

    if (!phoneNumber || !message) {
      return res
        .status(400)
        .json({ success: false, error: 'Missing required fields: phoneNumber, message' });
    }

    const cleanPhone = phoneNumber.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      return res.status(400).json({ success: false, error: 'Invalid phone number format' });
    }

    let messageId: string;
    let resolvedAccount = 'linda-broadcast';
    const connectedPool = lindaMultiSimPool.getBestConnectedEngine(
      accountPhone ? String(accountPhone) : undefined
    );

    if (connectedPool) {
      resolvedAccount = connectedPool.account.phoneNumber;
      messageId = await connectedPool.engine.sendMessage(cleanPhone, message);
    } else {
      const { linda, mode, messageBridge } = await getOrInitLindaRuntime();
      if (!linda.isConnected()) {
        return res.status(503).json({
          success: false,
          error: `WhatsApp line (${accountPhone || '+971505760056'}) is offline. Scan QR or pair device first.`,
        });
      }
      messageId = await messageBridge.send({ phoneNumber: cleanPhone, message });
      if (mode === 'shadow') {
        emitLindaParitySnapshot(buildLindaParitySnapshot('route_send', linda, mode));
      }
    }

    getSocketServer()?.emitLindaMessage({
      id: messageId,
      from: cleanPhone,
      body: message,
      timestamp: new Date(),
      hasMedia: false,
      type: 'chat',
    });

    res.json({
      success: true,
      data: {
        conversationId,
        messageId,
        phoneNumber: cleanPhone,
        accountPhone: resolvedAccount,
        message: message.substring(0, 100) + (message.length > 100 ? '...' : ''),
        timestamp: new Date(),
        channel: 'LINDA_WHATSAPP',
      },
    });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, error: err instanceof Error ? err.message : 'Unknown error' });
  }
};

export const broadcastMessages = async (req: Request, res: Response) => {
  try {
    const { phoneNumbers, message, templateName, templateVars } = req.body;

    if (!phoneNumbers || !Array.isArray(phoneNumbers) || phoneNumbers.length === 0) {
      return res
        .status(400)
        .json({ success: false, error: 'phoneNumbers must be a non-empty array' });
    }
    if (!message && !templateName) {
      return res
        .status(400)
        .json({ success: false, error: 'Either message or templateName is required' });
    }
    if (phoneNumbers.length > 1000) {
      return res
        .status(400)
        .json({ success: false, error: 'Maximum 1000 recipients per broadcast request' });
    }

    const cleanNumbers = phoneNumbers
      .map((p: string) => p.replace(/\D/g, ''))
      .filter((p: string) => p.length >= 10);

    let broadcastMessage = message;
    if (!broadcastMessage && templateName) {
      broadcastMessage = templateName;
      broadcastMessage = applyTemplate(
        broadcastMessage,
        templateVars as Record<string, unknown> | null
      );
    }

    const { linda, mode, messageBridge } = await getOrInitLindaRuntime();
    res.json({
      success: true,
      data: { accepted: true, recipients: cleanNumbers.length, channel: 'LINDA_WHATSAPP', timestamp: new Date() },
    });

    messageBridge
      .broadcast({ phoneNumbers: cleanNumbers, message: broadcastMessage })
      .then(results => {
        const failed = results.filter(r => r.error).length;
        log.warn(`[Linda] Broadcast complete: ${results.length - failed} sent, ${failed} failed`);
        getSocketServer()?.emitLindaMessage({
          id: `broadcast_${Date.now()}`,
          from: 'system',
          body: `Broadcast complete: ${results.length - failed} sent, ${failed} failed`,
          timestamp: new Date(),
          hasMedia: false,
          type: 'chat',
        });
        if (mode === 'shadow') emitLindaParitySnapshot(buildLindaParitySnapshot('route_broadcast', linda, mode));
      })
      .catch(err => log.error('[Linda] Broadcast error:', err));
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Unknown error' });
  }
};

export const webhookIngestion = async (req: Request, res: Response) => {
  try {
    const body = (req.body || {}) as {
      from?: string;
      body?: string;
      message?: string;
      accountPhone?: string;
      contactName?: string;
    };

    // Direct inbound webhook triage mode when payload includes sender + message text
    const inboundText = body.body || body.message;
    if (body.from && inboundText) {
      const cleanFrom = String(body.from).replace(/\D/g, '');
      const linePhone = body.accountPhone || '+971503869886';
      const payload = {
        id: `wh_${Date.now()}`,
        from: cleanFrom,
        body: inboundText,
        timestamp: new Date(),
        hasMedia: false,
        type: 'chat',
      };
      getSocketServer()?.emitLindaMessage(payload);

      const landlordTriage = await processLandlordAvailabilityReply({
        hunterSimPhone: linePhone,
        landlordPhone: cleanFrom,
        landlordName: body.contactName,
        message: inboundText,
      });

      const tenantTriage =
        !landlordTriage.syncedToMaryVault && !landlordTriage.suppressedDnc
          ? await lindaMultiSimPool.routeInboundTenantToViewing({
              fromPhone: cleanFrom,
              message: inboundText,
              tenantName: body.contactName,
              receivedOnLine: linePhone,
            })
          : null;

      return res.json({
        success: true,
        data: {
          mode: 'inbound_webhook_triage',
          conversationId: `LINDA_${cleanFrom}`,
          channel: 'LINDA_WHATSAPP',
          landlordTriage,
          tenantTriage,
        },
      });
    }

    const { linda, mode, messageBridge } = await getOrInitLindaRuntime();
    const messages = messageBridge.getQueue();

    if (mode === 'shadow') {
      emitLindaParitySnapshot(buildLindaParitySnapshot('route_webhook_poll', linda, mode));
    }

    const processedMessages = messages.map(msg => {
      const payload = { ...msg };
      getSocketServer()?.emitLindaMessage(payload);
      return {
        ...payload,
        conversationId: `LINDA_${msg.from.replace(/\D/g, '')}`,
        channel: 'LINDA_WHATSAPP',
      };
    });

    res.json({
      success: true,
      data: { messages: processedMessages, count: processedMessages.length },
    });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, error: err instanceof Error ? err.message : 'Unknown error' });
  }
};

export const getConversations = async (req: Request, res: Response) => {
  try {
    const accountPhone = typeof req.query.accountPhone === 'string' ? req.query.accountPhone : '';
    const connectedPool = lindaMultiSimPool.getBestConnectedEngine(accountPhone || undefined);
    if (connectedPool) {
      const conversations = await connectedPool.engine.getConversations();
      return res.json({
        success: true,
        data: {
          conversations,
          count: conversations.length,
          accountPhone: connectedPool.account.phoneNumber,
          source: 'multi-sim-pool',
        },
      });
    }

    if (accountPhone) {
      const poolAccount = lindaMultiSimPool.findAccount(accountPhone);
      if (poolAccount) {
        return res.json({
          success: true,
          data: {
            conversations: [],
            count: 0,
            accountPhone: poolAccount.phoneNumber,
            source: 'multi-sim-pool-offline',
          },
        });
      }
    }

    const { messageBridge } = await getOrInitLindaRuntime();
    const conversations = await messageBridge.getConversations();
    res.json({ success: true, data: { conversations, count: conversations.length, source: 'in-process' } });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, error: err instanceof Error ? err.message : 'Unknown error' });
  }
};

export const getConversationHistory = async (req: Request, res: Response) => {
  try {
    const { phoneNumber } = req.params as Record<string, string>;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
    const accountPhone = typeof req.query.accountPhone === 'string' ? req.query.accountPhone : '';
    const connectedPool = lindaMultiSimPool.getBestConnectedEngine(accountPhone || undefined);

    if (connectedPool) {
      const history = await connectedPool.engine.getConversationHistory(phoneNumber, limit);
      return res.json({
        success: true,
        data: {
          phoneNumber,
          accountPhone: connectedPool.account.phoneNumber,
          messages: history,
          count: history.length,
          source: 'multi-sim-pool',
        },
      });
    }

    if (accountPhone && lindaMultiSimPool.findAccount(accountPhone)) {
      return res.json({
        success: true,
        data: { phoneNumber, accountPhone, messages: [], count: 0, source: 'multi-sim-pool-offline' },
      });
    }

    const { messageBridge } = await getOrInitLindaRuntime();
    const history = await messageBridge.getConversationHistory(phoneNumber, limit);

    res.json({ success: true, data: { phoneNumber, messages: history, count: history.length, source: 'in-process' } });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, error: err instanceof Error ? err.message : 'Unknown error' });
  }
};

export const getGorahaSavedStatus = async (req: Request, res: Response) => {
  try {
    const { phoneNumber } = req.params as Record<string, string>;
    const cleanPhone = String(phoneNumber || '').replace(/\D/g, '');
    if (cleanPhone.length < 8) return res.status(400).json({ success: false, error: 'Invalid phone number format' });

    const { messageBridge } = await getOrInitLindaRuntime();
    const history = await messageBridge.getConversationHistory(cleanPhone, 1);
    const goraha = await checkPhoneSavedInGoraha(cleanPhone);

    res.json({
      success: true,
      data: {
        phoneNumber: cleanPhone,
        hasLindaConversation: history.length > 0,
        isSavedInGoraha: goraha.isSaved,
        conversationSavedToGoraha: history.length > 0 && goraha.isSaved,
        gorahaAccount: {
          isConfigured: goraha.isConfigured,
          isCredentialValid: goraha.isCredentialValid,
          apiAccessValid: goraha.apiAccessValid,
        },
        matchedContact: goraha.isSaved ? { name: goraha.matchedContactName || null, phone: goraha.matchedPhone || null } : null,
        details: goraha.error || null,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Unknown error' });
  }
};

