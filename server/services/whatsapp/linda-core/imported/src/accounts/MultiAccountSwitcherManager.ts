/**
 * @file MultiAccountSwitcherManager.ts
 * @description Manages active session selection across multi-account deployments
 * (e.g. Linda, PowerAgent, GorahaBot) for the Web UI top-bar account switcher.
 * Category: Accounts
 */

export interface SwitcherAccountInput {
  id: string;
  name?: string;
  phone?: string;
  status?: string;
}

export interface RegisteredSwitcherAccount {
  id: string;
  name: string;
  phone: string;
  status: string;
  registeredAt: string;
}

export interface SwitcherAccountListItem extends RegisteredSwitcherAccount {
  isActive: boolean;
}

export class MultiAccountSwitcherManager {
  private readonly accounts: Map<string, RegisteredSwitcherAccount>;
  private activeAccountId: string | null;

  constructor(initialAccounts: SwitcherAccountInput[] = []) {
    this.accounts = new Map();
    this.activeAccountId = null;

    for (const acc of initialAccounts) {
      this.registerAccount(acc);
    }
  }

  registerAccount(account: SwitcherAccountInput): void {
    this.accounts.set(account.id, {
      id: account.id,
      name: account.name || account.id,
      phone: account.phone || '',
      status: account.status || 'CONNECTED',
      registeredAt: new Date().toISOString(),
    });

    if (!this.activeAccountId) {
      this.activeAccountId = account.id;
    }
  }

  switchAccount(accountId: string): RegisteredSwitcherAccount | null {
    if (!this.accounts.has(accountId)) {
      throw new Error(`Account "${accountId}" does not exist in registry`);
    }
    this.activeAccountId = accountId;
    return this.getActiveAccount();
  }

  getActiveAccount(): RegisteredSwitcherAccount | null {
    return this.activeAccountId ? (this.accounts.get(this.activeAccountId) ?? null) : null;
  }

  listAccounts(): SwitcherAccountListItem[] {
    return Array.from(this.accounts.values()).map(acc => ({
      ...acc,
      isActive: acc.id === this.activeAccountId,
    }));
  }
}

export default new MultiAccountSwitcherManager([
  { id: 'acc-001', name: 'Primary Master: Arslan Malik', phone: '+971505760056', status: 'READY' },
  { id: 'acc-002', name: 'Master Desk 2 (DH2 Landlords)', phone: '+971503869886', status: 'READY' },
  { id: 'acc-003', name: 'Master Line 3 (DH2 Tenants)', phone: '+971505110636', status: 'READY' },
  { id: 'acc-004', name: 'Employee Desk (Leasing Viewings)', phone: '+971589969886', status: 'READY' },
  { id: 'acc-005', name: 'Servant & Outreach Line (Campaigns)', phone: '+971553633595', status: 'READY' }
]);

