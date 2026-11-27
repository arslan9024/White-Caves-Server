import readline from 'node:readline';
import { lindaMultiSimPool } from '../services/whatsapp/LindaMultiSimPoolService.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('LindaInteractiveTerminal');
let attached = false;

/**
 * Interactive Linda Terminal Dashboard for `npm run dev` / `npm run dev:trio`.
 * Provides live status, 8-char pairing code keypad (`p <phone>`), and test send (`s <phone> <msg>`).
 */
export function attachLindaInteractiveTerminal(): void {
  if (attached) return;
  attached = true;

  const primary = lindaMultiSimPool.getPrimaryAccount();
  console.log('\n==============================================================');
  console.log('  AI LINDA — INTERACTIVE SERVER TERMINAL DASHBOARD');
  console.log('  Primary Master: +' + primary.phoneNumber.replace(/\D/g, ''));
  console.log('  Commands: status | p [phone] | qr | s <phone> <msg> | help');
  console.log('==============================================================\n');

  if (!process.stdin.isTTY) {
    log.info('Non-TTY stdin detected; interactive keypad disabled, status logging active.');
    return;
  }

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  rl.on('line', async (line: string) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    const [cmd, ...rest] = trimmed.split(/\s+/);

    if (cmd === 'status') {
      const accounts = lindaMultiSimPool.listPoolAccounts();
      console.table(
        accounts.map(a => ({
          id: a.id,
          phone: a.phoneNumber,
          role: a.simTier,
          status: a.engineStatus,
          connected: a.isConnected,
          sent: a.messagesSent,
          recv: a.messagesReceived,
        }))
      );
    } else if (cmd === 'p') {
      const targetPhone = (rest[0] || primary.phoneNumber).replace(/\D/g, '');
      try {
        const result = await lindaMultiSimPool.requestAccountPairingCode(targetPhone);
        console.log(`\n[PAIRING CODE] +${targetPhone}: ${result.pairingCode}\n`);
      } catch (err) {
        console.error('[Pairing Error]', err instanceof Error ? err.message : err);
      }
    } else if (cmd === 'qr') {
      try {
        const qrRes = await lindaMultiSimPool.getAccountQr(primary.phoneNumber);
        console.log('[QR]', qrRes.isConnected ? 'Already connected' : qrRes.message || (qrRes.rawQr ? 'QR ready' : 'Pending'));
      } catch (err) {
        console.error('[QR Error]', err instanceof Error ? err.message : err);
      }
    } else if (cmd === 's' && rest.length >= 2) {
      const [to, ...msgParts] = rest;
      const best = lindaMultiSimPool.getBestConnectedEngine(primary.phoneNumber);
      if (!best) {
        console.error('[Send Error] No connected WhatsApp engine. Pair first with: p');
        return;
      }
      try {
        const msgId = await best.engine.sendMessage(to, msgParts.join(' '));
        console.log(`[SENT] -> ${to} (id: ${msgId})`);
      } catch (err) {
        console.error('[Send Error]', err instanceof Error ? err.message : err);
      }
    } else {
      console.log('Commands: status | p [phone] | qr | s <phone> <msg> | help');
    }
  });
}
