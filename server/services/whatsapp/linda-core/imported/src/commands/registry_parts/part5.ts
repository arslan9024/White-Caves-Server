// @ts-nocheck
export function registerCommandsPart5(registry: any) {
    registry.registerCommand({
      name: 'verify-whatsapp',
      category: 'contacts',
      description: 'Check if number is on WhatsApp',
      usage: '!verify-whatsapp <phone>',
      examples: [
        '!verify-whatsapp 971501234567',
        '!on-wa +971501234567'
      ],
      requiresAuth: false,
      aliases: ['on-wa'],
      handler: 'VerifyWhatsAppHandler',
      helpText: 'Validate if number has WhatsApp account.'
    });

    registry.registerCommand({
      name: 'profile-picture',
      category: 'contacts',
      description: 'Get contact\'s profile picture',
      usage: '!profile-picture <phone>',
      examples: [
        '!profile-picture 971501234567',
        '!pic @contact-name'
      ],
      requiresAuth: false,
      aliases: ['pic', 'avatar'],
      handler: 'ProfilePictureHandler',
      helpText: 'Download and show contact profile picture.'
    });
}
