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


export const methodsPart1 = {
  static _idempotencyIndexPromise = null;,

  static async _ensureIdempotencyIndex() {
    if (!CommunicationService._idempotencyIndexPromise) {
      CommunicationService._idempotencyIndexPromise = CommunicationLog.collection.createIndex(
        { idempotencyKey: 1 },
        { unique: true, sparse: true }
      );
    }
    return CommunicationService._idempotencyIndexPromise;
  },

  static _validateIdempotencyKey(key) {
    if (key === undefined) return null;
    if (typeof key !== 'string' || !/^[A-Za-z0-9._:-]{8,128}$/.test(key)) {
      throw new Error('Idempotency-Key must contain 8-128 letters, numbers, dots, underscores, colons, or hyphens.');
    }
    return key;
  },

  static async _saveMessageLog(log) {
    try {
      await log.save();
      return { log, duplicate: false };
    } catch (error) {
      if (error.code === 11000 && log.idempotencyKey) {
        const existing = await CommunicationLog.findOne({ idempotencyKey: log.idempotencyKey });
        if (existing) return { log: existing, duplicate: true };
      }
      throw error;
    }
  },

  static async createTemplate(templateData) {
    try {
      // Check for duplicate name
      const existing = await CommunicationTemplate.findOne({ name: templateData.name });
      if (existing) {
        return {
          success: false,
          error: `Template with name "${templateData.name}" already exists`,
          existingTemplate: { templateId: existing.templateId, name: existing.name }
        };
      }

      const templateId = CommunicationTemplate.generateTemplateId();

      const template = new CommunicationTemplate({
        templateId,
        name: templateData.name.trim(),
        category: templateData.category,
        content: templateData.content.trim(),
        contentArabic: templateData.contentArabic?.trim(),
        variables: templateData.variables || [],
        language: templateData.language || 'en',
        tags: templateData.tags || [],
        status: templateData.approvalRequired ? 'pending_approval' : (templateData.status || 'draft'),
        approvalRequired: templateData.approvalRequired || false,
        scheduling: templateData.scheduling || {},
        createdBy: templateData.createdBy || 'system'
      });

      // Auto-detect variables from content
      if (template.variables.length === 0) {
        const detectedVars = CommunicationService.detectVariables(template.content);
        if (detectedVars.length > 0) {
          template.variables = detectedVars;
        }
      }

      await template.save();

      return {
        success: true,
        template: template.toObject(),
        message: `Template "${template.name}" created successfully`
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  static async getTemplate(templateId) {
    try {
      const template = await CommunicationTemplate.findOne({ templateId });
      return {
        success: !!template,
        template: template ? template.toObject() : null,
        error: template ? null : `Template ${templateId} not found`
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  static async getTemplateByName(name) {
    try {
      const template = await CommunicationTemplate.findOne({ name });
      return {
        success: !!template,
        template: template ? template.toObject() : null,
        error: template ? null : `Template "${name}" not found`
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  static async listTemplates(options = {}) {
    try {
      const {
        category,
        status,
        tags,
        search,
        page = 1,
        limit = 20,
        sortBy = 'createdAt',
        sortOrder = -1
      } = options;

      const filter = {};
      if (category) filter.category = category;
      if (status) filter.status = status;
      if (tags && tags.length > 0) filter.tags = { $in: Array.isArray(tags) ? tags : [tags] };

      let query;
      if (search) {
        query = CommunicationTemplate.find(
          { ...filter, $text: { $search: search } },
          { score: { $meta: 'textScore' } }
        ).sort({ score: { $meta: 'textScore' } });
      } else {
        query = CommunicationTemplate.find(filter).sort({ [sortBy]: sortOrder });
      }

      const skip = (page - 1) * limit;
      const templates = await query.skip(skip).limit(limit);
      const total = await CommunicationTemplate.countDocuments(filter);

      return {
        success: true,
        templates: templates.map(t => t.toObject()),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  static async updateTemplate(templateId, updateData) {
    try {
      const template = await CommunicationTemplate.findOne({ templateId });
      if (!template) {
        return { success: false, error: `Template ${templateId} not found` };
      }

      // Prevent editing active templates without proper status change
      if (template.status === 'active' && !updateData.status) {
        updateData.status = 'draft'; // Revert to draft when editing active template
      }

      const allowedFields = [
        'name', 'category', 'content', 'contentArabic',
        'variables', 'language', 'tags', 'status',
        'approvalRequired', 'scheduling', 'updatedBy'
      ];

      for (const field of allowedFields) {
        if (updateData[field] !== undefined) {
          template[field] = updateData[field];
        }
      }

      template.updatedBy = updateData.updatedBy || 'system';
      await template.save();

      return {
        success: true,
        template: template.toObject(),
        message: `Template "${template.name}" updated (v${template.version})`
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  static async deleteTemplate(templateId) {
    try {
      const template = await CommunicationTemplate.findOne({ templateId });
      if (!template) {
        return { success: false, error: `Template ${templateId} not found` };
      }

      template.status = 'archived';
      await template.save();

      return {
        success: true,
        message: `Template "${template.name}" archived`
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  static async permanentDeleteTemplate(templateId) {
    try {
      const result = await CommunicationTemplate.deleteOne({ templateId });
      return {
        success: result.deletedCount > 0,
        message: result.deletedCount > 0 ? 'Template permanently deleted' : 'Template not found'
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  static async approveTemplate(templateId, approvedBy) {
    try {
      const template = await CommunicationTemplate.findOne({ templateId });
      if (!template) {
        return { success: false, error: `Template ${templateId} not found` };
      }

      if (template.status !== 'pending_approval' && template.status !== 'draft') {
        return { success: false, error: `Template is ${template.status}, cannot approve` };
      }

      template.status = 'active';
      template.approvedBy = approvedBy;
      template.approvedAt = new Date();
      await template.save();

      return {
        success: true,
        template: template.toObject(),
        message: `Template "${template.name}" approved and activated`
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  static async activateTemplate(templateId) {
    try {
      const template = await CommunicationTemplate.findOne({ templateId });
      if (!template) {
        return { success: false, error: `Template ${templateId} not found` };
      }

      template.status = 'active';
      await template.save();

      return {
        success: true,
        message: `Template "${template.name}" activated`
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
};
