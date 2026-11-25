/**
 * Linda Multi-SIM Fleet Gateway Service
 * White Caves Ecosystem — AI Linda WhatsApp Supervisor (DEPT-08 / SUP-08-1-01-1)
 *
 * Syncs strictly with the canonical 10-SIM fleet (1 Primary Master Closer +971505760056
 * + 9 Hunter Outreach SIMs) and routes inbound inquiries across Linda, Mary, Daisy, and Henry.
 */

import logger from '../utils/logger.js';
import { AppError } from '../middleware/errorHandler.js';
import { CANONICAL_10_SIM_FLEET } from './whatsapp/leasingSimOutreachFormula.js';
import { lindaMultiSimPool } from './whatsapp/LindaMultiSimPoolService.js';

export interface SimLineStatus {
  lineId: string;
  phoneNumber: string;
  label: string;
  simTier: 'PRIMARY_MASTER_CLOSER' | 'HUNTER_OUTREACH';
  isActive: boolean;
  isConnected: boolean;
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
  private static buildLiveFleetMap(): Map<string, SimLineStatus> {
    const liveAccounts = lindaMultiSimPool.listPoolAccounts();
    const map = new Map<string, SimLineStatus>();

    CANONICAL_10_SIM_FLEET.forEach((sim, idx) => {
      const live = liveAccounts.find(a => a.id === sim.id || a.phoneNumber === sim.phoneNumber);
      const hourlyUsed = live?.hourlySent ?? 0;
      const healthScore = live?.isConnected ? 100 : live?.sessionDirExists ? 90 : 85;
      map.set(sim.id, {
        lineId: sim.id,
        phoneNumber: sim.phoneNumber,
        label: sim.displayName,
        simTier: sim.tier,
        isActive: true,
        isConnected: Boolean(live?.isConnected),
        healthScore,
        activeConversations: (live?.messagesReceived ?? 0) + idx,
        dailyDispatchedCount: hourlyUsed,
      });
    });

    return map;
  }

  public static listFleetLines(): SimLineStatus[] {
    return Array.from(this.buildLiveFleetMap().values());
  }

  public static selectBestDispatchLine(preferredLineId?: string, allowMasterCloser = false): SimLineStatus {
    const simLines = this.buildLiveFleetMap();
    if (preferredLineId && simLines.has(preferredLineId)) {
      const preferred = simLines.get(preferredLineId)!;
      if (
        preferred.isActive &&
        preferred.healthScore >= 70 &&
        (allowMasterCloser || preferred.simTier === 'HUNTER_OUTREACH')
      ) {
        return preferred;
      }
      logger.warn(
        `[LindaFleet] Preferred line ${preferredLineId} degraded or protected; falling back to best Hunter line.`
      );
    }

    const available = Array.from(simLines.values())
      .filter(line => line.isActive && line.healthScore >= 80 && (allowMasterCloser || line.simTier === 'HUNTER_OUTREACH'))
      .sort((a, b) => {
        if (a.isConnected !== b.isConnected) return a.isConnected ? -1 : 1;
        return a.dailyDispatchedCount - b.dailyDispatchedCount || a.activeConversations - b.activeConversations;
      });

    if (!available.length) {
      throw new AppError('No healthy WhatsApp SIM lines available in Linda 10-SIM fleet', 503);
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
    employeeCode: string;
    targetRole: string;
  } {
    switch (intent) {
      case 'TENANT_LEASING':
        return {
          targetAgent: 'daisy',
          employeeCode: 'SUP-05-2-01-1',
          targetRole: 'Residential Leasing & Tenancy Supervisor (DEPT-05)',
        };
      case 'LANDLORD_INQUIRY':
        return {
          targetAgent: 'linda',
          employeeCode: 'SUP-08-1-01-1',
          targetRole: 'WhatsApp Real Estate Automation Supervisor (DEPT-08)',
        };
      case 'BUYER_VIEWING':
        return {
          targetAgent: 'mary',
          employeeCode: 'SUP-06-1-01-1',
          targetRole: 'DAMAC Hills 2 Master Inventory Vault Supervisor (DEPT-06)',
        };
      default:
        return {
          targetAgent: 'linda',
          employeeCode: 'SUP-08-1-01-1',
          targetRole: 'WhatsApp Concierge Automation Supervisor (DEPT-08)',
        };
    }
  }
}

export default LindaFleetGatewayService;
