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


export const methodsPart1 = {
  initializeHandlers() {
    // WhatsApp Commands
    this.registerHandler('ping', this.handlePing.bind(this));
    this.registerHandler('status', this.handleStatus.bind(this));
    this.registerHandler('help', this.handleHelp.bind(this));
    this.registerHandler('list-devices', this.handleListDevices.bind(this));
    this.registerHandler('device-status', this.handleDeviceStatus.bind(this));
    this.registerHandler('link-method', this.handleLinkMethod.bind(this));
    this.registerHandler('link-code', this.handleDirectLink.bind(this));
    this.registerHandler('link-qr', this.handleDirectLink.bind(this));
    this.registerHandler('greetings', this.handleDailyGreetings.bind(this));
    this.registerHandler('greet-masters', this.handleDailyGreetings.bind(this));
    
    // Learning Commands
    this.registerHandler('learn', this.handleLearn.bind(this));
    this.registerHandler('feedback', this.handleFeedback.bind(this));
    this.registerHandler('conversation-stats', this.handleConversationStats.bind(this));
    
    // Admin Commands
    this.registerHandler('authenticate', this.handleAuthenticate.bind(this));
    this.registerHandler('health', this.handleHealth.bind(this));
    this.registerHandler('logs', this.handleLogs.bind(this));
    
    // Contact Commands
    this.registerHandler('find-contact', this.handleFindContact.bind(this));
    this.registerHandler('contact-stats', this.handleContactStats.bind(this));
    this.registerHandler('verify-contacts', this.handleVerifyContacts.bind(this));
    
    // Sheets Commands
    this.registerHandler('list-sheets', this.handleListSheets.bind(this));
    this.registerHandler('sheet-info', this.handleSheetInfo.bind(this));

    // Account Management Commands (NEW - February 11, 2026)
    this.registerHandler('add-account', this.handleAddAccount.bind(this));
    this.registerHandler('list-accounts', this.handleListAccounts.bind(this));
    this.registerHandler('remove-account', this.handleRemoveAccount.bind(this));
    this.registerHandler('set-master', this.handleSetMaster.bind(this));
    this.registerHandler('enable-account', this.handleEnableAccount.bind(this));
    this.registerHandler('disable-account', this.handleDisableAccount.bind(this));

    // ════════════════════════════════════════════════════════════════════════
    // PHASE 1 MESSAGE ENHANCEMENT COMMANDS (NEW - February 11, 2026)
    // ════════════════════════════════════════════════════════════════════════
    this.registerHandler('edit-msg', this.handleEditMessage.bind(this));
    this.registerHandler('delete-msg', this.handleDeleteMessage.bind(this));
    this.registerHandler('react', this.handleReactMessage.bind(this));
    this.registerHandler('get-reactions', this.handleGetReactions.bind(this));
    this.registerHandler('forward-msg', this.handleForwardMessage.bind(this));
    this.registerHandler('pin-msg', this.handlePinMessage.bind(this));
    this.registerHandler('unpin-msg', this.handleUnpinMessage.bind(this));
    this.registerHandler('star-msg', this.handleStarMessage.bind(this));
    this.registerHandler('reaction-stats', this.handleReactionStats.bind(this));

    // ════════════════════════════════════════════════════════════════════════
    // PHASE 1 GROUP MANAGEMENT COMMANDS (NEW - February 11, 2026)
    // ════════════════════════════════════════════════════════════════════════
    this.registerHandler('create-group', this.handleCreateGroup.bind(this));
    this.registerHandler('add-group', this.handleAddGroupMembers.bind(this));
    this.registerHandler('remove-group', this.handleRemoveGroupMembers.bind(this));
    this.registerHandler('promote-admin', this.handlePromoteAdmin.bind(this));
    this.registerHandler('demote-admin', this.handleDemoteAdmin.bind(this));
    this.registerHandler('group-info', this.handleGroupInfo.bind(this));
    this.registerHandler('group-invite', this.handleGroupInvite.bind(this));
    this.registerHandler('group-members', this.handleGroupMembers.bind(this));
    this.registerHandler('approval-requests', this.handleMembershipRequests.bind(this));
    this.registerHandler('approve-request', this.handleApproveRequest.bind(this));

    // ════════════════════════════════════════════════════════════════════════
    // PHASE 1 CHAT ORGANIZATION COMMANDS (NEW - February 11, 2026)
    // ════════════════════════════════════════════════════════════════════════
    this.registerHandler('pin-chat', this.handlePinChat.bind(this));
    this.registerHandler('unpin-chat', this.handleUnpinChat.bind(this));
    this.registerHandler('archive-chat', this.handleArchiveChat.bind(this));
    this.registerHandler('unarchive-chat', this.handleUnarchiveChat.bind(this));
    this.registerHandler('mute-chat', this.handleMuteChat.bind(this));
    this.registerHandler('unmute-chat', this.handleUnmuteChat.bind(this));
    this.registerHandler('label-chat', this.handleLabelChat.bind(this));
    this.registerHandler('list-starred', this.handleListStarred.bind(this));

    // ════════════════════════════════════════════════════════════════════════
    // PHASE 1 CONTACT MANAGEMENT COMMANDS (NEW - February 11, 2026)
    // ════════════════════════════════════════════════════════════════════════
    this.registerHandler('block', this.handleBlockContact.bind(this));
    this.registerHandler('unblock', this.handleUnblockContact.bind(this));
    this.registerHandler('blocked-list', this.handleBlockedList.bind(this));
    this.registerHandler('contact-status', this.handleContactStatus.bind(this));
    this.registerHandler('contact-info', this.handleContactInfo.bind(this));
    this.registerHandler('common-groups', this.handleCommonGroups.bind(this));
    this.registerHandler('verify-whatsapp', this.handleVerifyWhatsApp.bind(this));
    this.registerHandler('profile-picture', this.handleProfilePicture.bind(this));

    // ════════════════════════════════════════════════════════════════════════
    // PHASE 19 CAMPAIGN MANAGER COMMANDS (NEW - February 17, 2026)
    // ════════════════════════════════════════════════════════════════════════
    this.registerHandler('create-campaign', this.handleCreateCampaign.bind(this));
    this.registerHandler('start-campaign', this.handleStartCampaign.bind(this));
    this.registerHandler('stop-campaign', this.handleStopCampaign.bind(this));
    this.registerHandler('list-campaigns', this.handleListCampaigns.bind(this));
    this.registerHandler('campaign-stats', this.handleCampaignStats.bind(this));
    this.registerHandler('campaign-schedule', this.handleCampaignSchedule.bind(this));
  },

  registerHandler(commandName, handler) {
    this.commandHandlers.set(commandName, handler);
  },

  async processMessage(msg, phoneNumber, context = {}) {
    try {
      const messageBody = msg.body.trim();
      const isMasterAccount = context.isMasterAccount || false;
      const masterPhone = services.get('accountConfigManager')?.getMasterPhoneNumber();

      // Check if message is a command (starts with !)
      if (!messageBody.startsWith('!')) {
        // Not a command - log as conversation for learning (master account only)
        if (isMasterAccount) {
          await this.learner.logConversation({
            phoneNumber,
            message: messageBody,
            isFromUser: !msg.fromMe,
            timestamp: new Date(),
            chatId: msg.from,
            messageId: msg.id
          });
        }
        return { isCommand: false, processed: false };
      }

      // Parse command
      const { command, args } = this.parseCommand(messageBody);

      // Track usage
      this.trackUsage(command);

      // Validate command exists
      if (!this.registry.isValidCommand(command)) {
        await msg.reply(
          `❌ Unknown command: \`${command}\`\n\n` +
          `Type \`!help\` for available commands.`
        );
        return { isCommand: true, processed: false, error: 'unknown-command' };
      }

      // Get command metadata
      const cmdInfo = this.registry.getCommand(command);
      if (!cmdInfo.enabled) {
        await msg.reply(
          `⚠️ Command \`${command}\` is currently disabled.\n` +
          `Type \`!help\` for available commands.`
        );
        return { isCommand: true, processed: false, error: 'disabled-command' };
      }

      // Check authentication requirement
      if (cmdInfo.requiresAuth && !this.isAuthenticated(phoneNumber)) {
        await msg.reply(
          `🔐 This command requires authentication.\n\n` +
          `Use: \`!authenticate <password>\` to log in.`
        );
        return { isCommand: true, processed: false, error: 'auth-required' };
      }

      // Validate arguments
      const validation = this.validateArguments(command, args, cmdInfo);
      if (!validation.valid) {
        await msg.reply(
          `❌ ${validation.error}\n\n` +
          `Usage: \`${cmdInfo.usage}\`\n` +
          `Example: \`${cmdInfo.examples[0]}\``
        );
        return { isCommand: true, processed: false, error: 'invalid-args' };
      }

      // Execute handler
      const handler = this.commandHandlers.get(command);
      if (!handler) {
        // Handler not implemented yet
        await msg.reply(
          `⏳ Command \`${command}\` is planned but not yet implemented.\n\n` +
          `Expected in next update. Type \`!help\` for available commands.`
        );
        return { isCommand: true, processed: false, error: 'not-implemented' };
      }

      // Run handler
      const result = await handler({
        msg,
        phoneNumber,
        args,
        cmdInfo,
        context
      });

      // Log successful command execution
      await this.learner.logCommand({
        phoneNumber,
        command,
        args,
        success: true,
        timestamp: new Date(),
        chatId: msg.from
      });

      this.usageStats.successCount++;
      return { isCommand: true, processed: true, result };

    } catch (error) {
      this.logBot(`❌ Command handler error: ${error.message}`, 'error');
      this.usageStats.errorCount++;

      try {
        await msg.reply(
          `❌ Command execution failed: ${error.message}\n\n` +
          `Please try again or type \`!help\` for assistance.`
        );
      } catch (replyError) {
        this.logBot(`Failed to send error message: ${replyError.message}`, 'error');
      }

      return { isCommand: true, processed: false, error: error.message };
    }
  },

  parseCommand(messageBody) {
    const parts = messageBody.trim().split(/\s+/);
    const commandPart = parts[0].substring(1).toLowerCase(); // Remove ! and lowercase
    const args = parts.slice(1);

    return { command: commandPart, args };
  },

  validateArguments(command, args, cmdInfo) {
    if (['link-code', 'link-qr'].includes(command)) {
      return args.length === 0
        ? { valid: true }
        : { valid: false, error: 'Use the direct linking command without arguments.' };
    }
    // Basic validation - can be extended per command
    // This is a simple placeholder that most commands will override

    // Some commands require no args
    if (command === 'help' || command === 'status' || command === 'health' || command === 'list-accounts') {
      return { valid: true };
    }

    // Some commands require at least 1 arg
    if (['find-contact', 'device-status', 'sheet-info', 'learn', 'remove-account', 'set-master', 'enable-account', 'disable-account'].includes(command)) {
      if (args.length === 0) {
        return { valid: false, error: `\`${command}\` requires arguments.` };
      }
    }

    // add-account requires at least 2 args (phone and name)
    if (command === 'add-account' && args.length < 2) {
      return { valid: false, error: `\`add-account\` requires phone number and account name.` };
    }

    return { valid: true };
  },

  async handleLinkMethod({ msg }) {
    await msg.reply('Linking preferences are no longer saved. Use !link-code or !link-qr to start master linking directly. Complete linking in the bot terminal.');
  }
};
