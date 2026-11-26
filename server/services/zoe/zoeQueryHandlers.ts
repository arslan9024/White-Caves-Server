import {
  ZOE_DEPARTMENTS,
  ZOE_ENTITY_KEYWORDS,
  ZOE_INTENT_PATTERNS,
  ZOE_PROCESS_RESPONSES,
  ZOE_SERVICES,
  type ZoeDepartmentInfo,
  type ZoeServiceCatalogItem,
} from './zoeKnowledgeCatalog.js';

export interface ZoeExtractedEntities {
  departments: string[];
  services: string[];
  persons: string[];
  keywords: string[];
}

export interface ZoeQueryResult {
  response: string;
  sourcesUsed: string[];
  matchedItems: number;
}

export function classifyZoeIntent(query: string): string {
  const lowerQuery = query.toLowerCase();
  for (const [intent, patterns] of Object.entries(ZOE_INTENT_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(lowerQuery)) return intent;
    }
  }
  return 'general';
}

export function extractZoeEntities(query: string): ZoeExtractedEntities {
  const entities: ZoeExtractedEntities = {
    departments: [],
    services: [],
    persons: [],
    keywords: [],
  };
  const lowerQuery = query.toLowerCase();

  Object.values(ZOE_DEPARTMENTS).forEach(dept => {
    if (
      lowerQuery.includes(dept.name.toLowerCase()) ||
      lowerQuery.includes(dept.id.toLowerCase()) ||
      lowerQuery.includes(dept.headName.toLowerCase())
    ) {
      entities.departments.push(dept.id);
    }
  });

  ZOE_SERVICES.forEach(service => {
    if (
      lowerQuery.includes(service.name.toLowerCase()) ||
      lowerQuery.includes(service.category.toLowerCase())
    ) {
      entities.services.push(service.id);
    }
  });

  ZOE_ENTITY_KEYWORDS.forEach(kw => {
    if (lowerQuery.includes(kw)) entities.keywords.push(kw);
  });

  return entities;
}

export function handleZoeDepartmentQuery(
  query: string,
  entities: ZoeExtractedEntities
): ZoeQueryResult {
  const lowerQuery = query.toLowerCase();
  let matchedDepts: ZoeDepartmentInfo[] = [];

  if (lowerQuery.includes('commercial') || lowerQuery.includes('office') || lowerQuery.includes('retail')) {
    matchedDepts.push(ZOE_DEPARTMENTS.SALES);
  }
  if (
    lowerQuery.includes('property management') ||
    lowerQuery.includes('tenant') ||
    lowerQuery.includes('maintenance')
  ) {
    matchedDepts.push(ZOE_DEPARTMENTS.PROPMGMT);
  }
  if (lowerQuery.includes('marketing') || lowerQuery.includes('lead') || lowerQuery.includes('campaign')) {
    matchedDepts.push(ZOE_DEPARTMENTS.MARKETING);
  }
  if (lowerQuery.includes('finance') || lowerQuery.includes('dld') || lowerQuery.includes('transaction')) {
    matchedDepts.push(ZOE_DEPARTMENTS.OPERATIONS);
  }
  if (
    lowerQuery.includes('investment') ||
    lowerQuery.includes('strategic') ||
    lowerQuery.includes('managing director')
  ) {
    matchedDepts.push(ZOE_DEPARTMENTS.EXEC);
  }

  if (matchedDepts.length === 0 && entities.departments.length > 0) {
    matchedDepts = entities.departments.map(id => ZOE_DEPARTMENTS[id]).filter(Boolean);
  }

  if (matchedDepts.length === 0) {
    return {
      response:
        'I can help you find the right department. We have:\n\n• **Sales & Leasing** - Property sales and rentals\n• **Property Management** - Tenant and owner services\n• **Marketing** - Lead generation and campaigns\n• **Operations & Finance** - Transactions and compliance\n• **Executive Office** - Strategic matters\n\nWhat area are you interested in?',
      sourcesUsed: ['departments'],
      matchedItems: 0,
    };
  }

  const dept = matchedDepts[0];
  const response = `**Department:** ${dept.name}\n**Head:** ${dept.headName} (${dept.head})\n**Contact:** ${dept.contactEmail} | ${dept.internalPhone}\n${dept.teams ? `**Teams:** ${dept.teams.join(', ')}` : ''}`;
  return { response, sourcesUsed: ['departments'], matchedItems: matchedDepts.length };
}

export function handleZoeServiceQuery(query: string): ZoeQueryResult {
  const lowerQuery = query.toLowerCase();
  let matchedServices: ZoeServiceCatalogItem[] = [];

  if (lowerQuery.includes('residential') || lowerQuery.includes('villa') || lowerQuery.includes('apartment')) {
    matchedServices = ZOE_SERVICES.filter(s => s.category === 'Residential');
  } else if (lowerQuery.includes('commercial') || lowerQuery.includes('office')) {
    matchedServices = ZOE_SERVICES.filter(s => s.category === 'Commercial');
  } else if (lowerQuery.includes('property management') || lowerQuery.includes('tenant')) {
    matchedServices = ZOE_SERVICES.filter(s => s.category === 'Property Management');
  } else if (lowerQuery.includes('investment') || lowerQuery.includes('premium')) {
    matchedServices = ZOE_SERVICES.filter(s => s.category === 'Premium');
  } else if (lowerQuery.includes('all') || lowerQuery.includes('list')) {
    matchedServices = ZOE_SERVICES;
  }

  if (matchedServices.length === 0) {
    return {
      response:
        'We offer services across these categories:\n\n• **Residential Transactions** - Buy, sell, rent homes\n• **Commercial Real Estate** - Office & retail leasing\n• **Property Management** - Full property care\n• **Premium Services** - Investment advisory\n\nWhich category interests you?',
      sourcesUsed: ['services'],
      matchedItems: 0,
    };
  }

  const serviceList = matchedServices
    .map(s => `• **${s.name}** - ${s.department} → ${s.team}`)
    .join('\n');
  return {
    response: `Here are the relevant services:\n\n${serviceList}`,
    sourcesUsed: ['services'],
    matchedItems: matchedServices.length,
  };
}

export function handleZoeProcessQuery(query: string): ZoeQueryResult {
  const lowerQuery = query.toLowerCase();
  if (lowerQuery.includes('property management') || lowerQuery.includes('manage my property')) {
    return { response: ZOE_PROCESS_RESPONSES.propertyManagement, sourcesUsed: ['service_flows'], matchedItems: 1 };
  }
  if (lowerQuery.includes('buy') || lowerQuery.includes('purchase') || lowerQuery.includes('sale')) {
    return { response: ZOE_PROCESS_RESPONSES.sales, sourcesUsed: ['service_flows'], matchedItems: 1 };
  }
  if (lowerQuery.includes('invest')) {
    return { response: ZOE_PROCESS_RESPONSES.investment, sourcesUsed: ['service_flows'], matchedItems: 1 };
  }
  return {
    response:
      'I can walk you through our processes for:\n\n• **Buying/Selling** - Residential sales journey\n• **Property Management** - Owner service flow\n• **Investment** - Advisory consultation process\n• **Commercial Leasing** - Office/retail journey\n\nWhich process would you like to know about?',
    sourcesUsed: ['service_flows'],
    matchedItems: 0,
  };
}

export function handleZoeContactQuery(query: string): ZoeQueryResult {
  const lowerQuery = query.toLowerCase();
  const contacts: string[] = [];

  if (lowerQuery.includes('commercial') || lowerQuery.includes('office') || lowerQuery.includes('leasing')) {
    const dept = ZOE_DEPARTMENTS.SALES;
    contacts.push(`**Commercial Leasing:**\n• ${dept.headName} (${dept.head})\n• Email: ${dept.contactEmail}\n• Phone: ${dept.internalPhone}`);
  }
  if (lowerQuery.includes('property management') || lowerQuery.includes('tenant complaint')) {
    const dept = ZOE_DEPARTMENTS.PROPMGMT;
    contacts.push(`**Property Management:**\n• ${dept.headName} (${dept.head})\n• Email: ${dept.contactEmail}\n• Phone: ${dept.internalPhone}`);
  }
  if (lowerQuery.includes('investment') || lowerQuery.includes('executive')) {
    const dept = ZOE_DEPARTMENTS.EXEC;
    contacts.push(`**Executive Office:**\n• ${dept.headName} (${dept.head})\n• Email: ${dept.contactEmail}\n• Phone: ${dept.internalPhone}`);
  }

  if (contacts.length === 0) {
    const allContacts = Object.values(ZOE_DEPARTMENTS)
      .map(d => `• **${d.name}:** ${d.contactEmail} | ${d.internalPhone}`)
      .join('\n');
    return {
      response: `Here are our department contacts:\n\n${allContacts}`,
      sourcesUsed: ['departments'],
      matchedItems: Object.keys(ZOE_DEPARTMENTS).length,
    };
  }

  return { response: contacts.join('\n\n'), sourcesUsed: ['departments'], matchedItems: contacts.length };
}

export function handleZoeGeneralQuery(): ZoeQueryResult {
  return {
    response: `I'm Zoe, your Executive AI Assistant. I can help you with:

• **Department Info** - "Who handles commercial leasing?"
• **Services** - "What services do you offer for investors?"
• **Processes** - "Walk me through the sales journey"
• **Contacts** - "Who should I contact about property management?"
• **Daily Briefing** - "Give me today's briefing"
• **Metrics** - "Show me current statistics"

What would you like to know?`,
    sourcesUsed: [],
    matchedItems: 0,
  };
}

export function calculateZoeConfidence(intent: string, matchedItems: number): number {
  if (intent === 'unknown' || intent === 'general') return 0.3;
  if (matchedItems === 0) return 0.5;
  if (matchedItems === 1) return 0.8;
  return Math.min(0.95, 0.7 + matchedItems * 0.05);
}
