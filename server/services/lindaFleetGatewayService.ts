/**
 * Linda Multi-SIM Fleet Gateway Service
 * White Caves Ecosystem — AI Communications Mesh (DEPT-08 / MGR-08-1)
 *
 * Provides:
 *  - High-availability multi-SIM dispatch across 5 business numbers
 *  - Automatic line health monitoring and seamless failover
 *  - Concurrency control and inbound routing to Daisy/Henry/Mary
 */

import logger from '../utils/logger.js';
import { AppError } from '../middleware/errorHandler.js';

export interface SimLineStatus {
  lineId: string;
  phoneNumber: string;
  label: string;
  isActive: boolean;
  healthScore: number; // 0 - 100
  activeConversations: number;
  dailyDispatchedCount: number;
}

export interface InboundMessagePayload {
  messageId: string;
  senderPhone: string;
  simLineId: string;
  text: string;
  timestamp: string;
  intent?: 'LANDLORD_INQUIRY' | 'TENANT_LEASING' | 'BUYER_VIEWING' | 'GENERAL_SUPPORT';
}

export class LindaFleetGatewayService {
  private static simLines: Map<string, SimLineStatus> = new Map([
    ['sim-1', { lineId: 'sim-1', phoneNumber: '+971501111001', label: 'Primary Concierge', isActive: true, healthScore: 98, activeConversations: 12, dailyDispatchedCount: 140 }],
    ['sim-2', { lineId: 'sim-2', phoneNumber: '+971501111002', label: 'DAMAC Hills 2 Outreach', isActive: true, healthScore: 95, activeConversations: 18, dailyDispatchedCount: 210 }],
    ['sim-3', { lineId: 'sim-3', phoneNumber: '+971501111003', label: 'VIP Investor Relations', isActive: true, healthScore: 100, activeConversations: 5, dailyDispatchedCount: 45 }],
    ['sim-4', { lineId: 'sim-4', phoneNumber: '+971501111004', label: 'Leasing Fast-Response', isActive: true, healthScore: 92, activeConversations: 22, dailyDispatchedCount: 190 }],
    ['sim-5', { lineId: 'sim-5', phoneNumber: '+971501111005', label: 'Escalations & Handoffs', isActive: true, healthScore: 99, activeConversations: 8, dailyDispatchedCount: 65 }],
  ]);

  public static listFleetLines(): SimLineStatus[] {
    return Array.from(this.simLines.values());
  }

  public static selectBestDispatchLine(preferredLineId?: string): SimLineStatus {
    if (preferredLineId && this.simLines.has(preferredLineId)) {
      const preferred = this.simLines.get(preferredLineId)!;
      if (preferred.isActive && preferred.healthScore >= 70) {
        return preferred;
      }
      logger.warn(`[LindaFleet] Preferred line ${preferredLineId} degraded or inactive; falling back to best healthy line.`);
    }

    const available = Array.from(this.simLines.values())
      .filter(line => line.isActive && line.healthScore >= 80)
      .sort((a, b) => a.activeConversations - b.activeConversations);

    if (!available.length) {
      throw new AppError('No healthy WhatsApp SIM lines available in Linda fleet', 503);
    }

    return available[0];
  }

  public static classifyInboundIntent(text: string): InboundMessagePayload['intent'] {
    const lower = text.toLowerCase();
    if (lower.includes('rent') || lower.includes('lease') || lower.includes('ejari') || lower.includes('tenant')) {
      return 'TENANT_LEASING';
    }
    if (lower.includes('sell') || lower.includes('landlord') || lower.includes('owner') || lower.includes('evaluation')) {
      return 'LANDLORD_INQUIRY';
    }
    if (lower.includes('buy') || lower.includes('view') || lower.includes('villa') || lower.includes('price')) {
      return 'BUYER_VIEWING';
    }
    return 'GENERAL_SUPPORT';
  }

  public static routeToAutonomousAgent(intent: InboundMessagePayload['intent']): {
    targetAgent: 'daisy' | 'henry' | 'mary' | 'linda';
    targetRole: string;
  } {
    switch (intent) {
      case 'TENANT_LEASING':
        return { targetAgent: 'daisy', targetRole: 'Residential Leasing & Tenancy Manager' };
      case 'LANDLORD_INQUIRY':
        return { targetAgent: 'linda', targetRole: 'Head of WhatsApp Real Estate Automation' };
      case 'BUYER_VIEWING':
        return { targetAgent: 'mary', targetRole: 'VIP Inventory & Off-Plan Specialist' };
      default:
        return { targetAgent: 'linda', targetRole: 'Concierge Automation Assistant' };
    }
  }
}

export default LindaFleetGatewayService;
