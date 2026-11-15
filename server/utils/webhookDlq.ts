/**
 * Dead-Letter Queue for failed webhook deliveries (Point 29).
 */
export interface WebhookDlqEntry {
  id: string;
  targetUrl: string;
  payload: unknown;
  attempts: number;
  lastError: string;
  failedAtIso: string;
}

export class WebhookDlq {
  private entries: WebhookDlqEntry[] = [];

  enqueue(entry: Omit<WebhookDlqEntry, 'failedAtIso'>): WebhookDlqEntry {
    const full: WebhookDlqEntry = { ...entry, failedAtIso: new Date().toISOString() };
    this.entries.push(full);
    return full;
  }

  list(): WebhookDlqEntry[] {
    return [...this.entries];
  }
}
