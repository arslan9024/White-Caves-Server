import { EventEmitter } from 'events';
import { getSocketServer } from '../../socketServer.js';
import { startReadyWatchdog } from './engineReadyWatchdog.js';
import {
  LINDA_SESSIONS_PATH,
  LINDA_HEADLESS,
  LINDA_RECONNECT_DELAY,
  LINDA_MAX_RECONNECT_ATTEMPTS,
} from '../../../config/env.js';
import {
  type WhatsAppMessage,
  type WhatsAppEngineConfig,
  type WhatsAppEngineStats,
  type WhatsAppChatSummary,
  type WhatsAppBroadcastResult,
  WhatsAppEngineStatus,
} from './whatsAppEngineTypes.js';
import {
  normalizeIncomingMessage,
  formatChatId,
  sanitizePhoneNumber,
} from './whatsAppMessageHelpers.js';
import { setWhatsAppEngine } from './whatsAppEngineRegistry.js';
import {
  initializeWhatsAppClient,
  calculateReconnectDelay,
} from './whatsAppLifecycleManager.js';

export interface WhatsAppEngineCore extends EventEmitter {
  isHardwareConnected(): boolean;
  initialize(): Promise<void>;
  requestPairingCode(phoneNumber: string): Promise<string>;
  sendMessage(phoneNumber: string, message: string): Promise<string>;
  broadcastMessage(phoneNumbers: string[], message: string): Promise<WhatsAppBroadcastResult[]>;
  getMessageQueue(): WhatsAppMessage[];
  getConversations(): Promise<WhatsAppChatSummary[]>;
  getConversationHistory(phoneNumber: string, limit?: number): Promise<WhatsAppMessage[]>;
  getQRCode(): string | null;
  disconnect(): Promise<void>;
  getStatus(): WhatsAppEngineStatus;
  isConnected(): boolean;
  getStats(): WhatsAppEngineStats;
}

/**
 * Generic WhatsApp Engine Client with WebSocket push telemetry
 */
export class WhatsAppEngine extends EventEmitter implements WhatsAppEngineCore {
  private status: WhatsAppEngineStatus = WhatsAppEngineStatus.DISCONNECTED;
  private config: Omit<Required<WhatsAppEngineConfig>, 'pairWithPhoneNumber'> &
    Pick<WhatsAppEngineConfig, 'pairWithPhoneNumber'>;
  private reconnectAttempts = 0;
  private sessionActive = false;
  private clientAuthenticated = false;
  private messageQueue: WhatsAppMessage[] = [];
  private qrCode: string | null = null;
  private messagesSent = 0;
  private messagesReceived = 0;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private client: any = null;
  private initPromise: Promise<void> | null = null;

  constructor(config: WhatsAppEngineConfig) {
    super();
    this.config = {
      clientId: config.clientId,
      authStrategy: 'LOCAL_AUTH',
      sessionPath: config.sessionPath ?? LINDA_SESSIONS_PATH,
      headless: config.headless ?? LINDA_HEADLESS,
      autoRestart: config.autoRestart ?? true,
      maxReconnectAttempts: config.maxReconnectAttempts ?? LINDA_MAX_RECONNECT_ATTEMPTS,
      reconnectDelay: config.reconnectDelay ?? LINDA_RECONNECT_DELAY,
      pairWithPhoneNumber: config.pairWithPhoneNumber,
    };
    setWhatsAppEngine(this.config.clientId, this);
  }

  private markReady(): void {
    this.qrCode = null;
    this.reconnectAttempts = 0;
    this.clientAuthenticated = true;
    this.sessionActive = true;
    this.setStatus(WhatsAppEngineStatus.READY);
    this.emit('ready');
  }

  public isHardwareConnected(): boolean {
    return (
      this.clientAuthenticated && this.sessionActive && this.status === WhatsAppEngineStatus.READY
    );
  }

  public async initialize(): Promise<void> {
    if (this.sessionActive && this.clientAuthenticated) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      try {
        this.clientAuthenticated = false;
        this.client = await initializeWhatsAppClient(
          this,
          this.config,
          (s) => this.setStatus(s),
          (client) => this.setupEventListeners(client),
          (client) => {
            this.client = client;
          }
        );
      } catch (error) {
        this.clientAuthenticated = false;
        this.setStatus(WhatsAppEngineStatus.ERROR);
        console.error(`[WhatsAppEngine] Initialization failed for ${this.config.clientId}:`, error);
        this.emit('error', error);
        if (this.config.autoRestart && this.reconnectAttempts < this.config.maxReconnectAttempts) {
          void this.attemptReconnect();
        }
        throw error;
      } finally {
        this.initPromise = null;
      }
    })();

    return this.initPromise;
  }

  private setupEventListeners(client: any): void {
    if (!client) return;

    client.on('qr', (qr: string) => {
      if (this.sessionActive || this.clientAuthenticated) {
        return;
      }
      console.log(`[WhatsAppEngine:${this.config.clientId}] STATE 1: QR Code generated — scan to authenticate`);
      this.clientAuthenticated = false;
      this.qrCode = qr;
      this.emit('qr', qr);
    });

    client.on('code', (code: string) => {
      console.log(`[WhatsAppEngine:${this.config.clientId}] PAIRING CODE: ${code}`);
      this.emit('code', code);
    });

    client.on('authenticated', () => {
      console.log(`[WhatsAppEngine:${this.config.clientId}] STATE 2: Physical device authenticated successfully`);
      this.clientAuthenticated = true;
      this.emit('authenticated');

      startReadyWatchdog({
        clientId: this.config.clientId,
        getClient: () => this.client,
        isReady: () => this.sessionActive,
        onReady: () => this.markReady(),
        onTimeout: () => { if (this.config.autoRestart) void this.attemptReconnect(); },
      });
    });

    client.on('ready', () => {
      if (this.sessionActive) return;
      console.log(`[WhatsAppEngine:${this.config.clientId}] STATE 3: Client ready and physical hardware link active`);
      this.markReady();
    });

    client.on('auth_failure', (msg: string) => {
      console.error(`[WhatsAppEngine:${this.config.clientId}] EXCEPTION: Auth failure:`, msg);
      this.clientAuthenticated = false;
      this.sessionActive = false;
      this.qrCode = null;
      this.setStatus(WhatsAppEngineStatus.ERROR);
      this.emit('auth_failure', msg);
      if (this.config.autoRestart) this.attemptReconnect();
    });

    client.on('disconnected', (reason: string) => {
      console.log(`[WhatsAppEngine:${this.config.clientId}] EXCEPTION: Disconnected from hardware:`, reason);
      this.clientAuthenticated = false;
      this.sessionActive = false;
      this.qrCode = null;
      this.setStatus(WhatsAppEngineStatus.DISCONNECTED);
      this.emit('disconnected', reason);
      if (this.config.autoRestart) this.attemptReconnect();
    });

    client.on('message', async (message: unknown) => {
      await this.handleIncomingMessage(message);
    });

    console.log(`[WhatsAppEngine:${this.config.clientId}] Hardware event listeners registered`);
  }

  private async handleIncomingMessage(message: unknown): Promise<void> {
    try {
      const wrapped = normalizeIncomingMessage(message);
      try {
        const contact = await (message as { getContact?: () => Promise<{ number?: string }> }).getContact?.();
        if (contact?.number) wrapped.senderPhone = contact.number;
      } catch {
        // contact lookup is best-effort
      }
      if (this.messageQueue.length >= 500) {
        this.messageQueue.shift();
      }
      this.messageQueue.push(wrapped);
      this.messagesReceived += 1;
      this.emit('message', wrapped);
      getSocketServer()?.emitLindaMessage(wrapped);
      console.log(`[WhatsAppEngine:${this.config.clientId}] ← from ${wrapped.from}: ${wrapped.body.substring(0, 60)}`);
    } catch (error) {
      console.error(`[WhatsAppEngine:${this.config.clientId}] Error handling incoming message:`, error);
    }
  }

  public async requestPairingCode(phoneNumber: string): Promise<string> {
    if (!this.client) {
      void this.initialize().catch(() => {});
      // Wait up to 8s for Puppeteer client & page to mount before requesting pairing code
      for (let i = 0; i < 16 && !this.client?.pupPage; i++) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    const sanitizedNumber = sanitizePhoneNumber(phoneNumber);
    if (typeof this.client?.requestPairingCode !== 'function') {
      throw new Error(
        `WhatsApp client for ${this.config.clientId} is still initializing or does not support pairing codes yet. Retry in 5 seconds or use Live QR.`
      );
    }
    const code = await this.client.requestPairingCode(sanitizedNumber, true);
    if (!code || typeof code !== 'string') {
      throw new Error(`WhatsApp did not return a valid pairing code for +${sanitizedNumber}`);
    }
    console.log(`[WhatsAppEngine:${this.config.clientId}] Pairing code generated for ${sanitizedNumber}`);
    return code;
  }

  public async sendMessage(phoneNumber: string, message: string): Promise<string> {
    if (!this.sessionActive || !this.client) {
      throw new Error(`WhatsAppEngine(${this.config.clientId}) session not active — call initialize() first`);
    }
    const chatId = formatChatId(phoneNumber);
    const sent = await this.client.sendMessage(chatId, message);
    const messageId: string = sent?.id?.id ?? `msg_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    this.messagesSent += 1;
    this.emit('message_sent', { to: phoneNumber, message, messageId, timestamp: new Date() });
    console.log(`[WhatsAppEngine:${this.config.clientId}] → to ${phoneNumber}: ${message.substring(0, 60)}`);
    return messageId;
  }

  public async broadcastMessage(
    phoneNumbers: string[],
    message: string
  ): Promise<WhatsAppBroadcastResult[]> {
    const results: WhatsAppBroadcastResult[] = [];
    for (const phone of phoneNumbers) {
      try {
        const id = await this.sendMessage(phone, message);
        results.push({ phone, messageId: id });
        const delay = 2000 + Math.floor(Math.random() * 6000);
        await new Promise(r => setTimeout(r, delay));
      } catch (err) {
        results.push({ phone, error: err instanceof Error ? err.message : String(err) });
      }
    }
    return results;
  }

  public getMessageQueue(): WhatsAppMessage[] {
    const msgs = [...this.messageQueue];
    this.messageQueue = [];
    return msgs;
  }

  public async getConversations(): Promise<WhatsAppChatSummary[]> {
    if (!this.sessionActive || !this.client) return [];
    const chats = await this.client.getChats();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return chats.slice(0, 50).map((c: Record<string, any>) => ({
      id: c.id?._serialized ?? String(c.id),
      name: c.name ?? c.id?._serialized ?? 'Unknown',
      unreadCount: c.unreadCount ?? 0,
      lastMessage: c.lastMessage?.body,
    }));
  }

  public async getConversationHistory(phoneNumber: string, limit = 50): Promise<WhatsAppMessage[]> {
    if (!this.sessionActive || !this.client) return [];
    const chatId = formatChatId(phoneNumber);
    const chat = await this.client.getChatById(chatId);
    const messages = await chat.fetchMessages({ limit });
    return messages.map((m: unknown): WhatsAppMessage => normalizeIncomingMessage(m));
  }

  public getQRCode(): string | null {
    return this.qrCode;
  }

  public async disconnect(): Promise<void> {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    try {
      if (this.client) {
        await this.client.destroy();
        this.client = null;
      }
    } catch (err) {
      console.warn(`[WhatsAppEngine:${this.config.clientId}] Error during destroy:`, err);
    }
    this.setStatus(WhatsAppEngineStatus.DISCONNECTED);
    this.sessionActive = false;
    this.qrCode = null;
    this.emit('disconnected', 'manual');
    console.log(`[WhatsAppEngine:${this.config.clientId}] Client disconnected`);
  }

  public getStatus(): WhatsAppEngineStatus {
    return this.status;
  }

  public isConnected(): boolean {
    return this.status === WhatsAppEngineStatus.READY && this.sessionActive;
  }

  public getStats(): WhatsAppEngineStats {
    return { status: this.status, isConnected: this.isConnected(), queuedMessages: this.messageQueue.length, reconnectAttempts: this.reconnectAttempts, messagesSent: this.messagesSent, messagesReceived: this.messagesReceived };
  }

  private setStatus(newStatus: WhatsAppEngineStatus): void {
    if (this.status !== newStatus) {
      console.log(`[WhatsAppEngine:${this.config.clientId}] Status: ${this.status} → ${newStatus}`);
      this.status = newStatus;
      this.emit('status_changed', newStatus);

      // Push real-time connection state change to all CRM frontends
      try {
        const isConn = newStatus === WhatsAppEngineStatus.READY && this.sessionActive;
        const normalizedStatus =
          newStatus === WhatsAppEngineStatus.READY
            ? 'connected'
            : newStatus === WhatsAppEngineStatus.RECONNECTING
              ? 'reconnecting'
              : newStatus === WhatsAppEngineStatus.ERROR
                ? 'error'
                : 'disconnected';

        getSocketServer()?.emitLindaConnectionState({
          account: this.config.clientId || '+971505760056',
          status: normalizedStatus,
          isConnected: isConn,
          timestamp: Date.now(),
        });
      } catch (err) {
        console.warn(`[WhatsAppEngine:${this.config.clientId}] Socket broadcast omitted:`, err);
      }
    }
  }

  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  private async attemptReconnect(): Promise<void> {
    if (this.status === WhatsAppEngineStatus.RECONNECTING || this.reconnectTimer) {
      return;
    }
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      this.setStatus(WhatsAppEngineStatus.ERROR);
      return;
    }
    this.reconnectAttempts += 1;
    const delay = calculateReconnectDelay(this.config.reconnectDelay, this.reconnectAttempts);
    this.setStatus(WhatsAppEngineStatus.RECONNECTING);
    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null;
      try {
        this.sessionActive = false;
        if (this.client) {
          await this.client.destroy().catch(() => {});
          this.client = null;
        }
        await this.initialize();
      } catch (err) {
        console.error(`[WhatsAppEngine:${this.config.clientId}] Reconnection failed:`, err);
        await this.attemptReconnect();
      }
    }, delay);
  }
}
