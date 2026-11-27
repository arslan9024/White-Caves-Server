// @ts-nocheck
export function registerCommandsPart4(registry: any) {
    registry.registerCommand({
      name: 'group-invite',
      category: 'groups',
      description: 'Get/share group invite link',
      usage: '!group-invite <groupId>',
      examples: [
        '!group-invite group-123',
        '!group-invite teams'
      ],
      requiresAuth: false,
      handler: 'GroupInviteHandler',
      helpText: 'Generate shareable invite link for group.'
    });

    registry.registerCommand({
      name: 'group-members',
      category: 'groups',
      description: 'List all group members',
      usage: '!group-members <groupId>',
      examples: [
        '!group-members group-123',
        '!members teams'
      ],
      requiresAuth: false,
      aliases: ['members'],
      handler: 'GroupMembersHandler',
      helpText: 'Shows all members with admin status.'
    });

    registry.registerCommand({
      name: 'approval-requests',
      category: 'groups',
      description: 'View pending group membership requests',
      usage: '!approval-requests <groupId>',
      examples: [
        '!approval-requests group-123',
        '!pending-requests teams'
      ],
      requiresAuth: true,
      aliases: ['pending-requests'],
      handler: 'MembershipRequestsHandler',
      helpText: 'Show users waiting to join group.'
    });

    registry.registerCommand({
      name: 'approve-request',
      category: 'groups',
      description: 'Approve membership request',
      usage: '!approve-request <groupId> <userId>',
      examples: [
        '!approve-request group-123 user-xyz',
        '!approve teams +971501234567'
      ],
      requiresAuth: true,
      handler: 'ApproveRequestHandler',
      helpText: 'Allow user to join group.'
    });

    registry.registerCommand({
      name: 'pin-chat',
      category: 'chatorg',
      description: 'Pin chat to top of list',
      usage: '!pin-chat <chatId>',
      examples: [
        '!pin-chat 971501234567',
        '!pin contact-name'
      ],
      requiresAuth: false,
      handler: 'PinChatHandler',
      helpText: 'Pin conversation to show at top.'
    });

    registry.registerCommand({
      name: 'unpin-chat',
      category: 'chatorg',
      description: 'Unpin chat',
      usage: '!unpin-chat <chatId>',
      examples: [
        '!unpin-chat 971501234567'
      ],
      requiresAuth: false,
      handler: 'UnpinChatHandler',
      helpText: 'Remove pin from conversation.'
    });

    registry.registerCommand({
      name: 'archive-chat',
      category: 'chatorg',
      description: 'Archive conversation',
      usage: '!archive-chat <chatId>',
      examples: [
        '!archive-chat 971501234567',
        '!archive contact'
      ],
      requiresAuth: false,
      handler: 'ArchiveChatHandler',
      helpText: 'Move chat to archived section.'
    });

    registry.registerCommand({
      name: 'unarchive-chat',
      category: 'chatorg',
      description: 'Unarchive conversation',
      usage: '!unarchive-chat <chatId>',
      examples: [
        '!unarchive-chat 971501234567'
      ],
      requiresAuth: false,
      handler: 'UnarchiveChatHandler',
      helpText: 'Restore archived conversation.'
    });

    registry.registerCommand({
      name: 'mute-chat',
      category: 'chatorg',
      description: 'Mute chat notifications',
      usage: '!mute-chat <chatId> [duration]',
      examples: [
        '!mute-chat 971501234567',
        '!mute-chat contact 3600'
      ],
      requiresAuth: false,
      handler: 'MuteChatHandler',
      helpText: 'Silence notifications. Duration in seconds (0=indefinite).'
    });

    registry.registerCommand({
      name: 'unmute-chat',
      category: 'chatorg',
      description: 'Unmute chat',
      usage: '!unmute-chat <chatId>',
      examples: [
        '!unmute-chat 971501234567'
      ],
      requiresAuth: false,
      handler: 'UnmuteChatHandler',
      helpText: 'Restore notifications.'
    });

    registry.registerCommand({
      name: 'label-chat',
      category: 'chatorg',
      description: 'Add label to chat',
      usage: '!label-chat <chatId> <label>',
      examples: [
        '!label-chat 971501234567 premium',
        '!tag-chat contact vip'
      ],
      requiresAuth: false,
      aliases: ['tag-chat'],
      handler: 'LabelChatHandler',
      helpText: 'Organize chats with custom labels.'
    });

    registry.registerCommand({
      name: 'list-starred',
      category: 'chatorg',
      description: 'Show all starred messages',
      usage: '!list-starred',
      examples: [
        '!list-starred',
        '!favorites'
      ],
      requiresAuth: false,
      aliases: ['favorites', 'bookmarks'],
      handler: 'ListStarredHandler',
      helpText: 'Display all bookmarked messages across chats.'
    });

    registry.registerCommand({
      name: 'block',
      category: 'contacts',
      description: 'Block a contact',
      usage: '!block <phone>',
      examples: [
        '!block 971501234567',
        '!block spam-number'
      ],
      requiresAuth: false,
      handler: 'BlockContactHandler',
      helpText: 'Prevent contact from contacting you.'
    });

    registry.registerCommand({
      name: 'unblock',
      category: 'contacts',
      description: 'Unblock a contact',
      usage: '!unblock <phone>',
      examples: [
        '!unblock 971501234567'
      ],
      requiresAuth: false,
      handler: 'UnblockContactHandler',
      helpText: 'Restore blocked contact.'
    });

    registry.registerCommand({
      name: 'blocked-list',
      category: 'contacts',
      description: 'Show all blocked contacts',
      usage: '!blocked-list',
      examples: [
        '!blocked-list',
        '!blocks'
      ],
      requiresAuth: false,
      aliases: ['blocks'],
      handler: 'BlockedListHandler',
      helpText: 'View all blocked users.'
    });

    registry.registerCommand({
      name: 'contact-status',
      category: 'contacts',
      description: 'Get contact\'s status/bio',
      usage: '!contact-status <phone>',
      examples: [
        '!contact-status 971501234567',
        '!about @contact-name'
      ],
      requiresAuth: false,
      aliases: ['contact-about'],
      handler: 'ContactStatusHandler',
      helpText: 'Show user\'s WhatsApp status/bio.'
    });

    registry.registerCommand({
      name: 'contact-info',
      category: 'contacts',
      description: 'Get detailed contact information',
      usage: '!contact-info <phone>',
      examples: [
        '!contact-info 971501234567',
        '!info @contact-name'
      ],
      requiresAuth: false,
      aliases: ['info'],
      handler: 'ContactInfoHandler',
      helpText: 'Show profile pic, status, devices, account type.'
    });

    registry.registerCommand({
      name: 'common-groups',
      category: 'contacts',
      description: 'Find common groups with contact',
      usage: '!common-groups <phone>',
      examples: [
        '!common-groups 971501234567',
        '!shared-groups @contact'
      ],
      requiresAuth: false,
      aliases: ['shared-groups'],
      handler: 'CommonGroupsHandler',
      helpText: 'Show groups you both are members of.'
    });
}
