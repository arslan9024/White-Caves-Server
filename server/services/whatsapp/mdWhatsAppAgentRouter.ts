import { getAgentOutputSnapshot, getServerStatusSnapshot } from '../../scripts/lindaInteractiveTerminal.js';
import { lindaMultiSimPool } from './LindaMultiSimPoolService.js';

export function buildMdKeypadMenu(): string {
  return [
    '*WHITE CAVES — MD KEYPAD*',
    '[1] Server Status & Health',
    '[2] AI Linda Output',
    '[3] AI Zoe Output',
    '[4] AI Henry Output',
    '[5] AI Daisy Output',
    '[6] AI Diana Output',
    '[7] Pair Master (pair <phone>)',
    '[0] Menu / Help',
    '',
    '_Chat:_ `zoe <msg>`, `@linda <msg>`, `@henry <msg>`, `@daisy <msg>`, `@diana <msg>`',
  ].join('\n');
}

/**
 * Routes MD keypad choices (`0`-`7`, `status`, `health`, `sims`, `ports`, `agents`)
 * and direct AI agent chat (`zoe ...`, `@linda ...`, etc.).
 */
export async function routeMdAgentOrKeypadCommand(trimmed: string): Promise<string | null> {
  const lower = trimmed.toLowerCase();

  if (lower === '0' || lower === 'menu' || lower === 'help' || lower === 'keypad') {
    return buildMdKeypadMenu();
  }
  if (/^(hi\s+zoe|hey\s+zoe|invoke\s+zoe|\/zoe|zoe)$/i.test(trimmed)) {
    return `*AI ZOE (COO — AICC-Sanctum)* online.\n\n${buildMdKeypadMenu()}`;
  }
  if (/^zoe\s+([\s\S]+)$/i.test(trimmed)) {
    const zoeMsg = trimmed.replace(/^zoe\s+/i, '').trim();
    return `*AI ZOE (COO)* received: "${zoeMsg}"\n\n${getAgentOutputSnapshot('zoe')}\n\n_Reply 0 for keypad_`;
  }
  if (lower === '1' || lower === 'status') {
    return `${getServerStatusSnapshot()}\n\n_Reply 0 for keypad_`;
  }
  if (lower === 'health' || lower === 'mem' || lower === 'uptime') {
    const mem = process.memoryUsage();
    const upSec = Math.floor(process.uptime());
    return `*SERVER HEALTH*\nUptime: ${Math.floor(upSec / 3600)}h ${Math.floor((upSec % 3600) / 60)}m ${upSec % 60}s\nRSS: ${Math.round(mem.rss / 1024 / 1024)}MB | Heap: ${Math.round(mem.heapUsed / 1024 / 1024)}MB\nNode: ${process.version} | PID: ${process.pid}\n\n_Reply 0 for keypad_`;
  }
  if (lower === 'sims' || lower === 'sim') {
    const accs = lindaMultiSimPool.listPoolAccounts();
    return `*SIM POOL (${accs.filter(a => a.isConnected).length}/${accs.length} online)*\n${accs.map(a => `${a.isConnected ? '●' : '○'} ${a.id} (+${a.phoneNumber}) [${a.engineStatus}]`).join('\n')}\n\n_Reply 0 for keypad_`;
  }
  if (lower === 'ports') {
    return `*MONOREPO PORTS*\nServer: :5001 | CRM: :3000 | Web: :3001 | Aegis: :3333 | Mobile: :8081\n\n_Reply 0 for keypad_`;
  }
  if (lower === 'agents') {
    return [
      getAgentOutputSnapshot('zoe'),
      getAgentOutputSnapshot('linda'),
      getAgentOutputSnapshot('henry'),
      getAgentOutputSnapshot('daisy'),
      getAgentOutputSnapshot('diana'),
    ].join('\n\n') + '\n\n_Reply 0 for keypad_';
  }
  if (lower === '2') return `${getAgentOutputSnapshot('linda')}\n\n_Reply 0 for keypad_`;
  if (lower === '3') return `${getAgentOutputSnapshot('zoe')}\n\n_Reply 0 for keypad_`;
  if (lower === '4') return `${getAgentOutputSnapshot('henry')}\n\n_Reply 0 for keypad_`;
  if (lower === '5') return `${getAgentOutputSnapshot('daisy')}\n\n_Reply 0 for keypad_`;
  if (lower === '6') return `${getAgentOutputSnapshot('diana')}\n\n_Reply 0 for keypad_`;
  if (lower === '7') {
    return `Send: *pair <phone>* (e.g. \`pair 0589969886\`) to get an 8-char pairing code.\n\n_Reply 0 for keypad_`;
  }

  const agentMatch = trimmed.match(/^@(linda|zoe|henry|daisy|diana)\s+([\s\S]+)$/i);
  if (agentMatch) {
    const agentName = agentMatch[1].toLowerCase() as 'linda' | 'zoe' | 'henry' | 'daisy' | 'diana';
    const prompt = agentMatch[2].trim();
    return `*AI ${agentName.toUpperCase()}* received: "${prompt}"\n\n${getAgentOutputSnapshot(agentName)}\n\n_Reply 0 for keypad_`;
  }

  return null;
}
