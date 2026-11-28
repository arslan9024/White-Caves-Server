/**
 * ninaTypes.ts — Pure domain types & enums for NinaBotAgent (NINA NLP Engine).
 * Keeps ninaEngine.ts strictly <350 lines per AEG-042.
 */

export const CONFIDENCE_GATE_THRESHOLD = 30;

export enum Intent {
  PROPERTY_INQUIRY = 'PROPERTY_INQUIRY',
  PROPERTY_INQUIRY_RESIDENTIAL = 'PROPERTY_INQUIRY_RESIDENTIAL',
  PROPERTY_INQUIRY_COMMERCIAL = 'PROPERTY_INQUIRY_COMMERCIAL',
  PROPERTY_INQUIRY_LAND = 'PROPERTY_INQUIRY_LAND',
  PROPERTY_INQUIRY_INVESTMENT = 'PROPERTY_INQUIRY_INVESTMENT',

  VIEWING_REQUEST = 'VIEWING_REQUEST',
  VIEWING_REQUEST_IMMEDIATE = 'VIEWING_REQUEST_IMMEDIATE',
  VIEWING_REQUEST_SCHEDULED = 'VIEWING_REQUEST_SCHEDULED',
  VIEWING_REQUEST_GROUP = 'VIEWING_REQUEST_GROUP',
  VIEWING_REQUEST_VIRTUAL = 'VIEWING_REQUEST_VIRTUAL',

  PURCHASE_INTEREST = 'PURCHASE_INTEREST',
  PURCHASE_INTEREST_READY = 'PURCHASE_INTEREST_READY',
  PURCHASE_INTEREST_1_3_MONTHS = 'PURCHASE_INTEREST_1_3_MONTHS',
  PURCHASE_INTEREST_3_12_MONTHS = 'PURCHASE_INTEREST_3_12_MONTHS',
  PURCHASE_INTEREST_FUTURE = 'PURCHASE_INTEREST_FUTURE',

  COMPLAINT = 'COMPLAINT',
  COMPLAINT_AGENT = 'COMPLAINT_AGENT',
  COMPLAINT_PROPERTY = 'COMPLAINT_PROPERTY',
  COMPLAINT_PROCESS = 'COMPLAINT_PROCESS',
  COMPLAINT_SERVICE = 'COMPLAINT_SERVICE',

  INFORMATION_REQUEST = 'INFORMATION_REQUEST',
  INFORMATION_REQUEST_PRICING = 'INFORMATION_REQUEST_PRICING',
  INFORMATION_REQUEST_AVAILABILITY = 'INFORMATION_REQUEST_AVAILABILITY',
  INFORMATION_REQUEST_SPECS = 'INFORMATION_REQUEST_SPECS',
  INFORMATION_REQUEST_LOCATION = 'INFORMATION_REQUEST_LOCATION',

  NEGOTIATION = 'NEGOTIATION',
  NEGOTIATION_PRICE = 'NEGOTIATION_PRICE',
  NEGOTIATION_TERMS = 'NEGOTIATION_TERMS',
  NEGOTIATION_FINANCING = 'NEGOTIATION_FINANCING',
  NEGOTIATION_TRADEIN = 'NEGOTIATION_TRADEIN',

  GREETING = 'GREETING',
  FAREWELL = 'FAREWELL',
  ASSISTANCE_NEEDED = 'ASSISTANCE_NEEDED',
  UNKNOWN = 'UNKNOWN',
}

export interface IntentScore {
  intent: Intent;
  confidence: number;
  reasoning: string;
}

export interface SentimentResult {
  sentiment: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
  score: number;
  keywords: string[];
}

export interface Entity {
  type:
    | 'PROPERTY_TYPE'
    | 'LOCATION'
    | 'PRICE'
    | 'BEDROOMS'
    | 'SIZE'
    | 'NAME'
    | 'PHONE'
    | 'DATE'
    | 'AMENITY';
  value: string;
  confidence: number;
}

export interface HandoffPayload {
  reason: 'LOW_CONFIDENCE' | 'COMPLAINT' | 'ASSISTANCE_NEEDED' | 'NEGATIVE_SENTIMENT';
  confidence: number;
  detectedIntent: Intent;
  entities: Entity[];
  sentiment: SentimentResult;
  conversationId: string;
  customerName?: string;
  customerPhone?: string;
  suggestedQueue: 'GENERAL' | 'SALES' | 'SUPPORT' | 'COMPLAINTS';
}

export interface IntentResult {
  primary: IntentScore;
  secondary: IntentScore[];
  entities: Entity[];
  sentiment: SentimentResult;
  topics: string[];
  requiresAgentHandoff: boolean;
  handoffPayload?: HandoffPayload;
  suggestedResponse: string;
  timestamp: Date;
}

export interface ConversationContext {
  conversationId: string;
  customerName?: string;
  customerPhone?: string;
  recentIntents: Intent[];
  recentTopics: string[];
  mentionedProperties: string[];
  budget?: number;
  timeline?: string;
  needsAssistance: boolean;
  lastMessageTimestamp: Date;
}
