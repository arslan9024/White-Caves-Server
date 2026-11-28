/**
 * ninaPatterns.ts — Pure functional NLP pattern builders & message helpers
 * for NinaBotAgent (AEG-042).
 */

import { Intent } from './ninaTypes.js';

export function normalizeMessage(message: string): string {
  return message
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s\d\-\.]/g, '');
}

export function buildIntentKeywords(): Map<Intent, string[]> {
  return new Map([
    [Intent.PROPERTY_INQUIRY, ['show', 'property', 'properties', 'looking for', 'interested in', 'search']],
    [Intent.PROPERTY_INQUIRY_RESIDENTIAL, ['apartment', 'villa', 'townhouse', 'flat', 'residential']],
    [Intent.PROPERTY_INQUIRY_COMMERCIAL, ['office', 'shop', 'commercial', 'retail', 'space']],
    [Intent.PROPERTY_INQUIRY_LAND, ['plot', 'land', 'terrain', 'development']],
    [Intent.PROPERTY_INQUIRY_INVESTMENT, ['investment', 'roi', 'yield', 'rental', 'income']],
    [Intent.VIEWING_REQUEST, ['view', 'viewing', 'tour', 'see', 'visit', 'schedule', 'appointment']],
    [Intent.VIEWING_REQUEST_IMMEDIATE, ['today', 'now', 'asap', 'urgent', 'immediately', 'tomorrow']],
    [Intent.VIEWING_REQUEST_SCHEDULED, ['next week', 'next month', 'later', 'schedule', 'plan']],
    [Intent.VIEWING_REQUEST_GROUP, ['group', 'friends', 'family', 'team', 'together']],
    [Intent.VIEWING_REQUEST_VIRTUAL, ['virtual', 'video', 'online', 'video call', '360']],
    [Intent.PURCHASE_INTEREST, ['buy', 'purchase', 'acquire', 'own', 'invest']],
    [Intent.PURCHASE_INTEREST_READY, ['ready to buy', 'ready', 'serious', 'cash ready', 'approved', 'preapproved', 'this week', 'now']],
    [Intent.PURCHASE_INTEREST_1_3_MONTHS, ['1-3 months', '1 month', '2 months', '3 months', 'soon', 'quarter', 'next quarter', 'next 3 months']],
    [Intent.PURCHASE_INTEREST_3_12_MONTHS, ['3-12 months', '6 months', '9 months', 'year', 'this year', 'next year', 'within year']],
    [Intent.PURCHASE_INTEREST_FUTURE, ['future', 'later', 'next year', 'planning', 'maybe', 'consider', 'thinking']],
    [Intent.COMPLAINT, ['complain', 'complaint', 'issue', 'problem', 'unhappy', 'dissatisfied', 'bad', 'terrible', 'disappointed', 'wrong']],
    [Intent.COMPLAINT_AGENT, ['agent', 'broker', 'staff', 'rude', 'unprofessional']],
    [Intent.COMPLAINT_PROPERTY, ['property', 'condition', 'dirty', 'broken', 'damaged']],
    [Intent.COMPLAINT_PROCESS, ['process', 'delay', 'slow', 'waiting', 'paperwork']],
    [Intent.COMPLAINT_SERVICE, ['service', 'support', 'response', 'ignored']],
    [Intent.INFORMATION_REQUEST, ['info', 'information', 'tell me', 'details', 'what', 'what is', 'how', 'explain']],
    [Intent.INFORMATION_REQUEST_PRICING, ['price', 'cost', 'how much', 'aed', 'usd', 'budget']],
    [Intent.INFORMATION_REQUEST_AVAILABILITY, ['available', 'availability', 'vacant', 'open']],
    [Intent.INFORMATION_REQUEST_SPECS, ['specs', 'specifications', 'sqft', 'size', 'bedrooms', 'amenities']],
    [Intent.INFORMATION_REQUEST_LOCATION, ['where', 'location', 'area', 'community', 'nearby', 'district', 'neighborhood']],
    [Intent.NEGOTIATION, ['negotiate', 'offer', 'discount', 'deal', 'lower']],
    [Intent.NEGOTIATION_PRICE, ['price', 'cheaper', 'reduce', 'discount']],
    [Intent.NEGOTIATION_TERMS, ['terms', 'payment', 'payment plan', 'installment', 'installments', 'options', 'cheques']],
    [Intent.NEGOTIATION_FINANCING, ['mortgage', 'loan', 'bank', 'finance', 'financing']],
    [Intent.NEGOTIATION_TRADEIN, ['trade', 'swap', 'exchange']],
    [Intent.GREETING, ['hi', 'hello', 'hey', 'good', 'morning', 'afternoon', 'evening', 'good morning', 'good afternoon', 'good evening', 'salam']],
    [Intent.FAREWELL, ['bye', 'goodbye', 'thanks', 'thank you', 'see you']],
    [Intent.ASSISTANCE_NEEDED, ['help', 'assist', 'assistance', 'need', 'please', 'can you', 'human', 'agent', 'speak to someone', 'manager', 'support']],
  ]);
}

export function buildSentimentLexicon(): Map<string, number> {
  return new Map([
    ['good', 0.6],
    ['great', 0.8],
    ['excellent', 0.9],
    ['amazing', 0.9],
    ['love', 0.8],
    ['perfect', 0.9],
    ['wonderful', 0.8],
    ['fantastic', 0.9],
    ['bad', -0.8],
    ['terrible', -1.0],
    ['horrible', -0.95],
    ['awful', -0.9],
    ['disappointed', -0.8],
    ['angry', -0.85],
    ['frustrated', -0.75],
    ['useless', -0.9],
    ['hate', -1.0],
  ]);
}
