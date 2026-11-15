/**
 * File upload MIME-type & magic-byte signature guard (Point 25).
 */
const ALLOWED_MIMES = new Set(['application/pdf', 'image/jpeg', 'image/png']);

export function isAllowedUploadMime(mimeType: string): boolean {
  return ALLOWED_MIMES.has(mimeType.toLowerCase().trim());
}

export function hasValidMagicBytes(buf: Uint8Array, mimeType: string): boolean {
  if (buf.length < 4) return false;
  const mime = mimeType.toLowerCase().trim();
  if (mime === 'application/pdf') {
    return buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46; // %PDF
  }
  if (mime === 'image/png') {
    return buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
  }
  if (mime === 'image/jpeg') {
    return buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
  }
  return false;
}
