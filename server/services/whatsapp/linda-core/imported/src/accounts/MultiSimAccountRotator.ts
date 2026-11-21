/**
 * MultiSimAccountRotator.ts
 *
 * Single responsibility: Rotate outbound messaging across registered SIM numbers when hourly limits approach.
 * Category: 2️⃣ Domain / Feature (src/accounts/)
 * Law: Single Purpose File Law (< 350 lines).
 */

export interface MultiSimAccountRotatorOptions {
  maxHourlySends?: number;
}

export class MultiSimAccountRotator {
  private readonly maxHourlySends: number;
  private readonly history: Map<string, number[]>;

  constructor({ maxHourlySends = 20 }: MultiSimAccountRotatorOptions = {}) {
    this.maxHourlySends = maxHourlySends;
    this.history = new Map();
  }

  recordSend(phone: string, now: number = Date.now()): void {
    const timestamps = this.history.get(phone) ?? [];
    timestamps.push(now);
    this.history.set(phone, timestamps);
  }

  getHourlyCount(phone: string, now: number = Date.now()): number {
    const timestamps = this.history.get(phone) ?? [];
    const oneHourAgo = now - 3600000;
    const active = timestamps.filter(t => t > oneHourAgo);
    this.history.set(phone, active);
    return active.length;
  }

  selectBestAccount(availablePhones: string[] = [], now: number = Date.now()): string | null {
    if (!availablePhones.length) return null;

    let bestPhone: string | null = null;
    let lowestCount = Infinity;

    for (const phone of availablePhones) {
      const count = this.getHourlyCount(phone, now);
      if (count < this.maxHourlySends && count < lowestCount) {
        lowestCount = count;
        bestPhone = phone;
      }
    }
    return bestPhone;
  }
}

export default new MultiSimAccountRotator();

