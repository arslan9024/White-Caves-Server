const blacklist = new Set<string>();
export function blockPhone(p: string) { blacklist.add(p); }
export function isBlocked(p: string) { return blacklist.has(p); }
export default { blockPhone, isBlocked };
