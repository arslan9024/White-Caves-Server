// @ts-nocheck
export const TEAMS_SEED = [
  {
    name: 'Executive Office',
    code: 'EXEC-OFFICE',
    departmentCode: 'EXEC',
    description: 'C-suite leadership team driving company strategy',
    lead: { name: 'Arslan Malik', email: 'arslan@whitecaves.ae', title: 'CEO' },
    responsibilities: ['Strategic Planning', 'Corporate Governance', 'Investor Relations'],
    size: { current: 4, capacity: 5 },
    kpis: [{ name: 'Strategic Initiatives', target: 12, current: 8, unit: 'quarterly' }]
  },
  {
    name: 'Property Operations',
    code: 'PROP-OPS',
    departmentCode: 'OPS',
    description: 'Day-to-day property management and maintenance',
    lead: { name: 'Omar Siddiqui', email: 'omar@whitecaves.ae', title: 'Director' },
    responsibilities: ['Property Maintenance', 'Vendor Management', 'Facility Operations'],
    size: { current: 12, capacity: 15 },
    kpis: [{ name: 'Maintenance Resolution', target: 48, current: 52, unit: 'hours' }]
  },
  {
    name: 'Inventory Team',
    code: 'INV-TEAM',
    departmentCode: 'OPS',
    description: 'Property inventory and listing management',
    lead: { name: 'Fatima Al Hashimi', email: 'fatima.h@whitecaves.ae', title: 'Manager' },
    responsibilities: ['Listing Management', 'Data Quality', 'Portal Publishing'],
    size: { current: 6, capacity: 8 },
    kpis: [{ name: 'Listings Updated', target: 500, current: 478, unit: 'weekly' }]
  },
  {
    name: 'Sales Team A',
    code: 'SALES-A',
    departmentCode: 'SALES',
    description: 'Primary sales off-plan and luxury properties',
    lead: { name: 'Mohammed Al Ameri', email: 'mohammed.a@whitecaves.ae', title: 'Team Lead' },
    responsibilities: ['Off-Plan Sales', 'Luxury Properties', 'VIP Clients'],
    size: { current: 12, capacity: 15 },
    kpis: [{ name: 'Monthly Sales', target: 25000000, current: 21500000, unit: 'AED' }]
  },
  {
    name: 'Sales Team B',
    code: 'SALES-B',
    departmentCode: 'SALES',
    description: 'Secondary market and investment properties',
    lead: { name: 'Sara Al Mazrouei', email: 'sara.m@whitecaves.ae', title: 'Team Lead' },
    responsibilities: ['Secondary Sales', 'Investment Properties', 'Client Matching'],
    size: { current: 10, capacity: 12 },
    kpis: [{ name: 'Monthly Sales', target: 20000000, current: 18200000, unit: 'AED' }]
  },
  {
    name: 'Leasing Team',
    code: 'LEASE-TEAM',
    departmentCode: 'SALES',
    description: 'Residential and commercial leasing operations',
    lead: { name: 'Khalid Al Shamsi', email: 'khalid.s@whitecaves.ae', title: 'Team Lead' },
    responsibilities: ['Tenant Acquisition', 'Lease Processing', 'Renewals'],
    size: { current: 8, capacity: 10 },
    kpis: [{ name: 'Leases Signed', target: 50, current: 42, unit: 'monthly' }]
  },
  {
    name: 'Finance Operations',
    code: 'FIN-OPS',
    departmentCode: 'FIN',
    description: 'Financial processing and accounting',
    lead: { name: 'Hana Al Zaabi', email: 'hana@whitecaves.ae', title: 'Director' },
    responsibilities: ['Accounts Receivable', 'Payroll', 'Financial Reporting'],
    size: { current: 6, capacity: 8 },
    kpis: [{ name: 'Collection Rate', target: 98, current: 94, unit: 'percent' }]
  },
  {
    name: 'Digital Marketing',
    code: 'DIGITAL-MKT',
    departmentCode: 'MKT',
    description: 'Online marketing and lead generation',
    lead: { name: 'Layla Al Suwaidi', email: 'layla@whitecaves.ae', title: 'Director' },
    responsibilities: ['SEO/SEM', 'Social Media', 'Content Marketing'],
    size: { current: 8, capacity: 10 },
    kpis: [{ name: 'Leads Generated', target: 450, current: 385, unit: 'monthly' }]
  },
  {
    name: 'Customer Support',
    code: 'CUST-SUPPORT',
    departmentCode: 'COMM',
    description: 'Client communications and support',
    lead: { name: 'Khalid Al Mansoori', email: 'khalid@whitecaves.ae', title: 'Director' },
    responsibilities: ['Client Support', 'WhatsApp Operations', 'Query Resolution'],
    size: { current: 15, capacity: 20 },
    kpis: [{ name: 'Response Time', target: 2, current: 2.3, unit: 'minutes' }]
  },
  {
    name: 'Compliance Team',
    code: 'COMP-TEAM',
    departmentCode: 'COMP',
    description: 'Regulatory compliance and KYC verification',
    lead: { name: 'Nadia Ibrahim', email: 'nadia@whitecaves.ae', title: 'Director' },
    responsibilities: ['KYC Processing', 'AML Monitoring', 'RERA Compliance'],
    size: { current: 4, capacity: 5 },
    kpis: [{ name: 'Compliance Score', target: 100, current: 98, unit: 'percent' }]
  },
  {
    name: 'Development Team',
    code: 'DEV-TEAM',
    departmentCode: 'TECH',
    description: 'Platform development and maintenance',
    lead: { name: 'Tariq Al Qasimi', email: 'tariq@whitecaves.ae', title: 'Director' },
    responsibilities: ['Platform Development', 'AI Systems', 'Infrastructure'],
    size: { current: 10, capacity: 12 },
    kpis: [{ name: 'Sprint Velocity', target: 50, current: 48, unit: 'points' }]
  },
  {
    name: 'Research Team',
    code: 'RESEARCH',
    departmentCode: 'INTEL',
    description: 'Market research and competitive analysis',
    lead: { name: 'Yusuf Al Ghurair', email: 'yusuf@whitecaves.ae', title: 'Director' },
    responsibilities: ['Market Research', 'Competitor Analysis', 'Price Tracking'],
    size: { current: 4, capacity: 6 },
    kpis: [{ name: 'Reports Published', target: 8, current: 6, unit: 'monthly' }]
  },
  {
    name: 'Legal Team',
    code: 'LEGAL-TEAM',
    departmentCode: 'LEGAL',
    description: 'Contract management and legal operations',
    lead: { name: 'Aisha Al Ketbi', email: 'aisha@whitecaves.ae', title: 'Director' },
    responsibilities: ['Contract Review', 'Dispute Resolution', 'Ejari Processing'],
    size: { current: 4, capacity: 5 },
    kpis: [{ name: 'Contracts Processed', target: 200, current: 156, unit: 'monthly' }]
  }
];
