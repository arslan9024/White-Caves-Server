/**
 * Henry AI document parser adapter (Point 23).
 */
export function normalizeParsedDocument(docType: 'EMIRATES_ID' | 'TITLE_DEED' | 'PASSPORT', rawText: string) {
  return {
    docType,
    charCount: rawText.trim().length,
    hasContent: rawText.trim().length > 0,
  };
}
