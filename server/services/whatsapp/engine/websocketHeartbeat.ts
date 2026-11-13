/**
 * websocketHeartbeat.ts — Ping/pong watchdog (15 s interval, 45 s timeout).
 *
 * Wraps a WebSocket-like connection and fires a `dead` event when the remote
 * side stops responding to pings, enabling fast failover.
 */

import { EventEmitter } from 'events';

export interface HeartbeatOptions {
  pingIntervalMs?: number;
  pongTimeoutMs?: number;
}

interface PingSender {
  ping?: (data?: unknown) => void;
  send?: (data: string) => void;
}

const DEFAULT_PING_INTERVAL = 15_000;
const DEFAULT_PONG_TIMEOUT = 45_000;

/**
 * WebSocket heartbeat monitor.
 *
 * Events:
 *  - `ping`  — emitted each time a ping is sent
 *  - `pong`  — emitted when a pong (or ping response) is received
 *  - `dead`  — emitted when the connection has not responded within the timeout
 */
export class WebSocketHeartbeat extends EventEmitter {
  private readonly pingIntervalMs: number;
  private readonly pongTimeoutMs: number;

  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private pongTimer: ReturnType<typeof setTimeout> | null = null;
  private alive = true;
  private running = false;

  constructor(opts?: HeartbeatOptions) {
    super();
    this.pingIntervalMs = opts?.pingIntervalMs ?? DEFAULT_PING_INTERVAL;
    this.pongTimeoutMs = opts?.pongTimeoutMs ?? DEFAULT_PONG_TIMEOUT;
  }

  /**
   * Start the heartbeat loop on the given socket-like object.
   * The object should support `ping()` or `send()`.
   */
  start(socket: PingSender): void {
    if (this.running) return;
    this.running = true;
    this.alive = true;

    this.pingTimer = setInterval(() => {
      if (!this.alive) {
        // Previous ping was never answered
        this.emit('dead');
        this.stop();
        return;
      }

      this.alive = false;

      // Send ping
      if (typeof socket.ping === 'function') {
        socket.ping();
      } else if (typeof socket.send === 'function') {
        socket.send(JSON.stringify({ type: '__heartbeat_ping' }));
      }

      this.emit('ping');

      // Arm a hard timeout
      this.clearPongTimer();
      this.pongTimer = setTimeout(() => {
        if (!this.alive) {
          this.emit('dead');
          this.stop();
        }
      }, this.pongTimeoutMs);
    }, this.pingIntervalMs);
  }

  /** Call this when a pong frame (or any valid response) arrives. */
  receivePong(): void {
    this.alive = true;
    this.clearPongTimer();
    this.emit('pong');
  }

  /** Stop the heartbeat monitor. */
  stop(): void {
    this.running = false;
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
    this.clearPongTimer();
  }

  /** Whether the monitor considers the connection alive. */
  isAlive(): boolean {
    return this.alive;
  }

  private clearPongTimer(): void {
    if (this.pongTimer) {
      clearTimeout(this.pongTimer);
      this.pongTimer = null;
    }
  }
}
