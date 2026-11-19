export function assignTagsToContact(contactId: string, tags: string[]) {
  return { contactId, tags, updatedAt: new Date().toISOString() };
}
export default assignTagsToContact;
