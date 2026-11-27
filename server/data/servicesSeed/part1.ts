// @ts-nocheck
export const SERVICES_SEED_PART_1 = [
  {
    "code": "WC-SVC-001",
    "name": "Luxury Property Concierge",
    "category": "Property Sales",
    "shortDescription": "White-glove service for properties valued over AED 10M",
    "description": "Exclusive end-to-end service for ultra-high-net-worth clients with properties over AED 10 million",
    "departmentCode": "SALES",
    "targetAudience": [
      "investors",
      "buyers"
    ],
    "pricing": {
      "type": "percentage",
      "percentage": 2,
      "amount": 50000
    },
    "workflow": {
      "estimatedDuration": "120 days",
      "stages": [
        {
          "order": 1,
          "name": "Client Onboarding",
          "duration": "3 days",
          "actions": [
            "Initial meeting",
            "Requirements capture"
          ]
        },
        {
          "order": 2,
          "name": "Requirements Analysis",
          "duration": "5 days",
          "actions": [
            "Property profiling",
            "Budget analysis"
          ]
        },
        {
          "order": 3,
          "name": "Property Shortlist",
          "duration": "14 days",
          "actions": [
            "Market search",
            "Shortlist creation"
          ]
        },
        {
          "order": 4,
          "name": "Private Viewings",
          "duration": "21 days",
          "actions": [
            "Schedule viewings",
            "Property tours"
          ]
        },
        {
          "order": 5,
          "name": "Negotiation",
          "duration": "14 days",
          "actions": [
            "Price negotiation",
            "Terms discussion"
          ]
        },
        {
          "order": 6,
          "name": "Due Diligence",
          "duration": "30 days",
          "actions": [
            "Legal review",
            "Title verification"
          ]
        },
        {
          "order": 7,
          "name": "Contract Execution",
          "duration": "7 days",
          "actions": [
            "SPA signing",
            "Payment coordination"
          ]
        },
        {
          "order": 8,
          "name": "Handover",
          "duration": "14 days",
          "actions": [
            "Keys handover",
            "Documentation"
          ]
        }
      ]
    },
    "requirements": [
      {
        "name": "Emirates ID",
        "mandatory": true
      },
      {
        "name": "Passport",
        "mandatory": true
      },
      {
        "name": "Proof of Funds",
        "mandatory": true
      },
      {
        "name": "Source of Wealth Declaration",
        "mandatory": false
      }
    ],
    "deliverables": [
      {
        "name": "Property Title Deed",
        "format": "Physical/PDF"
      },
      {
        "name": "Completion Certificate",
        "format": "PDF"
      },
      {
        "name": "Handover Documentation",
        "format": "Physical/PDF"
      }
    ],
    "metrics": {
      "totalRequests": 45,
      "completedRequests": 38,
      "avgCompletionTime": 95,
      "satisfactionScore": 98,
      "revenue": 4500000
    },
    "status": "active"
  },
  {
    "code": "WC-SVC-002",
    "name": "Off-Plan Investment Advisory",
    "category": "Property Sales",
    "shortDescription": "Expert guidance for off-plan property investments",
    "description": "Comprehensive advisory service for investors looking to purchase off-plan properties with payment plan optimization",
    "departmentCode": "SALES",
    "targetAudience": [
      "investors",
      "buyers"
    ],
    "pricing": {
      "type": "fixed",
      "amount": 25000
    },
    "workflow": {
      "estimatedDuration": "45 days",
      "stages": [
        {
          "order": 1,
          "name": "Investment Profiling",
          "duration": "2 days",
          "actions": [
            "Risk assessment",
            "Goals analysis"
          ]
        },
        {
          "order": 2,
          "name": "Market Analysis",
          "duration": "5 days",
          "actions": [
            "Trend research",
            "ROI projections"
          ]
        },
        {
          "order": 3,
          "name": "Project Selection",
          "duration": "7 days",
          "actions": [
            "Developer research",
            "Project comparison"
          ]
        },
        {
          "order": 4,
          "name": "Developer Due Diligence",
          "duration": "10 days",
          "actions": [
            "Track record review",
            "Financial check"
          ]
        },
        {
          "order": 5,
          "name": "Payment Plan Negotiation",
          "duration": "7 days",
          "actions": [
            "Terms negotiation",
            "Discount negotiation"
          ]
        },
        {
          "order": 6,
          "name": "Booking & SPA",
          "duration": "14 days",
          "actions": [
            "Booking form",
            "SPA signing"
          ]
        }
      ]
    },
    "requirements": [
      {
        "name": "Emirates ID or Passport",
        "mandatory": true
      },
      {
        "name": "Investment Budget Confirmation",
        "mandatory": true
      }
    ],
    "deliverables": [
      {
        "name": "Investment Report",
        "format": "PDF"
      },
      {
        "name": "SPA Copy",
        "format": "PDF"
      },
      {
        "name": "Payment Schedule",
        "format": "PDF"
      }
    ],
    "metrics": {
      "totalRequests": 180,
      "completedRequests": 165,
      "avgCompletionTime": 42,
      "satisfactionScore": 94,
      "revenue": 4125000
    },
    "status": "active"
  },
  {
    "code": "WC-SVC-003",
    "name": "Secondary Market Sale",
    "category": "Property Sales",
    "shortDescription": "Professional resale property services",
    "description": "Full-service secondary market sale with valuation, marketing, and transaction management",
    "departmentCode": "SALES",
    "targetAudience": [
      "sellers",
      "landlords"
    ],
    "pricing": {
      "type": "percentage",
      "percentage": 2
    },
    "workflow": {
      "estimatedDuration": "90 days",
      "stages": [
        {
          "order": 1,
          "name": "Property Valuation",
          "duration": "3 days",
          "actions": [
            "Market comparison",
            "Expert assessment"
          ]
        },
        {
          "order": 2,
          "name": "Photography & Staging",
          "duration": "5 days",
          "actions": [
            "Professional photos",
            "Virtual tours"
          ]
        },
        {
          "order": 3,
          "name": "Portal Listing",
          "duration": "2 days",
          "actions": [
            "Multi-portal listing",
            "Marketing launch"
          ]
        },
        {
          "order": 4,
          "name": "Buyer Viewings",
          "duration": "30 days",
          "actions": [
            "Viewing coordination",
            "Feedback collection"
          ]
        },
        {
          "order": 5,
          "name": "Offer Negotiation",
          "duration": "14 days",
          "actions": [
            "Offer management",
            "Counter-offers"
          ]
        },
        {
          "order": 6,
          "name": "Contract & NOC",
          "duration": "21 days",
          "actions": [
            "SPA drafting",
            "NOC application"
          ]
        },
        {
          "order": 7,
          "name": "Transfer",
          "duration": "14 days",
          "actions": [
            "DLD transfer",
            "Payment coordination"
          ]
        }
      ]
    },
    "requirements": [
      {
        "name": "Title Deed",
        "mandatory": true
      },
      {
        "name": "Owner Emirates ID",
        "mandatory": true
      },
      {
        "name": "NOC from Developer",
        "mandatory": true
      }
    ],
    "deliverables": [
      {
        "name": "Buyer SPA",
        "format": "PDF"
      },
      {
        "name": "Transfer Documentation",
        "format": "Physical"
      },
      {
        "name": "Payment Confirmation",
        "format": "PDF"
      }
    ],
    "metrics": {
      "totalRequests": 320,
      "completedRequests": 285,
      "avgCompletionTime": 78,
      "satisfactionScore": 92,
      "revenue": 9600000
    },
    "status": "active"
  },
  {
    "code": "WC-SVC-004",
    "name": "Property Acquisition",
    "category": "Property Sales",
    "shortDescription": "Buyer representation and property search",
    "description": "Dedicated buyer representation service including property search, due diligence, and purchase support",
    "departmentCode": "SALES",
    "targetAudience": [
      "buyers",
      "investors"
    ],
    "pricing": {
      "type": "percentage",
      "percentage": 1
    },
    "workflow": {
      "estimatedDuration": "60 days",
      "stages": [
        {
          "order": 1,
          "name": "Requirement Analysis",
          "duration": "3 days",
          "actions": [
            "Needs assessment",
            "Budget planning"
          ]
        },
        {
          "order": 2,
          "name": "Property Search",
          "duration": "14 days",
          "actions": [
            "Market search",
            "Property matching"
          ]
        },
        {
          "order": 3,
          "name": "Shortlist Review",
          "duration": "7 days",
          "actions": [
            "Comparative analysis",
            "Recommendation"
          ]
        },
        {
          "order": 4,
          "name": "Viewings",
          "duration": "14 days",
          "actions": [
            "Property tours",
            "Expert guidance"
          ]
        },
        {
          "order": 5,
          "name": "Negotiation Support",
          "duration": "7 days",
          "actions": [
            "Offer preparation",
            "Price negotiation"
          ]
        },
        {
          "order": 6,
          "name": "Transaction Coordination",
          "duration": "14 days",
          "actions": [
            "Documentation",
            "Transfer support"
          ]
        }
      ]
    },
    "requirements": [
      {
        "name": "Emirates ID or Passport",
        "mandatory": true
      },
      {
        "name": "Budget Confirmation",
        "mandatory": true
      }
    ],
    "deliverables": [
      {
        "name": "Property Shortlist Report",
        "format": "PDF"
      },
      {
        "name": "Purchase Documentation",
        "format": "Physical/PDF"
      }
    ],
    "metrics": {
      "totalRequests": 450,
      "completedRequests": 398,
      "avgCompletionTime": 52,
      "satisfactionScore": 95,
      "revenue": 6750000
    },
    "status": "active"
  },
  {
    "code": "WC-SVC-005",
    "name": "Annual Lease Management",
    "category": "Property Rentals",
    "shortDescription": "Complete tenancy contract services",
    "description": "End-to-end annual lease management including Ejari registration, payment collection, and renewal handling",
    "departmentCode": "OPS",
    "targetAudience": [
      "landlords",
      "tenants"
    ],
    "pricing": {
      "type": "percentage",
      "percentage": 5
    },
    "workflow": {
      "estimatedDuration": "14 days",
      "stages": [
        {
          "order": 1,
          "name": "Tenant Screening",
          "duration": "3 days",
          "actions": [
            "Background check",
            "References"
          ]
        },
        {
          "order": 2,
          "name": "Document Collection",
          "duration": "2 days",
          "actions": [
            "ID copies",
            "Employment letter"
          ]
        },
        {
          "order": 3,
          "name": "Contract Drafting",
          "duration": "1 day",
          "actions": [
            "Terms finalization",
            "Contract prep"
          ]
        },
        {
          "order": 4,
          "name": "Signing",
          "duration": "1 day",
          "actions": [
            "Contract signing",
            "Cheque collection"
          ]
        },
        {
          "order": 5,
          "name": "Ejari Registration",
          "duration": "2 days",
          "actions": [
            "RERA registration",
            "Ejari certificate"
          ]
        },
        {
          "order": 6,
          "name": "Key Handover",
          "duration": "1 day",
          "actions": [
            "Move-in inspection",
            "Keys handover"
          ]
        }
      ]
    },
    "requirements": [
      {
        "name": "Tenant Emirates ID",
        "mandatory": true
      },
      {
        "name": "Employment Contract",
        "mandatory": true
      },
      {
        "name": "Landlord Emirates ID",
        "mandatory": true
      }
    ],
    "deliverables": [
      {
        "name": "Ejari Certificate",
        "format": "PDF"
      },
      {
        "name": "Tenancy Contract",
        "format": "Physical/PDF"
      },
      {
        "name": "Move-in Report",
        "format": "PDF"
      }
    ],
    "metrics": {
      "totalRequests": 850,
      "completedRequests": 820,
      "avgCompletionTime": 10,
      "satisfactionScore": 96,
      "revenue": 2125000
    },
    "status": "active"
  },
  {
    "code": "WC-SVC-006",
    "name": "Property Management",
    "category": "Property Management",
    "shortDescription": "Full property management services",
    "description": "Comprehensive property management including maintenance, tenant relations, and financial management",
    "departmentCode": "OPS",
    "targetAudience": [
      "landlords",
      "investors"
    ],
    "pricing": {
      "type": "percentage",
      "percentage": 8
    },
    "workflow": {
      "estimatedDuration": "Ongoing",
      "stages": [
        {
          "order": 1,
          "name": "Property Onboarding",
          "duration": "5 days",
          "actions": [
            "Inspection",
            "Documentation"
          ]
        },
        {
          "order": 2,
          "name": "Tenant Management",
          "duration": "Ongoing",
          "actions": [
            "Rent collection",
            "Communication"
          ]
        },
        {
          "order": 3,
          "name": "Maintenance Coordination",
          "duration": "As needed",
          "actions": [
            "Repairs",
            "Inspections"
          ]
        },
        {
          "order": 4,
          "name": "Financial Reporting",
          "duration": "Monthly",
          "actions": [
            "Statements",
            "Disbursements"
          ]
        }
      ]
    },
    "requirements": [
      {
        "name": "Property Title Deed",
        "mandatory": true
      },
      {
        "name": "Owner POA (if applicable)",
        "mandatory": false
      }
    ],
    "deliverables": [
      {
        "name": "Monthly Statements",
        "format": "PDF"
      },
      {
        "name": "Annual Property Report",
        "format": "PDF"
      }
    ],
    "metrics": {
      "totalRequests": 120,
      "completedRequests": 118,
      "avgCompletionTime": 0,
      "satisfactionScore": 94,
      "revenue": 1440000
    },
    "status": "active"
  },
  {
    "code": "WC-SVC-007",
    "name": "Mortgage Advisory",
    "category": "Financial Services",
    "shortDescription": "Expert mortgage and financing solutions",
    "description": "Comprehensive mortgage advisory including bank liaison, documentation, and approval tracking",
    "departmentCode": "FIN",
    "targetAudience": [
      "buyers",
      "investors"
    ],
    "pricing": {
      "type": "fixed",
      "amount": 15000
    },
    "workflow": {
      "estimatedDuration": "30 days",
      "stages": [
        {
          "order": 1,
          "name": "Financial Assessment",
          "duration": "2 days",
          "actions": [
            "Income review",
            "Eligibility check"
          ]
        },
        {
          "order": 2,
          "name": "Bank Selection",
          "duration": "3 days",
          "actions": [
            "Rate comparison",
            "Bank shortlist"
          ]
        },
        {
          "order": 3,
          "name": "Application",
          "duration": "5 days",
          "actions": [
            "Documentation",
            "Submission"
          ]
        },
        {
          "order": 4,
          "name": "Approval Process",
          "duration": "15 days",
          "actions": [
            "Bank processing",
            "Valuation"
          ]
        },
        {
          "order": 5,
          "name": "Disbursement",
          "duration": "5 days",
          "actions": [
            "Final approval",
            "Fund transfer"
          ]
        }
      ]
    },
    "requirements": [
      {
        "name": "Salary Certificate",
        "mandatory": true
      },
      {
        "name": "Bank Statements (6 months)",
        "mandatory": true
      },
      {
        "name": "Emirates ID",
        "mandatory": true
      }
    ],
    "deliverables": [
      {
        "name": "Pre-approval Letter",
        "format": "PDF"
      },
      {
        "name": "Final Offer Letter",
        "format": "PDF"
      },
      {
        "name": "Mortgage Documents",
        "format": "Physical"
      }
    ],
    "metrics": {
      "totalRequests": 280,
      "completedRequests": 245,
      "avgCompletionTime": 28,
      "satisfactionScore": 91,
      "revenue": 4200000
    },
    "status": "active"
  }
];
