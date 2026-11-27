// @ts-nocheck
/**
 * LINDA COMMAND HANDLER
 * ═══════════════════════════════════════════════════════════════════════════
 * Main command parser and router for Linda AI Assistant
 * 
 * Responsibilities:
 * 1. Parse incoming messages for commands (! prefix)
 * 2. Validate command syntax and arguments
 * 3. Route to appropriate command handler
 * 4. Log conversations and feedback
 * 5. Handle errors gracefully
 * 6. Track usage statistics
 * 
 * Architecture: Command Pattern with Registry
 * - Registry: Centralized command metadata
 * - Handlers: Individual command implementations
 * - Logger: Conversation logging and ML data
 */

import LindaCommandRegistry from '../LindaCommandRegistry.js';
import LindaConversationLearner from '../LindaConversationLearner.js';
import services from '../../core/ServiceRegistry.js';
import CampaignCommands from '../CampaignCommands.js';


export const methodsPart3 = {
  async handleFeedback({ msg, args }) {
    if (args.length < 3) {
      await msg.reply(
        `Feedback format:\n\n` +
        `\`!feedback <positive|negative> <message-id> "<comment>"\``
      );
      return;
    }

    const sentiment = args[0].toLowerCase();
    const messageId = args[1];
    const comment = args.slice(2).join(' ').replace(/^"|"$/g, '');

    if (!['positive', 'negative'].includes(sentiment)) {
      await msg.reply(`❌ Sentiment must be 'positive' or 'negative'`);
      return;
    }

    await this.learner.logFeedback({
      messageId,
      sentiment,
      comment,
      timestamp: new Date(),
      phoneNumber: msg.from
    });

    await msg.reply(`✅ Feedback recorded: ${sentiment}`);
  },

  async handleConversationStats({ msg }) {
    const stats = await this.learner.getStatistics();

    let text = `\n📊 **CONVERSATION STATISTICS**\n\n`;
    text += `Total Messages: ${stats.totalMessages || 0}\n`;
    text += `Learned Patterns: ${stats.learnedPatterns || 0}\n`;
    text += `Feedback Entries: ${stats.feedbackCount || 0}\n`;
    text += `Users: ${stats.uniqueUsers || 0}\n`;
    text += `Last Updated: ${new Date().toLocaleString()}\n`;

    await msg.reply(text);
  },

  async handleAuthenticate({ msg, args }) {
    if (args.length === 0) {
      await msg.reply(`Usage: \`!authenticate <password>\``);
      return;
    }

    const password = args[0];
    const phoneNumber = msg.from;

    if (this.authenticateUser(phoneNumber, password)) {
      await msg.reply(
        `✅ Authenticated!\n\n` +
        `You now have access to admin commands.\n` +
        `Session valid for 1 hour.`
      );
    } else {
      await msg.reply(`❌ Authentication failed. Incorrect password.`);
    }
  },

  async handleHealth({ msg }) {
    let text = `\n💚 **SYSTEM HEALTH**\n\n`;
    text += `Status: ✅ Healthy\n`;

    const mem = process.memoryUsage();
    text += `Memory: ${Math.round(mem.heapUsed / 1024 / 1024)}MB / ${Math.round(mem.heapTotal / 1024 / 1024)}MB\n`;
    text += `Uptime: ${this.formatUptime(Date.now() - this.usageStats.startTime.getTime())}\n`;

    const stats = this.getUsageStats();
    text += `Commands Processed: ${stats.totalCommands}\n`;
    text += `Error Rate: ${stats.totalCommands > 0 ? Math.round((stats.errorCount / stats.totalCommands) * 100) : 0}%\n`;

    await msg.reply(text);
  },

  async handleLogs({ msg, args }) {
    if (!this.isAuthenticated(msg.from)) {
      await msg.reply(`🔐 Requires authentication`);
      return;
    }

    // TODO: Implement actual log retrieval
    await msg.reply(`📋 Recent logs:\n\n(Log feature coming soon)`);
  },

  async handleFindContact({ msg, args }) {
    if (args.length === 0) {
      await msg.reply(`Usage: \`!find-contact <name-or-number>\``);
      return;
    }

    const query = args.join(' ');
    await msg.reply(`🔍 Searching for: ${query}\n\n(Contact search coming soon)`);
  },

  async handleContactStats({ msg }) {
    await msg.reply(
      `📊 Contact Statistics:\n\n` +
      `(Stats feature coming soon)`
    );
  },

  async handleVerifyContacts({ msg }) {
    // NOTE: This existed before and triggers GorahaContactVerificationService
    // Keeping for backward compatibility
    await msg.reply(`🔍 Starting contact verification...\n\n(Use !verify-goraha for full verification)`);
  },

  async handleListSheets({ msg }) {
    await msg.reply(`📄 Google Sheets:\n\n(Sheet listing coming soon)`);
  },

  async handleSheetInfo({ msg, args }) {
    if (args.length === 0) {
      await msg.reply(`Usage: \`!sheet-info <sheet-name>\``);
      return;
    }

    const sheetName = args.join(' ');
    await msg.reply(`📄 Sheet Info: ${sheetName}\n\n(Sheet info coming soon)`);
  },

  async handleAddAccount({ msg, args, context }) {
    const dynamicAccountManager = services.get('dynamicAccountManager');
    if (!dynamicAccountManager) {
      await msg.reply(`❌ Account manager not initialized`);
      return;
    }

    if (args.length < 2) {
      await msg.reply(
        `Usage: \`!add-account <phone> <name>\`\n\n` +
        `Example: \`!add-account +971501234567 'My Branch Account'\``
      );
      return;
    }

    const phone = args[0];
    const name = args.slice(1).join(' ').replace(/['"]/g, '');

    const result = await dynamicAccountManager.addAccount(phone, name, {
      role: 'secondary'
    });

    if (result.success) {
      const account = result.account;
      await msg.reply(
        `✅ **Account Added Successfully**\n\n` +
        `📱 Name: ${account.displayName}\n` +
        `☎️  Phone: ${account.phoneNumber}\n` +
        `🆔 ID: ${account.id}\n` +
        `⚙️  Role: ${account.role}\n` +
        `📊 Status: ${account.status}\n\n` +
        `💡 **Next Steps:**\n` +
        `1️⃣  This account will be initialized on next bot restart\n` +
        `2️⃣  QR code will display for device linking\n` +
        `3️⃣  Scan with your WhatsApp phone\n\n` +
        `🔗 To initialize now, restart the bot`
      );
    } else {
      await msg.reply(`❌ Error: ${result.error}`);
    }
  },

  async handleListAccounts({ msg }) {
    const dynamicAccountManager = services.get('dynamicAccountManager');
    if (!dynamicAccountManager) {
      await msg.reply(`❌ Account manager not initialized`);
      return;
    }

    const accounts = dynamicAccountManager.getAllAccounts();
    const masterAccount = dynamicAccountManager.getMasterAccount();

    if (accounts.length === 0) {
      await msg.reply(
        `📱 **No Accounts Configured**\n\n` +
        `Use: \`!add-account <phone> <name>\`\n` +
        `Example: \`!add-account +971501234567 'My Sales Account'\``
      );
      return;
    }

    let text = `\n📱 **WHATSAPP ACCOUNTS** (${accounts.length})\n`;
    text += `════════════════════════════════════\n\n`;
    text += `👑 Master: ${masterAccount?.displayName || 'Not Configured'}\n\n`;

    accounts.forEach((account, idx) => {
      const roleIcon = account.role === 'primary' ? '👑' : '📱';
      const statusIcon = account.status === 'active' || account.status === 'linked' ? '✅' : '⏳';
      const enabledIcon = account.enabled ? '🟢' : '🔴';

      text += `${idx + 1}. ${roleIcon} ${account.displayName}\n`;
      text += `   ID: \`${account.id}\`\n`;
      text += `   Phone: ${account.phoneNumber}\n`;
      text += `   Status: ${statusIcon} ${account.status || 'pending'}\n`;
      text += `   Role: ${account.role}\n`;
      text += `   Active: ${enabledIcon}\n\n`;
    });

    text += `\n💡 **Available Commands:**\n`;
    text += `• Add Account: \`!add-account <phone> <name>\`\n`;
    text += `• Remove: \`!remove-account <phone>\`\n`;
    text += `• Enable: \`!enable-account <id>\`\n`;
    text += `• Disable: \`!disable-account <id>\`\n`;
    text += `• Set Master: \`!set-master <id>\``;

    await msg.reply(text);
  },

  async handleRemoveAccount({ msg, args }) {
    const dynamicAccountManager = services.get('dynamicAccountManager');
    if (!dynamicAccountManager) {
      await msg.reply(`❌ Account manager not initialized`);
      return;
    }

    if (args.length === 0) {
      await msg.reply(
        `Usage: \`!remove-account <phone>\`\n\n` +
        `Example: \`!remove-account +971501234567\``
      );
      return;
    }

    const phone = args[0];
    const result = await dynamicAccountManager.removeAccount(phone);

    if (result.success) {
      await msg.reply(
        `✅ **Account Removed Successfully**\n\n` +
        `Account: ${result.account.displayName}\n` +
        `Phone: ${result.account.phoneNumber}\n\n` +
        `📝 **Note:** WhatsApp Web session still active\n` +
        `To revoke access: WhatsApp Settings > Linked Devices\n` +
        `Bot will stop monitoring this account on next restart`
      );
    } else {
      await msg.reply(`❌ Error: ${result.error}`);
    }
  }
};
