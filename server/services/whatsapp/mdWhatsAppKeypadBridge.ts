import {
  getAgentOutputSnapshot,
  getServerStatusSnapshot,
} from "../../scripts/lindaInteractiveTerminal.js";
import { lindaMultiSimPool } from "./LindaMultiSimPoolService.js";
import type { WhatsAppEngine } from "./engine/whatsAppEngineCore.js";

const MD_AUTHORIZED_DIGITS = new Set([
  "971589969886",
  "971503869886",
  "971505110636",
  "971553633595",
]);

function normalizeDigits(phone: string): string {
  const digits = phone.replace(/[:@].*/, "").replace(/\D/g, "");
  if (digits.startsWith("05") && digits.length === 10) {
    return `971${digits.slice(1)}`;
  }
  return digits;
}

function buildKeypadMenu(): string {
  return [
    "*WHITE CAVES — MD KEYPAD*",
    "[1] Server Status & Health",
    "[2] AI Linda Output",
    "[3] AI Zoe Output",
    "[4] AI Henry Output",
    "[5] AI Daisy Output",
    "[6] AI Diana Output",
    "[7] Pair Master (pair <phone>)",
    "[0] Menu / Help",
    "",
    "_Chat:_ `@zoe <msg>`, `@linda <msg>`, `@henry <msg>`, `@daisy <msg>`, `@diana <msg>`",
  ].join("\n");
}

/**
 * Handles inbound WhatsApp messages from the MD's personal number (971589969886)
 * to the primary Linda number, providing a mobile keypad & agent chat bridge.
 * Returns true if the message was handled by the MD bridge.
 */
export async function handleMdWhatsAppCommand(
  engine: WhatsAppEngine,
  fromPhone: string,
  body: string,
): Promise<boolean> {
  const senderDigits = normalizeDigits(fromPhone);
  if (!MD_AUTHORIZED_DIGITS.has(senderDigits)) {
    return false;
  }

  const trimmed = body.trim();
  const lower = trimmed.toLowerCase();
  let reply: string | null = null;

  if (
    lower === "0" ||
    lower === "menu" ||
    lower === "help" ||
    lower === "keypad"
  ) {
    reply = buildKeypadMenu();
  } else if (/^(hi\s+zoe|hey\s+zoe|invoke\s+zoe|\/zoe|zoe)$/i.test(trimmed)) {
    console.log("[AI ZOE] Invoked by MD via WhatsApp (AICC-Sanctum COO)");
    reply = `*AI ZOE (COO — AICC-Sanctum)* online.\n\n${buildKeypadMenu()}`;
  } else if (/^zoe\s+([\s\S]+)$/i.test(trimmed)) {
    const zoeMsg = trimmed.replace(/^zoe\s+/i, "").trim();
    console.log(`[AI ZOE] MD WhatsApp: ${zoeMsg}`);
    reply = `*AI ZOE (COO)* received: "${zoeMsg}"\n\n${getAgentOutputSnapshot("zoe")}\n\n_Reply 0 for keypad_`;
  } else if (lower === "1" || lower === "status") {
    reply = `${getServerStatusSnapshot()}\n\n_Reply 0 for keypad_`;
  } else if (lower === "health" || lower === "mem" || lower === "uptime") {
    const mem = process.memoryUsage();
    const upSec = Math.floor(process.uptime());
    reply = `*SERVER HEALTH*\nUptime: ${Math.floor(upSec / 3600)}h ${Math.floor((upSec % 3600) / 60)}m ${upSec % 60}s\nRSS: ${Math.round(mem.rss / 1024 / 1024)}MB | Heap: ${Math.round(mem.heapUsed / 1024 / 1024)}MB\nNode: ${process.version} | PID: ${process.pid}\n\n_Reply 0 for keypad_`;
  } else if (lower === "sims" || lower === "sim") {
    const accs = lindaMultiSimPool.listPoolAccounts();
    reply = `*SIM POOL (${accs.filter(a => a.isConnected).length}/${accs.length} online)*\n${accs.map(a => `${a.isConnected ? '●' : '○'} ${a.id} (+${a.phoneNumber}) [${a.engineStatus}]`).join('\n')}\n\n_Reply 0 for keypad_`;
  } else if (lower === "ports") {
    reply = `*MONOREPO PORTS*\nServer: :5001 | CRM: :3000 | Web: :3001 | Aegis: :3333 | Mobile: :8081\n\n_Reply 0 for keypad_`;
  } else if (lower === "agents") {
    reply = [
      getAgentOutputSnapshot("zoe"),
      getAgentOutputSnapshot("linda"),
      getAgentOutputSnapshot("henry"),
      getAgentOutputSnapshot("daisy"),
      getAgentOutputSnapshot("diana"),
    ].join('\n\n') + '\n\n_Reply 0 for keypad_';
  } else if (lower === "2") {
    reply = `${getAgentOutputSnapshot("linda")}\n\n_Reply 0 for keypad_`;
  } else if (lower === "3") {
    reply = `${getAgentOutputSnapshot("zoe")}\n\n_Reply 0 for keypad_`;
  } else if (lower === "4") {
    reply = `${getAgentOutputSnapshot("henry")}\n\n_Reply 0 for keypad_`;
  } else if (lower === "5") {
    reply = `${getAgentOutputSnapshot("daisy")}\n\n_Reply 0 for keypad_`;
  } else if (lower === "6") {
    reply = `${getAgentOutputSnapshot("diana")}\n\n_Reply 0 for keypad_`;
  } else if (lower === "7") {
    reply = `Send: *pair <phone>* (e.g. \`pair 0589969886\`) to get an 8-char pairing code.\n\n_Reply 0 for keypad_`;
  } else if (lower.startsWith("pair ")) {
    const rawTarget = trimmed.slice(5).trim();
    const targetDigits = normalizeDigits(rawTarget);
    if (!targetDigits || targetDigits.length < 9) {
      reply = `Invalid phone number "${rawTarget}". Example: \`pair 0589969886\``;
    } else {
      try {
        const res =
          await lindaMultiSimPool.requestAccountPairingCode(targetDigits);
        console.log(
          `[PAIR] MD requested pairing code for +${targetDigits}: ${res.pairingCode}`,
        );
        reply = `*PAIRING CODE (+${targetDigits})*\nCode: *${res.pairingCode}*\nEnter in WhatsApp → Linked Devices → Link with phone number.\n\n_Reply 0 for keypad_`;
      } catch (err) {
        reply = `Pairing failed for +${targetDigits}: ${err instanceof Error ? err.message : String(err)}`;
      }
    }
  } else {
    const agentMatch = trimmed.match(
      /^@(linda|zoe|henry|daisy|diana)\s+([\s\S]+)$/i,
    );
    if (agentMatch) {
      const agentName = agentMatch[1].toLowerCase() as
        "linda" | "zoe" | "henry" | "daisy" | "diana";
      const prompt = agentMatch[2].trim();
      console.log(
        `[AI ${agentName.toUpperCase()}] MD WhatsApp (@${agentName}): ${prompt}`,
      );
      reply = `*AI ${agentName.toUpperCase()}* received: "${prompt}"\n\n${getAgentOutputSnapshot(agentName)}\n\n_Reply 0 for keypad_`;
    }
  }

  if (!reply) {
    return false;
  }

  await engine.sendMessage(fromPhone, reply);
  return true;
}
