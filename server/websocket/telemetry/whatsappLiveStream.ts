import type { Server as SocketIOServer } from 'socket.io';

export interface WhatsAppLiveMessageEvent {
  id: string;
  from: string;
  to?: string;
  body: string;
  timestamp: string;
  hasMedia: boolean;
  type: string;
}

export class WhatsAppLiveStream {
  private io: SocketIOServer;

  constructor(io: SocketIOServer) {
    this.io = io;
  }

  public emitIncomingMessage(event: WhatsAppLiveMessageEvent): void {
    this.io.to(`wa:chat:${event.from}`).emit('wa:message_received', event);
    this.io.emit('wa:global_activity', {
      type: 'INCOMING_MESSAGE',
      from: event.from,
      preview: event.body.slice(0, 40),
      timestamp: event.timestamp,
    });
  }

  public emitStatusChange(clientId: string, status: string): void {
    this.io.emit('wa:status_changed', {
      clientId,
      status,
      timestamp: new Date().toISOString(),
    });
  }

  public emitBroadcastProgress(campaignId: string, progress: { sent: number; total: number; failed: number }): void {
    this.io.emit(`wa:campaign:${campaignId}:progress`, {
      campaignId,
      ...progress,
      percentage: progress.total > 0 ? Math.round((progress.sent / progress.total) * 100) : 0,
    });
  }
}
