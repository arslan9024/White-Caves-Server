// @ts-nocheck
export function registerCommandsPart2(registry: any) {
    registry.registerCommand({
      name: 'add-row',
      category: 'sheets',
      description: 'Add a new row to a Google Sheet',
      usage: '!add-row <sheet-name> <field1:value1> <field2:value2> ...',
      examples: [
        '!add-row Leads name:Ahmed phone:971501234567 location:Dubai',
        '!add-row Sales product:Villa amount:2500000 date:2025-12-25'
      ],
      requiresAuth: true,
      handler: 'AddRowHandler',
      helpText: 'Appends new row with specified data. Auto-maps to columns.'
    });

    registry.registerCommand({
      name: 'update-row',
      category: 'sheets',
      description: 'Update an existing row in a Google Sheet',
      usage: '!update-row <sheet-name> <row-id> <field:value> ...',
      examples: [
        '!update-row Leads row123 status:qualified date:2025-12-26',
        '!update-row Sales row456 amount:2700000'
      ],
      requiresAuth: true,
      handler: 'UpdateRowHandler',
      helpText: 'Updates specific row. Use row ID or first column match.'
    });

    registry.registerCommand({
      name: 'delete-row',
      category: 'sheets',
      description: 'Delete a row from a Google Sheet',
      usage: '!delete-row <sheet-name> <row-id>',
      examples: [
        '!delete-row Leads row123',
        '!delete-row Sales row456'
      ],
      requiresAuth: true,
      handler: 'DeleteRowHandler',
      helpText: 'Removes row by ID. Requires admin authentication.'
    });

    registry.registerCommand({
      name: 'create-report',
      category: 'sheets',
      description: 'Generate a report from sheet data',
      usage: '!create-report <sheet-name> [filters]',
      examples: [
        '!create-report Sales',
        '!create-report Leads location=Dubai status=active',
        '!create-report Monthly Revenue'
      ],
      requiresAuth: false,
      handler: 'CreateReportHandler',
      helpText: 'Generates formatted report with summaries and statistics.'
    });

    registry.registerCommand({
      name: 'export-sheet',
      category: 'sheets',
      description: 'Export sheet data to file',
      usage: '!export-sheet <sheet-name> [format]',
      examples: [
        '!export-sheet Leads csv',
        '!export-sheet Sales json',
        '!export-sheet Contacts xlsx'
      ],
      requiresAuth: true,
      handler: 'ExportSheetHandler',
      helpText: 'Exports sheet as CSV, JSON, or XLSX. Formats available.'
    });

    registry.registerCommand({
      name: 'status',
      category: 'admin',
      description: 'Get Linda\'s current status',
      usage: '!status',
      examples: [
        '!status',
        '!health'
      ],
      requiresAuth: false,
      handler: 'StatusHandler',
      helpText: 'Shows uptime, active devices, memory usage, and system health.'
    });

    registry.registerCommand({
      name: 'health',
      category: 'admin',
      description: 'Get system health details',
      usage: '!health [detail-level]',
      examples: [
        '!health',
        '!health full',
        '!diagnostics'
      ],
      requiresAuth: false,
      handler: 'HealthHandler',
      helpText: 'Detailed health report: performance, connections, errors, logs.'
    });

    registry.registerCommand({
      name: 'config',
      category: 'admin',
      description: 'View or update Linda\'s configuration',
      usage: '!config [key] [value]',
      examples: [
        '!config',
        '!config auto-reply on',
        '!config response-timeout 30'
      ],
      requiresAuth: true,
      handler: 'ConfigHandler',
      helpText: 'View current config or update settings. Requires authentication.'
    });

    registry.registerCommand({
      name: 'restart',
      category: 'admin',
      description: 'Restart Linda (system restart)',
      usage: '!restart [delay]',
      examples: [
        '!restart',
        '!restart 60'
      ],
      requiresAuth: true,
      handler: 'RestartHandler',
      helpText: 'Gracefully restarts bot. Optional delay in seconds.'
    });

    registry.registerCommand({
      name: 'logs',
      category: 'admin',
      description: 'Get recent bot logs',
      usage: '!logs [count] [level]',
      examples: [
        '!logs',
        '!logs 50',
        '!logs 100 error'
      ],
      requiresAuth: true,
      handler: 'LogsHandler',
      helpText: 'Retrieves recent logs. Optional: count and severity level.'
    });

    registry.registerCommand({
      name: 'authenticate',
      category: 'admin',
      description: 'Authenticate for admin commands',
      usage: '!authenticate <password>',
      examples: [
        '!authenticate mypassword'
      ],
      requiresAuth: false,
      handler: 'AuthenticateHandler',
      helpText: 'One-time authentication for admin commands. Valid for session.'
    });

    registry.registerCommand({
      name: 'add-account',
      category: 'accounts',
      description: 'Add a new WhatsApp account',
      usage: '!add-account <phone> <name>',
      examples: [
        '!add-account +971501234567 "My Main Account"',
        '!add-account +971559876543 Main Office'
      ],
      requiresAuth: false,
      handler: 'AddAccountHandler',
      helpText: 'Adds a new WhatsApp account to Linda. Requires phone number and display name.'
    });

    registry.registerCommand({
      name: 'list-accounts',
      category: 'accounts',
      description: 'List all configured WhatsApp accounts',
      usage: '!list-accounts',
      examples: [
        '!list-accounts',
        '!accounts'
      ],
      requiresAuth: false,
      handler: 'ListAccountsHandler',
      helpText: 'Shows all configured accounts, their status, and master account.'
    });

    registry.registerCommand({
      name: 'remove-account',
      category: 'accounts',
      description: 'Remove a WhatsApp account',
      usage: '!remove-account <account-id>',
      examples: [
        '!remove-account account-1234567890',
        '!remove-account old-device'
      ],
      requiresAuth: true,
      handler: 'RemoveAccountHandler',
      helpText: 'Removes an account from Linda. Requires authentication.'
    });

    registry.registerCommand({
      name: 'set-master',
      category: 'accounts',
      description: 'Set primary WhatsApp account',
      usage: '!set-master <account-id>',
      examples: [
        '!set-master account-1234567890',
        '!set-master main-office'
      ],
      requiresAuth: true,
      handler: 'SetMasterHandler',
      helpText: 'Sets the primary account for Linda operations. Requires authentication.'
    });

    registry.registerCommand({
      name: 'enable-account',
      category: 'accounts',
      description: 'Enable a WhatsApp account',
      usage: '!enable-account <account-id>',
      examples: [
        '!enable-account account-1234567890'
      ],
      requiresAuth: true,
      handler: 'EnableAccountHandler',
      helpText: 'Enables an account. Will be initialized on next restart.'
    });

    registry.registerCommand({
      name: 'disable-account',
      category: 'accounts',
      description: 'Disable a WhatsApp account',
      usage: '!disable-account <account-id>',
      examples: [
        '!disable-account account-1234567890'
      ],
      requiresAuth: true,
      handler: 'DisableAccountHandler',
      helpText: 'Disables an account. Will not be initialized on next restart.'
    });

    registry.registerCommand({
      name: 'learn',
      category: 'learning',
      description: 'Log a conversation for ML training',
      usage: '!learn <message> => <response>',
      examples: [
        '!learn What are your rates? => We offer competitive market rates for all properties.',
        '!learn Can I schedule a tour? => Yes, tours available Monday-Friday 9am-6pm.'
      ],
      requiresAuth: false,
      handler: 'LearnHandler',
      helpText: 'Teaches Linda about conversations for future auto-replies.'
    });

    registry.registerCommand({
      name: 'feedback',
      category: 'learning',
      description: 'Send feedback about Linda\'s response',
      usage: '!feedback <positive|negative> <message-id> "<comment>"',
      examples: [
        '!feedback positive msg123 "Perfect response!"',
        '!feedback negative msg456 "Should have offered tour"'
      ],
      requiresAuth: false,
      handler: 'FeedbackHandler',
      helpText: 'Helps improve Linda\'s responses. Used for training.'
    });
}
