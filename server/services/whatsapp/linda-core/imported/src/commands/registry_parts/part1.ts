// @ts-nocheck
export function registerCommandsPart1(registry: any) {
    registry.registerCommand({
      name: 'link-device',
      category: 'whatsapp',
      description: 'Link a new WhatsApp device to Linda',
      usage: '!link-device <device-name>',
      examples: [
        '!link-device my-phone',
        '!link-device office-iphone'
      ],
      requiresAuth: false,
      handler: 'LinkDeviceHandler',
      helpText: 'Starts device linking flow with QR code. Perfect for adding new accounts.'
    });

    registry.registerCommand({
      name: 'relink-device',
      category: 'whatsapp',
      description: 'Re-link an existing WhatsApp device',
      usage: '!relink-device <device-number>',
      examples: [
        '!relink-device 971501234567',
        '!relink-device +971501234567'
      ],
      requiresAuth: false,
      handler: 'RelinkDeviceHandler',
      helpText: 'Re-authenticate an existing device. Use when session expires.'
    });

    registry.registerCommand({
      name: 'unlink-device',
      category: 'whatsapp',
      description: 'Unlink a WhatsApp device from Linda',
      usage: '!unlink-device <device-number>',
      examples: [
        '!unlink-device 971501234567',
        '!unlink-device master'
      ],
      requiresAuth: true,
      handler: 'UnlinkDeviceHandler',
      helpText: 'Removes device from Linda. Requires admin authentication.'
    });

    registry.registerCommand({
      name: 'list-devices',
      category: 'whatsapp',
      description: 'List all linked WhatsApp devices',
      usage: '!list-devices',
      examples: [
        '!list-devices',
        '!devices'
      ],
      requiresAuth: false,
      handler: 'ListDevicesHandler',
      helpText: 'Shows all connected devices, their status, and last activity.'
    });

    registry.registerCommand({
      name: 'device-status',
      category: 'whatsapp',
      description: 'Get detailed status of a specific device',
      usage: '!device-status <device-number>',
      examples: [
        '!device-status 971501234567',
        '!device-status master'
      ],
      requiresAuth: false,
      handler: 'DeviceStatusHandler',
      helpText: 'Shows device connection status, battery, signal, and last message.'
    });

    registry.registerCommand({
      name: 'link-method',
      category: 'whatsapp',
      description: 'Show the replacement direct linking commands',
      usage: '!link-method',
      examples: ['!link-method'],
      requiresAuth: false,
      handler: 'LinkMethodHandler',
      helpText: 'Preferences are no longer saved. Use !link-code or !link-qr instead.'
    });

      registry.registerCommand({
        name: `link-${method}`,
        category: 'whatsapp',
        description: `Start master linking with ${method === 'code' ? 'a pairing code' : 'a QR code'}`,
        usage: `!link-${method}`,
        examples: [`!link-${method}`],
        requiresAuth: false,
        handler: 'DirectLinkHandler',
        helpText: 'Group admins or the master account only. Starts linking for this attempt without saving a preference. Complete authentication in the bot terminal.'
      });

    registry.registerCommand({
      name: 'switch-device',
      category: 'whatsapp',
      description: 'Switch active device for sending messages',
      usage: '!switch-device <device-number>',
      examples: [
        '!switch-device 971501234567',
        '!switch-device default'
      ],
      requiresAuth: true,
      handler: 'SwitchDeviceHandler',
      helpText: 'Makes a device the default for outbound messages.'
    });

    registry.registerCommand({
      name: "greetings",
      category: "whatsapp",
      description: "Send daily Dubai morning greetings to all master accounts",
      usage: "!greetings",
      examples: [
        "!greetings",
        "!greet-masters"
      ],
      requiresAuth: true,
      handler: "DailyGreetingsHandler",
      helpText: "Triggers daily Dubai greetings from the primary master to all configured master accounts."
    });

    registry.registerCommand({
      name: 'find-contact',
      category: 'contacts',
      description: 'Find a person in Google Contacts',
      usage: '!find-contact <name-or-number>',
      examples: [
        '!find-contact Ahmed Al-Mansoori',
        '!find-contact 971501234567',
        '!find Ahmed'
      ],
      requiresAuth: false,
      handler: 'FindContactHandler',
      helpText: 'Search Google Contacts by name or phone number. Returns all matches.'
    });

    registry.registerCommand({
      name: 'add-contact',
      category: 'contacts',
      description: 'Add a new contact to Google Contacts',
      usage: '!add-contact <name> <phone> [email] [company]',
      examples: [
        '!add-contact Ahmed Al-Mansoori 971501234567 ahmed@realtygroup.ae Realty Group',
        '!add-contact Fatima 971509876543'
      ],
      requiresAuth: true,
      handler: 'AddContactHandler',
      helpText: 'Adds new contact to Google Contacts. Company optional. Requires auth.'
    });

    registry.registerCommand({
      name: 'update-contact',
      category: 'contacts',
      description: 'Update an existing contact',
      usage: '!update-contact <contact-id> <field> <value>',
      examples: [
        '!update-contact c123 phone 971501111111',
        '!update-contact c456 email newemail@example.com',
        '!update-contact c789 company Real Estate King'
      ],
      requiresAuth: true,
      handler: 'UpdateContactHandler',
      helpText: 'Updates specific contact fields. Supports: phone, email, company, notes.'
    });

    registry.registerCommand({
      name: 'delete-contact',
      category: 'contacts',
      description: 'Delete a contact from Google Contacts',
      usage: '!delete-contact <contact-id>',
      examples: [
        '!delete-contact c123',
        '!delete-contact contact_abc123'
      ],
      requiresAuth: true,
      handler: 'DeleteContactHandler',
      helpText: 'Permanently removes contact. Requires admin authentication.'
    });

    registry.registerCommand({
      name: 'sync-contacts',
      category: 'contacts',
      description: 'Sync Google Contacts with WhatsApp',
      usage: '!sync-contacts [limit]',
      examples: [
        '!sync-contacts',
        '!sync-contacts 50',
        '!sync-contacts all'
      ],
      requiresAuth: true,
      handler: 'SyncContactsHandler',
      helpText: 'Synchronizes Google Contacts with WhatsApp. Updates availability status.'
    });

    registry.registerCommand({
      name: 'verify-contacts',
      category: 'contacts',
      description: 'Verify which contacts have WhatsApp',
      usage: '!verify-contacts [count]',
      examples: [
        '!verify-contacts',
        '!verify-contacts 100',
        '!verify-goraha'
      ],
      requiresAuth: false,
      handler: 'VerifyContactsHandler',
      helpText: 'Checks WhatsApp availability for contacts. Reports coverage percentage.'
    });

    registry.registerCommand({
      name: 'contact-stats',
      category: 'contacts',
      description: 'Get statistics about contacts',
      usage: '!contact-stats',
      examples: [
        '!contact-stats',
        '!contacts-status'
      ],
      requiresAuth: false,
      handler: 'ContactStatsHandler',
      helpText: 'Shows total contacts, WhatsApp coverage, groups, and last sync time.'
    });

    registry.registerCommand({
      name: 'list-sheets',
      category: 'sheets',
      description: 'List all accessible Google Sheets',
      usage: '!list-sheets',
      examples: [
        '!list-sheets',
        '!sheets'
      ],
      requiresAuth: false,
      handler: 'ListSheetsHandler',
      helpText: 'Shows all Google Sheets in Drive. Includes size and last modified.'
    });

    registry.registerCommand({
      name: 'sheet-info',
      category: 'sheets',
      description: 'Get information about a specific sheet',
      usage: '!sheet-info <sheet-id-or-name>',
      examples: [
        '!sheet-info Leads Database',
        '!sheet-info 1BxiMVs0XRA5nFMKUVfIstTZisDxQvDFrQH7YWrGYds'
      ],
      requiresAuth: false,
      handler: 'SheetInfoHandler',
      helpText: 'Shows sheet tabs, row count, column count, and last edit info.'
    });

    registry.registerCommand({
      name: 'query-sheet',
      category: 'sheets',
      description: 'Query data from a Google Sheet',
      usage: '!query-sheet <sheet-name> <query>',
      examples: [
        '!query-sheet Leads "Dubai" "12-2025"',
        '!query-sheet Sales status=active'
      ],
      requiresAuth: false,
      handler: 'QuerySheetHandler',
      helpText: 'Queries sheet using simple filters or SQL-like syntax.'
    });
}
