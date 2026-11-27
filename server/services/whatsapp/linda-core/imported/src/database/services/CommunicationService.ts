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

import CommunicationTemplate from '../schemas/CommunicationTemplateSchema.js';
import CommunicationLog from '../schemas/CommunicationLogSchema.js';
import { createHash } from 'node:crypto';
import ContactConsentService from '../../campaigns/ContactConsentService.js';

class CommunicationService {
}

import { methodsPart1 } from './communication_parts/part1.js';
import { methodsPart2 } from './communication_parts/part2.js';
import { methodsPart3 } from './communication_parts/part3.js';
import { methodsPart4 } from './communication_parts/part4.js';
import { methodsPart5 } from './communication_parts/part5.js';
Object.assign(CommunicationService.prototype, methodsPart1, methodsPart2, methodsPart3, methodsPart4, methodsPart5);


export default CommunicationService;

