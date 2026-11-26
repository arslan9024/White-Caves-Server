export interface ZoeDepartmentInfo {
  id: string;
  name: string;
  head: string;
  headName: string;
  contactEmail: string;
  internalPhone: string;
  teams?: string[];
}

export interface ZoeServiceCatalogItem {
  id: string;
  name: string;
  category: string;
  department: string;
  team: string;
}

export const ZOE_DEPARTMENTS: Record<string, ZoeDepartmentInfo> = {
  EXEC: {
    id: 'EXEC',
    name: 'Executive Office',
    head: 'Managing Director',
    headName: 'Arslan Malik',
    contactEmail: 'executive@whitecaves.ae',
    internalPhone: 'Ext. 100',
  },
  SALES: {
    id: 'SALES',
    name: 'Sales & Leasing Division',
    head: 'Director of Sales',
    headName: 'Tariq Al-Farsi',
    contactEmail: 'sales@whitecaves.ae',
    internalPhone: 'Ext. 201',
    teams: ['Residential Sales', 'Commercial Leasing', 'Off-Plan & New Developments'],
  },
  PROPMGMT: {
    id: 'PROPMGMT',
    name: 'Property Management Division',
    head: 'Head of Property Management',
    headName: 'Layla Hassan',
    contactEmail: 'management@whitecaves.ae',
    internalPhone: 'Ext. 301',
  },
  MARKETING: {
    id: 'MARKETING',
    name: 'Marketing & Business Development',
    head: 'Marketing Director',
    headName: 'Omar Khalid',
    contactEmail: 'marketing@whitecaves.ae',
    internalPhone: 'Ext. 401',
  },
  OPERATIONS: {
    id: 'OPERATIONS',
    name: 'Operations & Finance',
    head: 'Chief Financial Officer',
    headName: 'Fatima Al-Zahra',
    contactEmail: 'operations@whitecaves.ae',
    internalPhone: 'Ext. 501',
  },
};

export const ZOE_SERVICES: ZoeServiceCatalogItem[] = [
  {
    id: 'RES-SALE-001',
    name: 'Primary Market Sales (Off-Plan)',
    category: 'Residential',
    department: 'SALES',
    team: 'Off-Plan & New Developments',
  },
  {
    id: 'RES-SALE-002',
    name: 'Secondary Market Sales',
    category: 'Residential',
    department: 'SALES',
    team: 'Residential Sales',
  },
  {
    id: 'RES-SALE-003',
    name: 'Luxury Villa & Penthouse Sales',
    category: 'Residential',
    department: 'SALES',
    team: 'Residential Sales',
  },
  {
    id: 'COMM-LEASE-001',
    name: 'Office Space Leasing',
    category: 'Commercial',
    department: 'SALES',
    team: 'Commercial Leasing',
  },
  {
    id: 'COMM-LEASE-002',
    name: 'Retail Unit Acquisition',
    category: 'Commercial',
    department: 'SALES',
    team: 'Commercial Leasing',
  },
  {
    id: 'PM-001',
    name: 'Full-Service Property Management',
    category: 'Property Management',
    department: 'PROPMGMT',
    team: 'Client Relations',
  },
  {
    id: 'PM-002',
    name: 'Tenant Screening & Placement',
    category: 'Property Management',
    department: 'PROPMGMT',
    team: 'Tenant Management',
  },
  {
    id: 'PREMIUM-001',
    name: 'Real Estate Investment Consultation',
    category: 'Premium',
    department: 'EXEC',
    team: 'Executive Office',
  },
  {
    id: 'PREMIUM-004',
    name: 'DLD/RERA Transaction Facilitation',
    category: 'Premium',
    department: 'OPERATIONS',
    team: 'Transaction Processing',
  },
];

export const ZOE_INTENT_PATTERNS: Record<string, RegExp[]> = {
  department_query: [
    /who (handles?|manages?|is responsible for|leads?)/i,
    /which department/i,
    /(head|director|manager) of/i,
    /contact.*(for|about)/i,
    /reports? to/i,
  ],
  service_query: [
    /what (services?|do you offer)/i,
    /how (does|do).*(work|process)/i,
    /tell me about.*(service|offering)/i,
    /what('s| is) involved in/i,
    /list.*(services?|offerings?)/i,
  ],
  process_query: [
    /(steps?|process|procedure|flow|journey)/i,
    /how (do|does|to).*(buy|sell|rent|lease|manage)/i,
    /walk me through/i,
    /what('s| is) the process/i,
  ],
  contact_query: [
    /who should i (contact|call|email|reach)/i,
    /contact (info|information|details)/i,
    /how (can|do) i (reach|contact)/i,
    /email|phone|extension/i,
  ],
  briefing: [
    /daily (briefing|summary|report)/i,
    /morning (briefing|update)/i,
    /what('s| is) happening today/i,
    /give me (a |an )?(overview|summary|update)/i,
    /brief me/i,
  ],
  metrics: [
    /how many (properties|leads|contracts)/i,
    /(kpi|metrics|stats|statistics|performance)/i,
    /conversion rate/i,
    /current (numbers|figures)/i,
  ],
};

export const ZOE_ENTITY_KEYWORDS = [
  'commercial',
  'residential',
  'leasing',
  'sales',
  'property management',
  'investment',
  'tenant',
  'owner',
  'villa',
  'apartment',
  'office',
];

export const ZOE_PROCESS_RESPONSES = {
  propertyManagement: `**Property Management Journey (9 Steps):**

1. **Owner Onboarding** - Initial meeting and contract signing
2. **Property Valuation** - Market analysis and rental assessment
3. **Marketing & Tenant Screening** - Listing and finding tenants
4. **Lease Agreement & Ejari** - Contract and registration
5. **Deposit Collection & Handover** - Move-in coordination
6. **Monthly Rent Collection** - Ongoing payment management
7. **Maintenance Management** - Issue resolution
8. **Quarterly Inspection** - Property condition checks
9. **Annual Renewal/Exit** - Contract renewal or move-out

**Contact:** management@whitecaves.ae | Ext. 301`,

  sales: `**Residential Sales Journey (9 Steps):**

1. **Initial Consultation** - Understanding your needs
2. **Budget Finalization** - Financial qualification
3. **Property Shortlisting** - Curating options
4. **Viewings** - Physical or virtual tours
5. **Offer & Negotiation** - Price discussion
6. **MOU Signing** - Initial agreement
7. **Due Diligence** - Legal verification
8. **Sales Agreement** - Final contract
9. **DLD Transfer & Handover** - Ownership transfer

**Contact:** sales@whitecaves.ae | Ext. 201`,

  investment: `**Investment Consultation Journey (7 Steps):**

1. **Investor Profile Assessment** - Goals and risk tolerance
2. **Market Analysis** - Opportunity identification
3. **Strategy Development** - Portfolio planning
4. **Property Sourcing** - Finding opportunities
5. **Compliance Check** - Legal verification
6. **Transaction Support** - Acquisition help
7. **Performance Monitoring** - Ongoing tracking

**Contact:** executive@whitecaves.ae | Ext. 100`,
};
