// @ts-nocheck
export function registerCommandsPart3(registry: any) {
    registry.registerCommand({
      name: 'conversation-stats',
      category: 'learning',
      description: 'Get conversation learning statistics',
      usage: '!conversation-stats',
      examples: [
        '!conversation-stats',
        '!learn-stats'
      ],
      requiresAuth: false,
      handler: 'ConversationStatsHandler',
      helpText: 'Shows learned patterns, frequently asked questions, training data.'
    });

    registry.registerCommand({
      name: 'help',
      category: 'special',
      description: 'Show help information',
      usage: '!help [command-name]',
      examples: [
        '!help',
        '!help find-contact',
        '!?'
      ],
      requiresAuth: false,
      handler: 'HelpHandler',
      helpText: 'Shows command help. Optionally for specific commands.'
    });

    registry.registerCommand({
      name: 'ping',
      category: 'special',
      description: 'Check if Linda is responsive',
      usage: '!ping',
      examples: [
        '!ping'
      ],
      requiresAuth: false,
      handler: 'PingHandler',
      helpText: 'Simple connectivity test. Linda responds with pong.'
    });

    registry.registerCommand({
      name: 'edit-msg',
      category: 'messageman',
      description: 'Edit a previously sent message',
      usage: '!edit-msg <messageId> <newContent>',
      examples: [
        '!edit-msg abc123 Updated information here',
        '!edit-msg 5678 Corrected spelling'
      ],
      requiresAuth: false,
      handler: 'EditMessageHandler',
      helpText: 'Edit your own message. Message ID found in message details.'
    });

    registry.registerCommand({
      name: 'delete-msg',
      category: 'messageman',
      description: 'Delete a message',
      usage: '!delete-msg <messageId> [everyone]',
      examples: [
        '!delete-msg abc123',
        '!delete-msg def456 everyone'
      ],
      requiresAuth: false,
      handler: 'DeleteMessageHandler',
      helpText: 'Delete your message. Optionally delete for everyone.'
    });

    registry.registerCommand({
      name: 'react',
      category: 'messageman',
      description: 'Add emoji reaction to message',
      usage: '!react <messageId> <emoji>',
      examples: [
        '!react abc123 ❤️',
        '!react def456 😂',
        '!react xyz789 🔥'
      ],
      requiresAuth: false,
      aliases: ['emoji', 'react-msg'],
      handler: 'ReactToMessageHandler',
      helpText: 'Emoji options: ❤️ 😂 😮 😢 🙏 🔥'
    });

    registry.registerCommand({
      name: 'get-reactions',
      category: 'messageman',
      description: 'View all reactions on a message',
      usage: '!get-reactions <messageId>',
      examples: [
        '!get-reactions abc123',
        '!get-reactions msg-xyz'
      ],
      requiresAuth: false,
      aliases: ['view-reactions', 'reactions'],
      handler: 'GetReactionsHandler',
      helpText: 'Shows emoji count and details for all reactions.'
    });

    registry.registerCommand({
      name: 'forward-msg',
      category: 'messageman',
      description: 'Forward message to another chat',
      usage: '!forward-msg <messageId> <chatId>',
      examples: [
        '!forward-msg abc123 971501234567',
        '!forward-msg def456 group-xyz'
      ],
      requiresAuth: false,
      handler: 'ForwardMessageHandler',
      helpText: 'Forward to another person or group.'
    });

    registry.registerCommand({
      name: 'pin-msg',
      category: 'messageman',
      description: 'Pin a message in chat',
      usage: '!pin-msg <messageId>',
      examples: [
        '!pin-msg abc123',
        '!pin-msg important-msg'
      ],
      requiresAuth: false,
      handler: 'PinMessageHandler',
      helpText: 'Pin message to top of chat.'
    });

    registry.registerCommand({
      name: 'unpin-msg',
      category: 'messageman',
      description: 'Unpin a message',
      usage: '!unpin-msg <messageId>',
      examples: [
        '!unpin-msg abc123'
      ],
      requiresAuth: false,
      handler: 'UnpinMessageHandler',
      helpText: 'Remove pin from message.'
    });

    registry.registerCommand({
      name: 'star-msg',
      category: 'messageman',
      description: 'Star/bookmark a message',
      usage: '!star-msg <messageId>',
      examples: [
        '!star-msg abc123',
        '!save-msg important-msg'
      ],
      requiresAuth: false,
      aliases: ['bookmark-msg', 'favorite-msg'],
      handler: 'StarMessageHandler',
      helpText: 'Save message to favorites for quick access.'
    });

    registry.registerCommand({
      name: 'reaction-stats',
      category: 'messageman',
      description: 'Get reaction statistics for chat',
      usage: '!reaction-stats [period]',
      examples: [
        '!reaction-stats',
        '!reaction-stats today',
        '!reaction-stats week'
      ],
      requiresAuth: false,
      aliases: ['emoji-stats', 'sentiment'],
      handler: 'ReactionStatsHandler',
      helpText: 'Show emoji breakdown and sentiment trends.'
    });

    registry.registerCommand({
      name: 'create-group',
      category: 'groups',
      description: 'Create a new WhatsApp group',
      usage: '!create-group <name> <phone1> <phone2>...',
      examples: [
        '!create-group "Team Meeting" 971501234567 971509876543',
        '!create-group "Project Alpha" +971501234567 +971509876543'
      ],
      requiresAuth: true,
      handler: 'CreateGroupHandler',
      helpText: 'Creates group with specified members. Minimum 1 member required.'
    });

    registry.registerCommand({
      name: 'add-group',
      category: 'groups',
      description: 'Add members to existing group',
      usage: '!add-group <groupId> <phone1> <phone2> ...',
      examples: [
        '!add-group group-123 971501234567 971509876543',
        '!add-group teams +971501234567'
      ],
      requiresAuth: true,
      aliases: ['invite-group'],
      handler: 'AddGroupMembersHandler',
      helpText: 'Add one or more members to group.'
    });

    registry.registerCommand({
      name: 'remove-group',
      category: 'groups',
      description: 'Remove members from group',
      usage: '!remove-group <groupId> <phone>',
      examples: [
        '!remove-group group-123 971501234567',
        '!kick-group teams +971509876543'
      ],
      requiresAuth: true,
      aliases: ['kick-group'],
      handler: 'RemoveGroupMembersHandler',
      helpText: 'Remove member(s) from group.'
    });

    registry.registerCommand({
      name: 'promote-admin',
      category: 'groups',
      description: 'Promote member to group admin',
      usage: '!promote-admin <groupId> <phone>',
      examples: [
        '!promote-admin group-123 971501234567',
        '!make-admin teams +971509876543'
      ],
      requiresAuth: true,
      handler: 'PromoteAdminHandler',
      helpText: 'Give admin privileges to group member.'
    });

    registry.registerCommand({
      name: 'demote-admin',
      category: 'groups',
      description: 'Demote group admin',
      usage: '!demote-admin <groupId> <phone>',
      examples: [
        '!demote-admin group-123 971501234567',
        '!remove-admin teams +971509876543'
      ],
      requiresAuth: true,
      handler: 'DemoteAdminHandler',
      helpText: 'Remove admin privileges from member.'
    });

    registry.registerCommand({
      name: 'group-info',
      category: 'groups',
      description: 'Get group information',
      usage: '!group-info <groupId>',
      examples: [
        '!group-info group-123',
        '!group-info teams'
      ],
      requiresAuth: false,
      aliases: ['group-details', 'ginfo'],
      handler: 'GroupInfoHandler',
      helpText: 'Shows members, admins, description, creation date.'
    });
}
