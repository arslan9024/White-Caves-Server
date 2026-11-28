export interface WhatsAppMessage {
  id: string;
  from: string;
  to?: string;
  body: string;
  timestamp: Date;
  isFromMe: boolean;
  /** Real sender phone digits resolved via getContact() (WhatsApp may send `from` as an opaque @lid id). */
  senderPhone?: string;
  hasMedia: boolean;
  type: 'text' | 'image' | 'document' | 'audio' | 'video';
}

export interface WhatsAppEngineConfig {
  clientId: string;
  authStrategy?: 'LOCAL_AUTH';
  sessionPath?: string;
  headless?: boolean;
  autoRestart?: boolean;
  maxReconnectAttempts?: number;
  reconnectDelay?: number;
  pairWithPhoneNumber?: {
    phoneNumber: string;
    showNotification?: boolean;
    intervalMs?: number;
  };
}

export enum WhatsAppEngineStatus {
  DISCONNECTED = 'DISCONNECTED',
  AUTHENTICATING = 'AUTHENTICATING',
  READY = 'READY',
  RECONNECTING = 'RECONNECTING',
  ERROR = 'ERROR',
}

export interface WhatsAppEngineStats {
  status: WhatsAppEngineStatus;
  isConnected: boolean;
  queuedMessages: number;
  reconnectAttempts: number;
  messagesSent: number;
  messagesReceived: number;
}

export interface WhatsAppChatSummary {
  id: string;
  name: string;
  unreadCount: number;
  lastMessage?: string;
}

export interface WhatsAppBroadcastResult {
  phone: string;
  messageId?: string;
  error?: string;
}

export interface WhatsAppMessageSentEvent {
  to: string;
  message: string;
  messageId: string;
  timestamp: Date;
}
