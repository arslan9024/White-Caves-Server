/**
 * qrEventStream.ts — SSE endpoint helper streaming base64 QR codes.
 *
 * Opens an HTTP Server-Sent Events stream and pushes QR data-URIs from
 * the WhatsApp engine's `qr` event until the client authenticates or
 * the HTTP connection closes.
 */

import { EventEmitter } from 'events';
import type { ServerResponse } from 'http';

interface QREngine extends EventEmitter {
  on(event: 'qr', listener: (qr: string) => void): this;
  on(event: 'ready', listener: () => void): this;
  on(event: 'authenticated', listener: () => void): this;
}

/**
 * Open an SSE stream on `res` and forward every QR code emitted by `engine`
 * as a `data: { qr: "..." }` event.
 *
 * The stream auto-closes when the engine fires `ready` or `authenticated`,
 * or when the client disconnects.
 *
 * @param res     Express-compatible `ServerResponse`.
 * @param engine  EventEmitter that fires `qr`, `ready`, and `authenticated`.
 */
export function createQRStream(res: ServerResponse, engine: QREngine): void {
  // SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no', // nginx passthrough
  });

  res.write(':ok\n\n'); // initial comment to flush proxies

  let closed = false;

  const cleanup = (): void => {
    if (closed) return;
    closed = true;
    engine.removeListener('qr', onQr);
    engine.removeListener('ready', onDone);
    engine.removeListener('authenticated', onDone);
    if (!res.writableEnded) {
      res.end();
    }
  };

  const onQr = (qr: string): void => {
    if (closed) return;
    const payload = JSON.stringify({ qr, timestamp: Date.now() });
    res.write(`event: qr\ndata: ${payload}\n\n`);
  };

  const onDone = (): void => {
    if (closed) return;
    res.write(`event: authenticated\ndata: ${JSON.stringify({ ok: true })}\n\n`);
    cleanup();
  };

  engine.on('qr', onQr);
  engine.on('ready', onDone);
  engine.on('authenticated', onDone);

  res.on('close', cleanup);
}
