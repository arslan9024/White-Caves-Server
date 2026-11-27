// @ts-nocheck
/**
 * CommunicationService.js
 * PURPOSE: Service layer for Communication Templates & Message Sending
 * PHASE: 5 Feature 1 - Advanced Tenant Communication
 * 
 * HANDLES:
 * - Template CRUD operations
 * - Message rendering with variable interpolation
 * - Bulk message sending
 * - Delivery tracking & analytics
 * - Scheduled message management
 * - Communication history per recipient
 */

import CommunicationTemplate from '../../schemas/CommunicationTemplateSchema.js';
import CommunicationLog from '../../schemas/CommunicationLogSchema.js';
import { createHash } from 'node:crypto';
import ContactConsentService from '../../../campaigns/ContactConsentService.js';


export const methodsPart5 = {
  static async previewTemplate(templateId, variables = {}, language = 'en') {
    try {
      const template = await CommunicationTemplate.findOne({ templateId });
      if (!template) {
        return { success: false, error: `Template ${templateId} not found` };
      }

      const preview = Object.keys(variables).length > 0
        ? template.render(variables, language)
        : template.preview(language);

      return {
        success: true,
        template: {
          templateId: template.templateId,
          name: template.name,
          category: template.category
        },
        preview,
        variables: template.variables,
        language
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  static async getCategories() {
    try {
      const categories = await CommunicationTemplate.aggregate([
        { $group: { _id: '$category', count: { $sum: 1 }, active: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } } } },
        { $sort: { count: -1 } }
      ]);

      return {
        success: true,
        categories: categories.map(c => ({
          name: c._id,
          total: c.count,
          active: c.active
        }))
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  static async seedDefaultTemplates() {
    const defaults = [
      {
        name: 'Welcome Tenant',
        category: 'welcome',
        content: 'Welcome to DAMAC Hills 2, {tenantName}! 🏡\n\nYour unit {unitNumber} in {clusterName} is ready.\n\nKey contacts:\n📞 Maintenance: +971-XXX-XXXX\n📩 Management: property@damac.ae\n\nWe hope you enjoy your new home!',
        variables: [
          { name: 'tenantName', displayName: 'Tenant Name', required: true, example: 'Ahmed Ali' },
          { name: 'unitNumber', displayName: 'Unit Number', required: true, example: 'V-101' },
          { name: 'clusterName', displayName: 'Cluster Name', required: true, example: 'Amazonia' }
        ],
        createdBy: 'system',
        status: 'active'
      },
      {
        name: 'Payment Reminder',
        category: 'payment_reminder',
        content: 'Hello {tenantName},\n\nThis is a friendly reminder that your rent payment of AED {amount} is due on {dueDate}.\n\nPlease ensure timely payment to avoid any late fees.\n\nThank you! 🏠',
        variables: [
          { name: 'tenantName', displayName: 'Tenant Name', required: true, example: 'Sara Khan' },
          { name: 'amount', displayName: 'Rent Amount', required: true, example: '45,000' },
          { name: 'dueDate', displayName: 'Due Date', required: true, example: 'March 1, 2026' }
        ],
        createdBy: 'system',
        status: 'active'
      },
      {
        name: 'Lease Renewal Notice',
        category: 'lease_renewal',
        content: 'Dear {tenantName},\n\nYour lease for {unitNumber} ({clusterName}) is expiring on {expiryDate}.\n\nWe would love to have you continue as our tenant! Please let us know if you wish to renew.\n\nNew renewal offer: AED {newAmount}/year\n\nContact us to discuss. 📋',
        variables: [
          { name: 'tenantName', displayName: 'Tenant Name', required: true, example: 'Mohammed Ali' },
          { name: 'unitNumber', displayName: 'Unit Number', required: true, example: 'C-205' },
          { name: 'clusterName', displayName: 'Cluster Name', required: true, example: 'Clover' },
          { name: 'expiryDate', displayName: 'Expiry Date', required: true, example: 'May 31, 2026' },
          { name: 'newAmount', displayName: 'New Amount', required: true, example: '50,000' }
        ],
        createdBy: 'system',
        status: 'active'
      },
      {
        name: 'Maintenance Request Received',
        category: 'maintenance',
        content: 'Hello {tenantName},\n\nYour maintenance request has been received ✅\n\n📋 Ticket #: {ticketNumber}\n🔧 Issue: {issueDescription}\n📅 Expected visit: {visitDate}\n\nOur team will contact you to confirm timing.\n\nThank you for your patience!',
        variables: [
          { name: 'tenantName', displayName: 'Tenant Name', required: true, example: 'Fatima Hassan' },
          { name: 'ticketNumber', displayName: 'Ticket Number', required: true, example: 'MT-2026-001' },
          { name: 'issueDescription', displayName: 'Issue', required: true, example: 'AC not cooling' },
          { name: 'visitDate', displayName: 'Visit Date', required: true, example: 'Feb 23, 2026' }
        ],
        createdBy: 'system',
        status: 'active'
      },
      {
        name: 'Emergency Notification',
        category: 'emergency',
        content: '🚨 IMPORTANT NOTICE 🚨\n\nDear {tenantName},\n\n{emergencyMessage}\n\nPlease follow all instructions from the building management.\n\nEmergency Contact: {emergencyContact}\n\nStay safe! 🙏',
        variables: [
          { name: 'tenantName', displayName: 'Tenant Name', required: true, example: 'Resident' },
          { name: 'emergencyMessage', displayName: 'Emergency Message', required: true, example: 'Water supply interruption scheduled for maintenance' },
          { name: 'emergencyContact', displayName: 'Emergency Contact', required: true, example: '+971-50-XXX-XXXX' }
        ],
        createdBy: 'system',
        status: 'active'
      }
    ];

    const results = [];
    for (const tmpl of defaults) {
      const existing = await CommunicationTemplate.findOne({ name: tmpl.name });
      if (!existing) {
        const result = await CommunicationService.createTemplate(tmpl);
        results.push({ name: tmpl.name, ...result });
      } else {
        results.push({ name: tmpl.name, success: true, message: 'Already exists', skipped: true });
      }
    }

    return {
      success: true,
      seeded: results.filter(r => !r.skipped).length,
      skipped: results.filter(r => r.skipped).length,
      results
    };
  }
};
