// @ts-nocheck
export function createTaskRouterConfig() {
  const config: any = {};
    // Task-to-assistant probability matrix
    config.routingProbabilities = {
      'FIND_PROPERTY': {
        'MARY': 0.95, // Inventory specialist
        'CIPHER': 0.85, // Market analysis
        'SAGE': 0.80,
        'HUNTER': 0.70
      },
      'SCHEDULE_VIEWING': {
        'LINDA': 0.98, // WhatsApp specialist
        'CLARA': 0.90, // CRM specialist
        'NINA': 0.75, // Bot
        'SOPHIA': 0.70 // Pipeline
      },
      'CALCULATE_FINANCE': {
        'THEODORA': 0.99, // Finance specialist
        'CIPHER': 0.80, // Market analysis
        'PENNY': 0.85 // Commission tracker
      },
      'LEAD_QUALIFICATION': {
        'CLARA': 0.95, // CRM specialist
        'HUNTER': 0.90, // Lead prospecting
        'SOPHIA': 0.80, // Pipeline
        'CIPHER': 0.70
      },
      'PROCESS_DOCUMENTS': {
        'MAX': 0.98, // Document processor
        'HENRY': 0.85, // Compliance
        'IVY': 0.80 // EJARI specialist
      },
      'MARKET_ANALYSIS': {
        'CIPHER': 0.97, // Market specialist
        'SAGE': 0.95, // Market trends
        'OLIVIA': 0.85, // Marketing
        'HUNTER': 0.70
      },
      'SEND_PROPOSAL': {
        'LINDA': 0.96, // Communication
        'ZOE': 0.95, // Executive
        'CLARA': 0.85, // CRM
        'THEODORA': 0.80
      },
      'EJARI_REGISTRATION': {
        'IVY': 0.99, // Leasing specialist
        'MAX': 0.85, // Documents
        'HENRY': 0.75, // Compliance
        'NINA': 0.70 // Automation
      },
      'TENANT_SCREENING': {
        'HUNTER': 0.90, // Prospecting (similar skills)
        'CLARA': 0.85, // CRM
        'HENRY': 0.80, // Compliance
        'MAX': 0.70
      },
      'PROPERTY_VALUATION': {
        'CIPHER': 0.97, // Market analysis
        'SAGE': 0.95, // Market trends
        'THEODORA': 0.85, // Finance
        'OLIVIA': 0.70
      }
    };

    config.routingHistory = [];
  }

  /**
   * Get optimal assistant for a task
   */
  return config;
}
