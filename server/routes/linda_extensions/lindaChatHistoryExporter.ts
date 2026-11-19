export function formatChatForDownload(messages: any[]): string {
  return JSON.stringify(messages, null, 2);
}
export default formatChatForDownload;
