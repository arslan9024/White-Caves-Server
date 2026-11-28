/**
 * Pure privacy sanitization formulas for public property payloads.
 */

const SENSITIVE_PROPERTY_KEYS = ['unitNumber', 'villaNumber', 'plotNumber'] as const;

export type SensitivePropertyKey = (typeof SENSITIVE_PROPERTY_KEYS)[number];

/**
 * Strictly strips `unitNumber`, `villaNumber`, and `plotNumber` from public
 * property payloads without mutating the input object.
 */
export function sanitizePublicProperty<T extends Record<string, unknown>>(
  property: T
): Omit<T, SensitivePropertyKey> {
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(property)) {
    if (!SENSITIVE_PROPERTY_KEYS.includes(key as SensitivePropertyKey)) {
      sanitized[key] = value;
    }
  }
  return sanitized as Omit<T, SensitivePropertyKey>;
}
