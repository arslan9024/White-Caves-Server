export function archiveChat(chatId: string) {
  return { chatId, archived: true, at: new Date().toISOString() };
}
export default archiveChat;
