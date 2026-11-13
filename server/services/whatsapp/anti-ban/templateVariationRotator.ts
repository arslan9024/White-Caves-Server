/**
 * templateVariationRotator.ts — Rotate across multiple copy variants for
 * a given template to avoid identical-message spam detection.
 *
 * Each template ID maps to N variants; the rotator cycles through them
 * sequentially (round-robin) so no two consecutive sends use the same text.
 */

export interface TemplateVariant {
  id: string;
  text: string;
}

interface RotatorState {
  templateId: string;
  currentIndex: number;
  variants: TemplateVariant[];
}

/**
 * Rotate through message template variants for anti-spam diversity.
 *
 * @param templateId  Unique identifier for the template.
 * @param variants    Array of text variants (minimum 2 recommended).
 * @returns The next variant to use.
 * @throws If variants array is empty.
 */
export function rotateTemplate(
  templateId: string,
  variants: string[],
): string {
  if (variants.length === 0) {
    throw new Error(`No variants provided for template "${templateId}".`);
  }

  if (variants.length === 1) {
    return variants[0];
  }

  // Use the stateful rotator singleton
  return TemplateRotatorSingleton.getInstance().next(templateId, variants);
}

/**
 * Stateful rotator that tracks the current index per template.
 * Implemented as a singleton for module-level persistence.
 */
class TemplateRotatorSingleton {
  private static instance: TemplateRotatorSingleton | null = null;
  private readonly states: Map<string, RotatorState> = new Map();

  static getInstance(): TemplateRotatorSingleton {
    if (!TemplateRotatorSingleton.instance) {
      TemplateRotatorSingleton.instance = new TemplateRotatorSingleton();
    }
    return TemplateRotatorSingleton.instance;
  }

  /** Get the next variant text for a template, advancing the counter. */
  next(templateId: string, variants: string[]): string {
    let state = this.states.get(templateId);

    if (!state || state.variants.length !== variants.length) {
      // Initialize or re-initialize if variant count changed
      state = {
        templateId,
        currentIndex: 0,
        variants: variants.map((text, i) => ({
          id: `${templateId}-v${i}`,
          text,
        })),
      };
      this.states.set(templateId, state);
    }

    const variant = state.variants[state.currentIndex];
    state.currentIndex = (state.currentIndex + 1) % state.variants.length;

    return variant.text;
  }

  /** Reset rotation for a specific template. */
  reset(templateId: string): void {
    this.states.delete(templateId);
  }

  /** Reset all template rotations. */
  resetAll(): void {
    this.states.clear();
  }

  /** Get current index for a template (for testing). */
  getCurrentIndex(templateId: string): number {
    return this.states.get(templateId)?.currentIndex ?? 0;
  }
}

// Export the singleton for advanced usage / testing
export { TemplateRotatorSingleton };
