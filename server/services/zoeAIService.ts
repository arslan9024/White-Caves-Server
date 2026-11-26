// @ts-nocheck
import ZoeConversation from '../models/ZoeConversation.js';
import InventoryProperty from '../models/InventoryProperty.js';
import Lead from '../models/Lead.js';
import Owner from '../models/Owner.js';
import { Contract } from '../lib/database.js';
import {
  classifyZoeIntent,
  extractZoeEntities,
  handleZoeDepartmentQuery,
  handleZoeServiceQuery,
  handleZoeProcessQuery,
  handleZoeContactQuery,
  handleZoeGeneralQuery,
  calculateZoeConfidence,
} from './zoe/zoeQueryHandlers.js';

class ZoeAIService {
  static classifyIntent(query) {
    return classifyZoeIntent(query);
  }

  static extractEntities(query) {
    return extractZoeEntities(query);
  }

  static async processQuery(query, userId, sessionId) {
    const startTime = Date.now();
    const intent = this.classifyIntent(query);
    const entities = this.extractEntities(query);

    let response;
    let sourcesUsed = [];
    let matchedItems = 0;

    switch (intent) {
      case 'department_query':
        ({ response, sourcesUsed, matchedItems } = this.handleDepartmentQuery(query, entities));
        break;
      case 'service_query':
        ({ response, sourcesUsed, matchedItems } = this.handleServiceQuery(query, entities));
        break;
      case 'process_query':
        ({ response, sourcesUsed, matchedItems } = this.handleProcessQuery(query, entities));
        break;
      case 'contact_query':
        ({ response, sourcesUsed, matchedItems } = this.handleContactQuery(query, entities));
        break;
      case 'briefing':
        ({ response, sourcesUsed, matchedItems } = await this.generateDailyBriefing());
        break;
      case 'metrics':
        ({ response, sourcesUsed, matchedItems } = await this.getMetrics());
        break;
      default:
        ({ response, sourcesUsed, matchedItems } = this.handleGeneralQuery(query, entities));
    }

    const responseTime = Date.now() - startTime;
    const confidence = this.calculateConfidence(intent, matchedItems);

    try {
      await ZoeConversation.create({
        userId,
        sessionId,
        query,
        response,
        intent,
        entities,
        metadata: { responseTime, confidence, sourcesUsed, matchedItems },
      });
    } catch (error) {
      console.error('[Zoe] Error saving conversation:', error);
    }

    return {
      response,
      intent,
      entities,
      metadata: { responseTime, confidence, sourcesUsed },
    };
  }

  static handleDepartmentQuery(query, entities) {
    return handleZoeDepartmentQuery(query, entities);
  }

  static handleServiceQuery(query, _entities) {
    return handleZoeServiceQuery(query);
  }

  static handleProcessQuery(query, _entities) {
    return handleZoeProcessQuery(query);
  }

  static handleContactQuery(query, _entities) {
    return handleZoeContactQuery(query);
  }

  static async generateDailyBriefing() {
    try {
      const [propertyStats, leadStats, contractStats] = await Promise.all([
        InventoryProperty.aggregate([
          { $match: { isActive: true } },
          {
            $group: {
              _id: null,
              total: { $sum: 1 },
              available: { $sum: { $cond: [{ $eq: ['$status', 'available'] }, 1, 0] } },
              forSale: { $sum: { $cond: [{ $eq: ['$purpose', 'sale'] }, 1, 0] } },
              forRent: { $sum: { $cond: [{ $eq: ['$purpose', 'rent'] }, 1, 0] } },
            },
          },
        ]),
        Lead.aggregate([
          {
            $group: {
              _id: null,
              total: { $sum: 1 },
              new: { $sum: { $cond: [{ $eq: ['$status', 'new'] }, 1, 0] } },
              qualified: { $sum: { $cond: [{ $eq: ['$status', 'qualified'] }, 1, 0] } },
              converted: { $sum: { $cond: [{ $eq: ['$status', 'converted'] }, 1, 0] } },
            },
          },
        ]),
        Contract.countDocuments({ status: { $in: ['draft', 'pending_signature'] } }),
      ]);

      const props = propertyStats[0] || { total: 0, available: 0, forSale: 0, forRent: 0 };
      const leads = leadStats[0] || { total: 0, new: 0, qualified: 0, converted: 0 };
      const conversionRate = leads.total > 0 ? ((leads.converted / leads.total) * 100).toFixed(1) : 0;

      const dateStr = new Date().toLocaleDateString('en-AE', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'Asia/Dubai',
      });

      const response = `**Good Morning! Daily Briefing for ${dateStr}**

📊 **Property Portfolio**
• Total Properties: ${props.total}
• Available: ${props.available}
• For Sale: ${props.forSale} | For Rent: ${props.forRent}

👥 **Lead Pipeline**
• Total Leads: ${leads.total}
• New Today: ${leads.new}
• Qualified: ${leads.qualified}
• Converted: ${leads.converted}
• Conversion Rate: ${conversionRate}%

📝 **Pending Actions**
• Contracts Pending: ${contractStats}

💡 **AI Insights**
All systems operational. ${leads.new > 5 ? '⚡ High lead volume today - prioritize follow-ups.' : 'Normal activity levels.'}`;

      return { response, sourcesUsed: ['properties', 'leads', 'contracts'], matchedItems: 3 };
    } catch (error) {
      console.error('[Zoe] Briefing error:', error);
      return {
        response:
          "I'm having trouble generating the briefing right now. Please try again in a moment.",
        sourcesUsed: [],
        matchedItems: 0,
      };
    }
  }

  static async getMetrics() {
    try {
      const [propertyCount, leadCount, ownerCount] = await Promise.all([
        InventoryProperty.countDocuments({ isActive: true }),
        Lead.countDocuments({}),
        Owner.countDocuments({}),
      ]);

      const response = `**Current Metrics:**

📈 **Inventory**
• Total Properties: ${propertyCount}

👥 **CRM**
• Total Leads: ${leadCount}
• Total Owners: ${ownerCount}

All data is real-time from our MongoDB database.`;

      return { response, sourcesUsed: ['properties', 'leads', 'owners'], matchedItems: 3 };
    } catch {
      return { response: 'Unable to fetch metrics at this time.', sourcesUsed: [], matchedItems: 0 };
    }
  }

  static handleGeneralQuery(_query, _entities) {
    return handleZoeGeneralQuery();
  }

  static calculateConfidence(intent, matchedItems) {
    return calculateZoeConfidence(intent, matchedItems);
  }

  static async getConversationHistory(sessionId, limit = 10) {
    try {
      return await ZoeConversation.getSessionHistory(sessionId, limit);
    } catch (error) {
      console.error('[Zoe] Error getting history:', error);
      return [];
    }
  }
}

export default ZoeAIService;
