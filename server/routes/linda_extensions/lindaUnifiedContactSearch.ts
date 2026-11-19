export function searchContactsInDB(q: string, contacts: any[]) {
  return contacts.filter(c => c.name?.includes(q) || c.phone?.includes(q));
}
export default searchContactsInDB;
