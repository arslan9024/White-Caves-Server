// @ts-nocheck
export const SERVICES_SEED_PART_3 = [
  {
    "name": "UAE PASS Digital Onboarding",
    "code": "LCS-001",
    "category": "Legal & Compliance Services",
    "tier": "basic",
    "description": "Complete digital identity setup and verification via UAE PASS",
    "shortDescription": "UAE PASS verification",
    "icon": "Fingerprint",
    "departmentCode": "COMP",
    "assistantCode": "VERA",
    "workflow": {
      "stages": [
        {
          "order": 1,
          "name": "Pre-requisites",
          "description": "Document preparation",
          "duration": "1 hour",
          "actions": [
            "Emirates ID check",
            "Mobile verification",
            "Document readiness"
          ]
        },
        {
          "order": 2,
          "name": "Registration",
          "description": "UAE PASS setup",
          "duration": "30 min",
          "actions": [
            "App download",
            "Biometric verification",
            "Account creation"
          ]
        },
        {
          "order": 3,
          "name": "Platform Link",
          "description": "White Caves integration",
          "duration": "15 min",
          "actions": [
            "OAuth connection",
            "Profile sync",
            "Verification complete"
          ]
        }
      ],
      "estimatedDuration": "2-4 hours",
      "sla": "1 hour support"
    },
    "pricing": {
      "type": "fixed",
      "amount": 500,
      "currency": "AED",
      "details": "AED 500 one-time"
    },
    "targetAudience": [
      "all_clients"
    ],
    "metrics": {
      "totalRequests": 2450,
      "completedRequests": 2380,
      "avgCompletionTime": 2,
      "satisfactionScore": 97,
      "revenue": 1190000
    },
    "order": 21
  },
  {
    "name": "RERA/DLD Compliance Package",
    "code": "LCS-002",
    "category": "Legal & Compliance Services",
    "tier": "essential",
    "description": "Full transaction compliance including Form F, Ejari, DLD registration",
    "shortDescription": "Full regulatory compliance",
    "icon": "Shield",
    "departmentCode": "COMP",
    "assistantCode": "LAILA",
    "workflow": {
      "stages": [
        {
          "order": 1,
          "name": "Document Collection",
          "description": "Required documents",
          "duration": "1-2 days",
          "actions": [
            "Identity docs",
            "Property docs",
            "Transaction docs"
          ]
        },
        {
          "order": 2,
          "name": "RERA Processing",
          "description": "Form F and compliance",
          "duration": "2-3 days",
          "actions": [
            "Form F preparation",
            "Broker verification",
            "RERA submission"
          ]
        },
        {
          "order": 3,
          "name": "DLD Registration",
          "description": "Transfer registration",
          "duration": "1-2 days",
          "actions": [
            "Transfer application",
            "Fee payment",
            "Title deed"
          ]
        },
        {
          "order": 4,
          "name": "Ejari",
          "description": "Tenancy registration",
          "duration": "1 day",
          "actions": [
            "Ejari submission",
            "Certificate issuance",
            "Completion"
          ]
        }
      ],
      "estimatedDuration": "5-7 days",
      "sla": "4 hours response"
    },
    "pricing": {
      "type": "fixed",
      "amount": 2500,
      "currency": "AED",
      "details": "AED 2,500 per transaction"
    },
    "targetAudience": [
      "all_transaction_parties"
    ],
    "metrics": {
      "totalRequests": 1890,
      "completedRequests": 1845,
      "avgCompletionTime": 5,
      "satisfactionScore": 95,
      "revenue": 4612500
    },
    "order": 22
  },
  {
    "name": "Contract Review & Negotiation",
    "code": "LCS-003",
    "category": "Legal & Compliance Services",
    "tier": "essential",
    "description": "Legal review of sale/purchase agreements, leases, management contracts",
    "shortDescription": "Contract review services",
    "icon": "FileText",
    "departmentCode": "LEGAL",
    "assistantCode": "EVANGELINE",
    "workflow": {
      "stages": [
        {
          "order": 1,
          "name": "Document Receipt",
          "description": "Contract submission",
          "duration": "Same day",
          "actions": [
            "Contract upload",
            "Scope confirmation",
            "Priority setting"
          ]
        },
        {
          "order": 2,
          "name": "Legal Review",
          "description": "Comprehensive analysis",
          "duration": "2-5 days",
          "actions": [
            "Clause analysis",
            "Risk identification",
            "Recommendation drafting"
          ]
        },
        {
          "order": 3,
          "name": "Client Briefing",
          "description": "Review presentation",
          "duration": "1 hour",
          "actions": [
            "Findings presentation",
            "Q&A",
            "Negotiation strategy"
          ]
        },
        {
          "order": 4,
          "name": "Negotiation Support",
          "description": "Amendment assistance",
          "duration": "As needed",
          "actions": [
            "Amendment drafting",
            "Counter-proposal",
            "Final review"
          ]
        }
      ],
      "estimatedDuration": "3-7 days",
      "sla": "24 hours initial response"
    },
    "pricing": {
      "type": "fixed",
      "amount": 2500,
      "currency": "AED",
      "details": "AED 1,500-5,000 per contract"
    },
    "targetAudience": [
      "all_clients"
    ],
    "metrics": {
      "totalRequests": 568,
      "completedRequests": 542,
      "avgCompletionTime": 4,
      "satisfactionScore": 94,
      "revenue": 1420000
    },
    "order": 23
  },
  {
    "name": "Title Deed Verification",
    "code": "LCS-004",
    "category": "Legal & Compliance Services",
    "tier": "essential",
    "description": "Comprehensive due diligence on property ownership and encumbrances",
    "shortDescription": "Property ownership verification",
    "icon": "Search",
    "departmentCode": "LEGAL",
    "assistantCode": "LAILA",
    "workflow": {
      "stages": [
        {
          "order": 1,
          "name": "Property Details",
          "description": "Information gathering",
          "duration": "1 hour",
          "actions": [
            "Title deed copy",
            "Property ID",
            "Owner details"
          ]
        },
        {
          "order": 2,
          "name": "DLD Verification",
          "description": "Official records check",
          "duration": "1-2 days",
          "actions": [
            "Ownership verification",
            "Mortgage check",
            "Lien search"
          ]
        },
        {
          "order": 3,
          "name": "Report",
          "description": "Findings documentation",
          "duration": "Same day",
          "actions": [
            "Verification report",
            "Risk assessment",
            "Recommendations"
          ]
        }
      ],
      "estimatedDuration": "2-3 days",
      "sla": "24 hours"
    },
    "pricing": {
      "type": "fixed",
      "amount": 1000,
      "currency": "AED",
      "details": "AED 1,000 per property"
    },
    "targetAudience": [
      "buyers",
      "investors"
    ],
    "metrics": {
      "totalRequests": 1245,
      "completedRequests": 1220,
      "avgCompletionTime": 2,
      "satisfactionScore": 98,
      "revenue": 1220000
    },
    "order": 24
  },
  {
    "name": "Dispute Resolution & Mediation",
    "code": "LCS-005",
    "category": "Legal & Compliance Services",
    "tier": "essential",
    "description": "Resolution of tenant-landlord disputes and contract disagreements",
    "shortDescription": "Dispute resolution services",
    "icon": "Scale",
    "departmentCode": "LEGAL",
    "assistantCode": "EVANGELINE",
    "workflow": {
      "stages": [
        {
          "order": 1,
          "name": "Case Assessment",
          "description": "Dispute evaluation",
          "duration": "1-2 days",
          "actions": [
            "Case review",
            "Evidence gathering",
            "Legal assessment"
          ]
        },
        {
          "order": 2,
          "name": "Mediation",
          "description": "Resolution attempts",
          "duration": "3-7 days",
          "actions": [
            "Party communication",
            "Negotiation facilitation",
            "Settlement drafting"
          ]
        },
        {
          "order": 3,
          "name": "Resolution",
          "description": "Case closure",
          "duration": "Variable",
          "actions": [
            "Agreement signing",
            "Implementation monitoring",
            "Case closure"
          ]
        }
      ],
      "estimatedDuration": "1-4 weeks",
      "sla": "24 hours initial response"
    },
    "pricing": {
      "type": "hourly",
      "rate": 350,
      "currency": "AED",
      "details": "AED 350/hour or fixed fee"
    },
    "targetAudience": [
      "all_clients_in_dispute"
    ],
    "metrics": {
      "totalRequests": 186,
      "completedRequests": 164,
      "avgCompletionTime": 12,
      "satisfactionScore": 89,
      "revenue": 820000
    },
    "order": 25
  },
  {
    "name": "Mortgage Facilitation",
    "code": "FS-001",
    "category": "Financial Services",
    "tier": "essential",
    "description": "Access to preferential mortgage rates from partner banks",
    "shortDescription": "Mortgage broker services",
    "icon": "Landmark",
    "departmentCode": "FIN",
    "assistantCode": "THEODORA",
    "workflow": {
      "stages": [
        {
          "order": 1,
          "name": "Pre-qualification",
          "description": "Eligibility assessment",
          "duration": "1-2 days",
          "actions": [
            "Income verification",
            "Credit check",
            "Eligibility calculation"
          ]
        },
        {
          "order": 2,
          "name": "Bank Matching",
          "description": "Lender selection",
          "duration": "2-3 days",
          "actions": [
            "Rate comparison",
            "Bank shortlisting",
            "Pre-approval applications"
          ]
        },
        {
          "order": 3,
          "name": "Application",
          "description": "Full application",
          "duration": "1-2 weeks",
          "actions": [
            "Documentation",
            "Property valuation",
            "Final approval"
          ]
        },
        {
          "order": 4,
          "name": "Disbursement",
          "description": "Fund release",
          "duration": "1 week",
          "actions": [
            "Offer acceptance",
            "Signing",
            "Fund transfer"
          ]
        }
      ],
      "estimatedDuration": "3-4 weeks",
      "sla": "24 hours response"
    },
    "pricing": {
      "type": "percentage",
      "percentage": 0.75,
      "details": "0.5-1% of loan amount (bank paid)"
    },
    "targetAudience": [
      "buyers_financing"
    ],
    "metrics": {
      "totalRequests": 456,
      "completedRequests": 398,
      "avgCompletionTime": 25,
      "satisfactionScore": 92,
      "revenue": 3800000
    },
    "order": 26
  },
  {
    "name": "Tax Optimization Strategy",
    "code": "FS-002",
    "category": "Financial Services",
    "tier": "premium",
    "description": "UAE tax structuring for international real estate investments",
    "shortDescription": "International tax planning",
    "icon": "Calculator",
    "departmentCode": "FIN",
    "assistantCode": "FELIX",
    "workflow": {
      "stages": [
        {
          "order": 1,
          "name": "Tax Assessment",
          "description": "Current situation review",
          "duration": "3-5 days",
          "actions": [
            "Tax residency review",
            "Investment structure analysis",
            "Exposure assessment"
          ]
        },
        {
          "order": 2,
          "name": "Strategy Development",
          "description": "Optimization plan",
          "duration": "5-7 days",
          "actions": [
            "Structure recommendations",
            "Legal entity setup",
            "Compliance roadmap"
          ]
        },
        {
          "order": 3,
          "name": "Implementation",
          "description": "Structure setup",
          "duration": "2-4 weeks",
          "actions": [
            "Entity formation",
            "Account setup",
            "Reporting systems"
          ]
        }
      ],
      "estimatedDuration": "4-6 weeks",
      "sla": "48 hours response"
    },
    "pricing": {
      "type": "fixed",
      "amount": 25000,
      "currency": "AED",
      "details": "AED 10,000-50,000 setup"
    },
    "targetAudience": [
      "international_investors",
      "cross_border_owners"
    ],
    "metrics": {
      "totalRequests": 68,
      "completedRequests": 58,
      "avgCompletionTime": 35,
      "satisfactionScore": 96,
      "revenue": 1740000
    },
    "order": 27
  },
  {
    "name": "Currency Exchange & Transfer",
    "code": "FS-003",
    "category": "Financial Services",
    "tier": "essential",
    "description": "Competitive FX rates for international property payments",
    "shortDescription": "FX and transfers",
    "icon": "DollarSign",
    "departmentCode": "FIN",
    "assistantCode": "QUINN",
    "workflow": {
      "stages": [
        {
          "order": 1,
          "name": "Rate Quote",
          "description": "FX rate provision",
          "duration": "Real-time",
          "actions": [
            "Rate check",
            "Comparison",
            "Rate lock"
          ]
        },
        {
          "order": 2,
          "name": "Transfer Setup",
          "description": "Transaction preparation",
          "duration": "1-2 hours",
          "actions": [
            "Beneficiary setup",
            "Compliance check",
            "Transfer initiation"
          ]
        },
        {
          "order": 3,
          "name": "Execution",
          "description": "Fund transfer",
          "duration": "1-3 days",
          "actions": [
            "Fund transfer",
            "Confirmation",
            "Receipt"
          ]
        }
      ],
      "estimatedDuration": "1-3 days",
      "sla": "1 hour for quotes"
    },
    "pricing": {
      "type": "spread",
      "percentage": 0.3,
      "details": "0.1-0.5% above interbank rate"
    },
    "targetAudience": [
      "overseas_buyers",
      "overseas_sellers"
    ],
    "metrics": {
      "totalRequests": 892,
      "completedRequests": 875,
      "avgCompletionTime": 1.5,
      "satisfactionScore": 94,
      "revenue": 2680000
    },
    "order": 28
  },
  {
    "name": "Insurance Portfolio",
    "code": "FS-004",
    "category": "Financial Services",
    "tier": "essential",
    "description": "Property, liability, and rental income insurance packages",
    "shortDescription": "Property insurance",
    "icon": "ShieldCheck",
    "departmentCode": "FIN",
    "assistantCode": "THEODORA",
    "workflow": {
      "stages": [
        {
          "order": 1,
          "name": "Risk Assessment",
          "description": "Insurance needs analysis",
          "duration": "1-2 days",
          "actions": [
            "Property valuation",
            "Risk profiling",
            "Coverage needs"
          ]
        },
        {
          "order": 2,
          "name": "Quote Comparison",
          "description": "Insurer matching",
          "duration": "2-3 days",
          "actions": [
            "Multi-insurer quotes",
            "Coverage comparison",
            "Premium analysis"
          ]
        },
        {
          "order": 3,
          "name": "Policy Binding",
          "description": "Insurance activation",
          "duration": "1-2 days",
          "actions": [
            "Policy selection",
            "Documentation",
            "Premium payment"
          ]
        }
      ],
      "estimatedDuration": "5-7 days",
      "sla": "24 hours response"
    },
    "pricing": {
      "type": "commission",
      "percentage": 17.5,
      "details": "15-20% of premium"
    },
    "targetAudience": [
      "property_owners",
      "landlords"
    ],
    "metrics": {
      "totalRequests": 568,
      "completedRequests": 524,
      "avgCompletionTime": 5,
      "satisfactionScore": 91,
      "revenue": 1420000
    },
    "order": 29
  },
  {
    "name": "Escrow Services Management",
    "code": "FS-005",
    "category": "Financial Services",
    "tier": "essential",
    "description": "Secure transaction holding with interest-bearing accounts",
    "shortDescription": "Escrow management",
    "icon": "Lock",
    "departmentCode": "FIN",
    "assistantCode": "QUINN",
    "workflow": {
      "stages": [
        {
          "order": 1,
          "name": "Escrow Setup",
          "description": "Account creation",
          "duration": "1-2 days",
          "actions": [
            "Account opening",
            "Terms agreement",
            "Milestone definition"
          ]
        },
        {
          "order": 2,
          "name": "Fund Receipt",
          "description": "Deposit management",
          "duration": "As per transaction",
          "actions": [
            "Deposit verification",
            "Holding confirmation",
            "Interest accrual"
          ]
        },
        {
          "order": 3,
          "name": "Release",
          "description": "Fund disbursement",
          "duration": "1-2 days",
          "actions": [
            "Milestone verification",
            "Approval collection",
            "Fund release"
          ]
        }
      ],
      "estimatedDuration": "Transaction dependent",
      "sla": "4 hours for release requests"
    },
    "pricing": {
      "type": "percentage",
      "percentage": 0.25,
      "details": "0.25% of escrow amount"
    },
    "targetAudience": [
      "off_plan_buyers",
      "distant_sellers"
    ],
    "metrics": {
      "totalRequests": 245,
      "completedRequests": 232,
      "avgCompletionTime": 45,
      "satisfactionScore": 97,
      "revenue": 980000
    },
    "order": 30
  }
];
