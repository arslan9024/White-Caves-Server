const cache = new Map<string, string>();
export function getTranscript(id: string) { return cache.get(id); }
export function saveTranscript(id: string, text: string) { cache.set(id, text); }
export default { getTranscript, saveTranscript };
