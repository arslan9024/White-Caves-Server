const locks = new Set<string>();
export function lockChat(phone: string): boolean { if (locks.has(phone)) return false; locks.add(phone); return true; }
export function unlockChat(phone: string): void { locks.delete(phone); }
export default { lockChat, unlockChat };
