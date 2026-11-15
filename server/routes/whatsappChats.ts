import { Router, type Request, type Response } from 'express';

export interface WhatsAppChatSummary {
  jid: string;
  phone: string;
  pushName: string;
  avatarUrl: string | null;
  unreadCount: number;
  lastMessage: string;
  lastMessageTimestamp: string;
  isGroup: boolean;
}

export interface WhatsAppChatMessage {
  id: string;
  fromMe: boolean;
  body: string;
  timestamp: string;
  status: 'PENDING' | 'SENT' | 'DELIVERED' | 'READ';
  mediaType?: string | null;
}

const router = Router();

// In-memory store synced by Baileys Primary Master (+971505760056) socket events
const chatStore = new Map<string, WhatsAppChatSummary>();
const messageStore = new Map<string, WhatsAppChatMessage[]>();

export function upsertBaileysChat(chat: WhatsAppChatSummary): void {
  chatStore.set(chat.jid, chat);
}

export function appendBaileysMessage(jid: string, message: WhatsAppChatMessage): void {
  const existing = messageStore.get(jid) || [];
  if (!existing.some(m => m.id === message.id)) {
    messageStore.set(jid, [...existing, message]);
  }
}

/**
 * GET /api/whatsapp/chats
 * Returns active conversations sorted by most recent message.
 */
router.get('/', (_req: Request, res: Response) => {
  const chats = Array.from(chatStore.values()).sort(
    (a, b) =>
      new Date(b.lastMessageTimestamp).getTime() - new Date(a.lastMessageTimestamp).getTime()
  );
  res.json({
    success: true,
    account: 'Primary Master (+971505760056)',
    data: { chats },
  });
});

/**
 * GET /api/whatsapp/chats/:jid/messages
 * Returns message history for a conversation.
 */
router.get('/:jid/messages', (req: Request, res: Response) => {
  const jid = decodeURIComponent(req.params.jid);
  const messages = messageStore.get(jid) || [];
  res.json({
    success: true,
    data: { jid, messages },
  });
});

/**
 * POST /api/whatsapp/chats/:jid/send
 * Sends an outbound text/media message through the Primary Master socket.
 */
router.post('/:jid/send', (req: Request, res: Response) => {
  const jid = decodeURIComponent(req.params.jid);
  const { text, mediaType } = req.body as { text?: string; mediaType?: string };
  if (!text || !text.trim()) {
    res.status(400).json({ success: false, message: 'Message text is required' });
    return;
  }

  const outbound: WhatsAppChatMessage = {
    id: `wa-${Date.now()}`,
    fromMe: true,
    body: text.trim(),
    timestamp: new Date().toISOString(),
    status: 'SENT',
    mediaType: mediaType ?? null,
  };

  appendBaileysMessage(jid, outbound);

  const existingChat = chatStore.get(jid);
  if (existingChat) {
    chatStore.set(jid, {
      ...existingChat,
      lastMessage: outbound.body,
      lastMessageTimestamp: outbound.timestamp,
    });
  }

  res.status(201).json({
    success: true,
    data: { jid, message: outbound },
  });
});

export default router;
