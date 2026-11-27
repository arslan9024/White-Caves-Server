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


export const methodsPart2 = {
  async handleDirectLink({ msg, cmdInfo }) {
    const sender = msg.from?.endsWith('@g.us') ? msg.author : msg.from;
    const acm = services.get('accountConfigManager');
    const masterPhones = (acm?.getAllMasterAccounts?.() || [])
      .map(acc => acc.phoneNumber?.replace(/^\+/, ''))
      .filter(Boolean);
    if (!masterPhones.length) {
      const single = acm?.getMasterPhoneNumber()?.replace(/^\+/, '');
      if (single) masterPhones.push(single);
    }
    const masterJids = masterPhones.flatMap(p => [`${p}@c.us`, `${p}@s.whatsapp.net`]);
    let authorized = msg.fromMe === true || masterJids.includes(sender);

    if (!authorized && msg.from?.endsWith('@g.us')) {
      const chat = await msg.getChat();
      const participant = sender && chat.isGroup && chat.participants?.find(member =>
        member.id?._serialized === sender
      );
      authorized = Boolean(participant && (participant.isAdmin || participant.isSuperAdmin));
    }
    if (!authorized) {
      throw new Error('Only group admins or the master account can start device linking.');
    }

    const linking = services.getOrThrow('manualLinkingHandler');
    if (linking.isLinking) {
      throw new Error('Linking is already in progress. Complete the current attempt in the bot terminal.');
    }
    const method = cmdInfo.name === 'link-code' ? 'code' : 'qr';
    await msg.reply(`Starting master linking with ${method === 'code' ? 'a pairing code' : 'a QR code'} for this attempt only. Complete linking in the bot terminal; nothing is saved as a preference.`);
    const success = await linking.initiateMasterAccountLinking(method);
    if (!success) {
      throw new Error('Master linking failed. See the bot terminal for details.');
    }
  },

  isAuthenticated(phoneNumber) {
    if (!this.sessionAuth.has(phoneNumber)) {
      return false;
    }

    const authData = this.sessionAuth.get(phoneNumber);
    // Check if auth hasn't expired (1 hour)
    return (Date.now() - authData.timestamp) < 3600000;
  },

  authenticateUser(phoneNumber, password) {
    // TODO: Integrate with actual auth mechanism
    // For now, simple password check
    const adminPassword = process.env.LINDA_ADMIN_PASSWORD || 'linda123';

    if (password === adminPassword) {
      this.sessionAuth.set(phoneNumber, {
        timestamp: Date.now(),
        authenticated: true
      });
      return true;
    }

    return false;
  },

  trackUsage(command) {
    this.usageStats.totalCommands++;

    // Track by command
    this.usageStats.commandsByName[command] = (this.usageStats.commandsByName[command] || 0) + 1;

    // Track by category
    const cmdInfo = this.registry.getCommand(command);
    if (cmdInfo) {
      const category = cmdInfo.category;
      this.usageStats.commandsByCategory[category] = 
        (this.usageStats.commandsByCategory[category] || 0) + 1;
    }
  },

  getUsageStats() {
    const uptime = Date.now() - this.usageStats.startTime.getTime();
    return {
      ...this.usageStats,
      uptime,
      uptimeFormatted: this.formatUptime(uptime)
    };
  },

  formatUptime(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  },

  async handleDailyGreetings({ msg }) {
    const greetingService = services.get('dailyMasterGreetingService');
    if (!greetingService) {
      await msg.reply('⚠️ Daily Master Greeting Service is not available.');
      return;
    }
    await msg.reply('🌅 Initiating daily Dubai greetings to all master accounts...');
    const result = await greetingService.sendGreetingsNow({ source: 'command' });
    if (result.success) {
      await msg.reply(`✅ Daily greetings completed: ${result.sentCount}/${result.total} master accounts received greetings.`);
    } else {
      await msg.reply(`⚠️ Could not send daily greetings: ${result.reason || 'Unknown error'}`);
    }
  },

  async handlePing({ msg }) {
    await msg.reply('🏓 pong!');
  },

  async handleStatus({ msg, context }) {
    const stats = this.getUsageStats();
    const masterPhone = services.get('accountConfigManager')?.getMasterPhoneNumber();
    const isMaster = context.phoneNumber === masterPhone;
    const accountInfo = services.get('accountConfigManager')?.getAccount(context.phoneNumber) || {};
    
    let statusText = `\n📊 **LINDA STATUS**\n\n`;
    statusText += `✅ Status: Online\n`;
    statusText += `📱 Account: ${accountInfo.displayName || context.phoneNumber}\n`;
    statusText += `${isMaster ? '👑' : '📱'} Role: ${isMaster ? 'Master (Intelligence Hub)' : 'Secondary (Communication)'}\n`;
    statusText += `⏱️  Uptime: ${stats.uptimeFormatted}\n`;
    statusText += `📈 Total Commands: ${stats.totalCommands}\n`;
    statusText += `✅ Successful: ${stats.successCount}\n`;
    statusText += `❌ Errors: ${stats.errorCount}\n`;
    statusText += `🔌 Connected Devices: ${context.deviceCount || 'unknown'}\n`;
    statusText += `💾 Memory: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB\n`;

    await msg.reply(statusText);
  },

  async handleHelp({ msg, args, context }) {
    const masterPhone = services.get('accountConfigManager')?.getMasterPhoneNumber();
    const isMaster = context?.phoneNumber === masterPhone;
    
    if (args.length === 0) {
      // General help
      let helpText = `\n📚 **LINDA COMMAND HELP**\n\n`;
      helpText += `${isMaster ? '👑 MASTER ACCOUNT' : '📱 SECONDARY ACCOUNT'}\n`;
      helpText += `${isMaster ? 'You have full command access' : 'Send commands to master account for processing'}\n\n`;
      helpText += `Type \`!help <command>\` for details.\n\n`;

      for (const category of this.registry.getCategories()) {
        const commands = this.registry.getCommandsByCategory(category);
        helpText += `**${category.toUpperCase()}**\n`;
        commands.forEach(cmd => {
          helpText += `• \`!${cmd.name}\` - ${cmd.description}\n`;
        });
        helpText += `\n`;
      }

      helpText += `Type \`!authenticate <password>\` to unlock admin commands.`;
      await msg.reply(helpText);
    } else {
      // Specific command help
      const cmdName = args[0].toLowerCase();
      const cmd = this.registry.getCommand(cmdName);

      if (!cmd) {
        await msg.reply(`❌ Unknown command: \`${cmdName}\``);
        return;
      }

      let helpText = `\n📖 **${cmd.name.toUpperCase()}**\n\n`;
      helpText += `${cmd.description}\n\n`;
      helpText += `**Usage:**\n\`${cmd.usage}\`\n\n`;
      helpText += `**Help:**\n${cmd.helpText}\n\n`;
      helpText += `**Examples:**\n`;
      cmd.examples.forEach(example => {
        helpText += `\`${example}\`\n`;
      });

      if (cmd.requiresAuth) {
        helpText += `\n🔐 Requires authentication`;
      }

      await msg.reply(helpText);
    }
  },

  async handleListDevices({ msg, context }) {
    const deviceManager = services.get('deviceLinkedManager');
    if (!deviceManager) {
      await msg.reply(`⚠️ Device manager not initialized`);
      return;
    }

    const devices = deviceManager.getLinkedDevices();
    if (devices.length === 0) {
      await msg.reply(`📱 No devices linked yet.`);
      return;
    }

    let text = `\n📱 **LINKED DEVICES** (${devices.length})\n\n`;
    devices.forEach((device, idx) => {
      text += `${idx + 1}. ${device.displayName || device.phoneNumber}\n`;
      text += `   Phone: ${device.phoneNumber}\n`;
      text += `   Status: ${device.status || 'unknown'}\n`;
      text += `   Last Active: ${device.lastActive || 'never'}\n\n`;
    });

    await msg.reply(text);
  },

  async handleDeviceStatus({ msg, args, context }) {
    if (args.length === 0) {
      await msg.reply(`Usage: \`!device-status <phone-number>\``);
      return;
    }

    const phoneNumber = args[0];
    const deviceManager = services.get('deviceLinkedManager');
    if (!deviceManager) {
      await msg.reply(`⚠️ Device manager not initialized`);
      return;
    }

    const device = deviceManager.getDevice(phoneNumber);
    if (!device) {
      await msg.reply(`❌ Device not found: ${phoneNumber}`);
      return;
    }

    let text = `\n📱 **DEVICE STATUS**\n\n`;
    text += `Name: ${device.displayName || device.phoneNumber}\n`;
    text += `Phone: ${device.phoneNumber}\n`;
    text += `Status: ${device.status || 'unknown'}\n`;
    text += `Linked: ${device.linkedAt ? new Date(device.linkedAt).toLocaleString() : 'never'}\n`;
    text += `Last Active: ${device.lastActivity || 'never'}\n`;
    text += `Role: ${device.role || 'secondary'}\n`;

    await msg.reply(text);
  },

  async handleLearn({ msg, args }) {
    if (args.length === 0) {
      await msg.reply(
        `Learn from conversations!\n\n` +
        `Usage: \`!learn <question> => <answer>\`\n\n` +
        `Example:\n\`!learn What are your rates? => We offer competitive rates.\``
      );
      return;
    }

    const fullMessage = args.join(' ');
    if (!fullMessage.includes('=>')) {
      await msg.reply(
        `❌ Format: \`<question> => <answer>\`\n\n` +
        `Arrow (\`=>\`) separates question and answer.`
      );
      return;
    }

    const [question, answer] = fullMessage.split('=>').map(s => s.trim());

    await this.learner.logLearning({
      question,
      answer,
      source: 'user',
      timestamp: new Date(),
      phoneNumber: msg.from
    });

    await msg.reply(`✅ Learned: "${question}" → "${answer}"`);
  }
};
