export interface DirectorProfile {
  id: string;
  departmentCode: string;
  departmentName: string;
  title: string;
  domain: string;
  keywords: string[];
}

export interface ZoeProfile {
  id: string;
  name: string;
  role: string;
  reportsTo: string;
  authorityLevel: 'COO';
}

export interface GovernanceRouteResult {
  routedBy: string;
  director: DirectorProfile;
  escalatedToZoe: boolean;
  reason: string;
}

const DIRECTORS: DirectorProfile[] = [
  { id: 'DIR-01', departmentCode: 'DEPT-01', departmentName: 'Executive & Strategy', title: 'Director of Strategy', domain: 'strategy', keywords: ['strategy', 'executive', 'board', 'okrs'] },
  { id: 'DIR-02', departmentCode: 'DEPT-02', departmentName: 'Sales & Brokerage', title: 'Director of Sales', domain: 'sales', keywords: ['sales', 'lead', 'deal', 'brokerage', 'commission'] },
  { id: 'DIR-03', departmentCode: 'DEPT-03', departmentName: 'Leasing & Ejari', title: 'Director of Leasing', domain: 'leasing', keywords: ['leasing', 'ejari', 'tenancy', 'renewal', 'rent'] },
  { id: 'DIR-04', departmentCode: 'DEPT-04', departmentName: 'Property Management', title: 'Director of Property Management', domain: 'property', keywords: ['property', 'maintenance', 'inspection', 'unit', 'snagging'] },
  { id: 'DIR-05', departmentCode: 'DEPT-05', departmentName: 'Finance & VAT', title: 'Director of Finance', domain: 'finance', keywords: ['finance', 'vat', 'tax', 'invoice', 'payroll', 'ledger'] },
  { id: 'DIR-06', departmentCode: 'DEPT-06', departmentName: 'Legal & DLD Compliance', title: 'Director of Legal', domain: 'legal', keywords: ['legal', 'dld', 'rera', 'compliance', 'contract', 'kyc'] },
  { id: 'DIR-07', departmentCode: 'DEPT-07', departmentName: 'Marketing & Brand', title: 'Director of Marketing', domain: 'marketing', keywords: ['marketing', 'campaign', 'seo', 'portal', 'brand'] },
  { id: 'DIR-08', departmentCode: 'DEPT-08', departmentName: 'Human Resources', title: 'Director of HR', domain: 'hr', keywords: ['hr', 'hiring', 'onboarding', 'staff', 'training'] },
  { id: 'DIR-09', departmentCode: 'DEPT-09', departmentName: 'Technology & AI', title: 'Director of Technology', domain: 'tech', keywords: ['tech', 'ai', 'system', 'api', 'security', 'data'] },
  { id: 'DIR-10', departmentCode: 'DEPT-10', departmentName: 'Client Relations', title: 'Director of Client Relations', domain: 'client', keywords: ['client', 'vip', 'support', 'feedback', 'retention'] },
  { id: 'DIR-11', departmentCode: 'DEPT-11', departmentName: 'Operations & Logistics', title: 'Director of Operations', domain: 'operations', keywords: ['operations', 'logistics', 'facility', 'vendor', 'sla'] },
  { id: 'DIR-12', departmentCode: 'DEPT-12', departmentName: 'Analytics & Intelligence', title: 'Director of Analytics', domain: 'analytics', keywords: ['analytics', 'report', 'kpi', 'forecast', 'metrics'] },
];

export class ZoeCouncil {
  private readonly zoe: ZoeProfile = {
    id: 'COO-ZOE',
    name: 'AI Zoe',
    role: 'Chief Operating Officer',
    reportsTo: 'MD-01',
    authorityLevel: 'COO',
  };

  private readonly directors: Map<string, DirectorProfile>;

  constructor() {
    this.directors = new Map(DIRECTORS.map((d) => [d.id, d]));
  }

  getZoeProfile(): ZoeProfile {
    return { ...this.zoe };
  }

  listDirectors(): DirectorProfile[] {
    return Array.from(this.directors.values());
  }

  getDirector(directorId: string): DirectorProfile | undefined {
    return this.directors.get(directorId);
  }

  getDirectorByDepartment(departmentCode: string): DirectorProfile | undefined {
    return Array.from(this.directors.values()).find(
      (d) => d.departmentCode === departmentCode
    );
  }

  routeGovernance(topicOrDept: string, urgent = false): GovernanceRouteResult {
    const normalized = topicOrDept.trim().toLowerCase();
    const byDept = this.getDirectorByDepartment(topicOrDept.toUpperCase());
    if (byDept) {
      return {
        routedBy: this.zoe.id,
        director: byDept,
        escalatedToZoe: urgent,
        reason: `Direct department match (${byDept.departmentCode})`,
      };
    }

    const byKeyword = Array.from(this.directors.values()).find((d) =>
      d.keywords.some((kw) => normalized.includes(kw))
    );
    const director = byKeyword ?? this.directors.get('DIR-11')!;

    return {
      routedBy: this.zoe.id,
      director,
      escalatedToZoe: urgent,
      reason: byKeyword
        ? `Matched domain keyword in ${director.departmentName}`
        : 'Defaulted to Operations & Logistics',
    };
  }
}
