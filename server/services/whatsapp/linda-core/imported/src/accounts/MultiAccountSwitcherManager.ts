// @ts-nocheck
/**
 * @file MultiAccountSwitcherManager.js
 * @description Manages active session selection across multi-account deployments
 * (e.g. Linda, PowerAgent, GorahaBot) for the Web UI top-bar account switcher.
 * Category: Accounts
 */

export class MultiAccountSwitcherManager {
  constructor(initialAccounts = []) {
    this.accounts = new Map();
    this.activeAccountId = null;

    for (const acc of initialAccounts) {
      this.registerAccount(acc);
    }
  }

  /**
   * Registers an account descriptor
   * @param {Object} account
   * @param {string} account.id
   * @param {string} account.name
   * @param {string} account.phone
   * @param {string} [account.status]
   */
  registerAccount(account) {
    this.accounts.set(account.id, {
      id: account.id,
      name: account.name || account.id,
      phone: account.phone || '',
      status: account.status || 'CONNECTED',
      registeredAt: new Date().toISOString()
    });

    if (!this.activeAccountId) {
      this.activeAccountId = account.id;
    }
  }

  /**
   * Sets the currently focused account
   * @param {string} accountId
   */
  switchAccount(accountId) {
    if (!this.accounts.has(accountId)) {
      throw new Error(`Account "${accountId}" does not exist in registry`);
    }
    this.activeAccountId = accountId;
    return this.getActiveAccount();
  }

  /**
   * Returns active account details
   * @returns {Object|null}
   */
  getActiveAccount() {
    return this.accounts.get(this.activeAccountId) || null;
  }

  /**
   * Returns list of all registered accounts
   * @returns {Array<Object>}
   */
  listAccounts() {
    return Array.from(this.accounts.values()).map(acc => ({
      ...acc,
      isActive: acc.id === this.activeAccountId
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

