export function isAgentAtCapacity(currentChats: number, maxChats = 35) {
  return currentChats >= maxChats;
}
export default isAgentAtCapacity;
