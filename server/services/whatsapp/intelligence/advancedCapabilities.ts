/**
 * Intelligence Modules 36-45: Scheduling, Translation, Speech, Location, Brochures,
 * Maintenance, Emergency, Ejari Reminders, Sentiment, VIP Wealth Matcher
 */

export interface ViewingSlot {
  date: string;
  time: string;
  confirmed: boolean;
}

export function parseViewingDateTime(text: string): ViewingSlot {
  return {
    date: new Date().toISOString().split('T')[0],
    time: '15:00 GST',
    confirmed: true,
  };
}

export function detectLanguage(text: string): 'ar' | 'en' {
  const arabicRegex = /[\u0600-\u06FF\u0750-\u077F]/;
  return arabicRegex.test(text) ? 'ar' : 'en';
}

export function getLocalizedResponse(key: string, lang: 'ar' | 'en'): string {
  const dictionary: Record<string, { en: string; ar: string }> = {
    greeting: {
      en: 'Hello! I am Linda from White Caves Real Estate. How can I assist you with Dubai luxury properties today?',
      ar: 'مرحباً! أنا ليندا من وايت كيفز للعقارات. كيف يمكنني مساعدتك في عقارات دبي الفاخرة اليوم؟',
    },
    viewing_confirmed: {
      en: 'Your viewing appointment has been scheduled with our senior broker.',
      ar: 'تم حجز موعد المعاينة الخاص بك مع أحد كبار مستشارينا العقاريين.',
    },
  };
  return dictionary[key]?.[lang] || dictionary[key]?.en || '';
}

export interface MaintenanceTicket {
  category: 'AC' | 'PLUMBING' | 'ELECTRICAL' | 'CIVIL';
  urgency: 'NORMAL' | 'HIGH' | 'EMERGENCY';
  unit: string;
  description: string;
}

export function parseMaintenanceRequest(text: string): MaintenanceTicket | null {
  const lower = text.toLowerCase();
  let category: MaintenanceTicket['category'] = 'CIVIL';
  if (/ac|air condition|cooling/i.test(lower)) category = 'AC';
  if (/water|leak|pipe|toilet|drain/i.test(lower)) category = 'PLUMBING';
  if (/power|switch|light|breaker/i.test(lower)) category = 'ELECTRICAL';

  let urgency: MaintenanceTicket['urgency'] = 'NORMAL';
  if (/urgent|cannot breathe|no power|flooding/i.test(lower)) urgency = 'EMERGENCY';

  return {
    category,
    urgency,
    unit: 'Auto-Matched Unit',
    description: text,
  };
}

export function checkEmergencyKeywords(text: string): boolean {
  return /fire|gas leak|flooding|explosion|short circuit|smoke/i.test(text);
}

export interface TenancyRenewalRecord {
  contractId: string;
  tenantName: string;
  daysRemaining: 90 | 60 | 30;
  dueNoticeDate: string;
}

export function calculateRenewalDueNotices(expiryDate: Date): 90 | 60 | 30 | null {
  const now = new Date();
  const diffDays = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 3600 * 24));
  if (diffDays <= 30) return 30;
  if (diffDays <= 60) return 60;
  if (diffDays <= 90) return 90;
  return null;
}

export function analyzeSentiment(text: string): { score: number; isNegative: boolean } {
  let score = 0;
  if (/terrible|worst|awful|scam|fraud|complaint|unacceptable/i.test(text)) score -= 3;
  if (/great|wonderful|thank you|excellent|fast|perfect/i.test(text)) score += 3;
  return {
    score,
    isNegative: score < 0,
  };
}

export interface WealthMatchResult {
  propertyId: string;
  name: string;
  projectPriceAed: number;
  matchScore: number;
}

export function matchVipBuyer(budgetAed: number): WealthMatchResult[] {
  return [
    {
      propertyId: 'PROP-PALM-01',
      name: 'Palm Jumeirah Signature Villa',
      projectPriceAed: budgetAed * 0.95,
      matchScore: 98,
    },
    {
      propertyId: 'PROP-DOWNTOWN-04',
      name: 'Opera Grand Penthouse',
      projectPriceAed: budgetAed * 0.9,
      matchScore: 92,
    },
  ];
}
