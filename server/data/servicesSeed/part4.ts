// @ts-nocheck
export const SERVICES_SEED_PART_4 = [
  {
    "code": "WC-SVC-022",
    "name": "Developer Project Sales",
    "category": "Property Sales",
    "shortDescription": "Off-plan project sales",
    "description": "Exclusive sales representation for developer off-plan projects",
    "departmentCode": "SALES",
    "targetAudience": [
      "developers",
      "investors",
      "buyers"
    ],
    "pricing": {
      "type": "percentage",
      "percentage": 3
    },
    "workflow": {
      "estimatedDuration": "Project duration",
      "stages": [
        {
          "order": 1,
          "name": "Project Onboarding",
          "duration": "14 days",
          "actions": [
            "Training",
            "Marketing materials"
          ]
        },
        {
          "order": 2,
          "name": "Lead Generation",
          "duration": "Ongoing",
          "actions": [
            "Marketing",
            "Roadshows"
          ]
        },
        {
          "order": 3,
          "name": "Sales",
          "duration": "Ongoing",
          "actions": [
            "Presentations",
            "Bookings"
          ]
        },
        {
          "order": 4,
          "name": "After-sales",
          "duration": "Ongoing",
          "actions": [
            "Progress updates",
            "Handover coordination"
          ]
        }
      ]
    },
    "requirements": [
      {
        "name": "Exclusive Agreement",
        "mandatory": true
      },
      {
        "name": "Marketing Materials",
        "mandatory": true
      }
    ],
    "deliverables": [
      {
        "name": "Sales Reports",
        "format": "PDF"
      },
      {
        "name": "Marketing Analytics",
        "format": "PDF"
      }
    ],
    "metrics": {
      "totalRequests": 8,
      "completedRequests": 6,
      "avgCompletionTime": 0,
      "satisfactionScore": 94,
      "revenue": 12000000
    },
    "status": "active"
  },
  {
    "code": "WC-SVC-023",
    "name": "Property Insurance",
    "category": "Financial Services",
    "shortDescription": "Property insurance advisory",
    "description": "Insurance advisory and procurement for property owners and tenants",
    "departmentCode": "FIN",
    "targetAudience": [
      "landlords",
      "tenants",
      "buyers"
    ],
    "pricing": {
      "type": "percentage",
      "percentage": 5
    },
    "workflow": {
      "estimatedDuration": "7 days",
      "stages": [
        {
          "order": 1,
          "name": "Needs Assessment",
          "duration": "1 day",
          "actions": [
            "Coverage requirements",
            "Risk profile"
          ]
        },
        {
          "order": 2,
          "name": "Quote Comparison",
          "duration": "3 days",
          "actions": [
            "Multiple quotes",
            "Coverage analysis"
          ]
        },
        {
          "order": 3,
          "name": "Policy Procurement",
          "duration": "3 days",
          "actions": [
            "Documentation",
            "Payment",
            "Policy issuance"
          ]
        }
      ]
    },
    "requirements": [
      {
        "name": "Property Details",
        "mandatory": true
      },
      {
        "name": "Owner/Tenant ID",
        "mandatory": true
      }
    ],
    "deliverables": [
      {
        "name": "Insurance Policy",
        "format": "PDF"
      },
      {
        "name": "Coverage Summary",
        "format": "PDF"
      }
    ],
    "metrics": {
      "totalRequests": 320,
      "completedRequests": 310,
      "avgCompletionTime": 5,
      "satisfactionScore": 92,
      "revenue": 320000
    },
    "status": "active"
  },
  {
    "code": "WC-SVC-024",
    "name": "Will & Succession Planning",
    "category": "Legal & Compliance",
    "shortDescription": "Property inheritance services",
    "description": "DIFC Wills and succession planning for property owners",
    "departmentCode": "LEGAL",
    "targetAudience": [
      "landlords",
      "investors",
      "buyers"
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
          "name": "Consultation",
          "duration": "2 days",
          "actions": [
            "Asset review",
            "Beneficiary discussion"
          ]
        },
        {
          "order": 2,
          "name": "Will Drafting",
          "duration": "7 days",
          "actions": [
            "Legal drafting",
            "Review"
          ]
        },
        {
          "order": 3,
          "name": "DIFC Registration",
          "duration": "14 days",
          "actions": [
            "Submission",
            "Witnessing"
          ]
        },
        {
          "order": 4,
          "name": "Completion",
          "duration": "7 days",
          "actions": [
            "Registration confirmation",
            "Secure storage"
          ]
        }
      ]
    },
    "requirements": [
      {
        "name": "Property Title Deeds",
        "mandatory": true
      },
      {
        "name": "Passport",
        "mandatory": true
      },
      {
        "name": "Beneficiary Details",
        "mandatory": true
      }
    ],
    "deliverables": [
      {
        "name": "Registered Will",
        "format": "Physical"
      },
      {
        "name": "Registration Certificate",
        "format": "PDF"
      }
    ],
    "metrics": {
      "totalRequests": 75,
      "completedRequests": 72,
      "avgCompletionTime": 25,
      "satisfactionScore": 99,
      "revenue": 1125000
    },
    "status": "active"
  },
  {
    "code": "WC-SVC-025",
    "name": "Dispute Resolution",
    "category": "Legal & Compliance",
    "shortDescription": "Property dispute mediation",
    "description": "Mediation and dispute resolution services for landlord-tenant and buyer-seller conflicts",
    "departmentCode": "LEGAL",
    "targetAudience": [
      "landlords",
      "tenants",
      "buyers",
      "sellers"
    ],
    "pricing": {
      "type": "hourly",
      "amount": 1000
    },
    "workflow": {
      "estimatedDuration": "Variable",
      "stages": [
        {
          "order": 1,
          "name": "Case Assessment",
          "duration": "2 days",
          "actions": [
            "Document review",
            "Claim analysis"
          ]
        },
        {
          "order": 2,
          "name": "Mediation",
          "duration": "Variable",
          "actions": [
            "Negotiation",
            "Settlement attempts"
          ]
        },
        {
          "order": 3,
          "name": "Resolution",
          "duration": "Variable",
          "actions": [
            "Agreement drafting",
            "Execution"
          ]
        }
      ]
    },
    "requirements": [
      {
        "name": "Dispute Details",
        "mandatory": true
      },
      {
        "name": "Supporting Documents",
        "mandatory": true
      }
    ],
    "deliverables": [
      {
        "name": "Resolution Agreement",
        "format": "PDF"
      },
      {
        "name": "Case Summary",
        "format": "PDF"
      }
    ],
    "metrics": {
      "totalRequests": 45,
      "completedRequests": 38,
      "avgCompletionTime": 30,
      "satisfactionScore": 85,
      "revenue": 380000
    },
    "status": "active"
  },
  {
    "code": "WC-SVC-026",
    "name": "Market Intelligence Reports",
    "category": "Client Services",
    "shortDescription": "Custom market research",
    "description": "Tailored market intelligence reports for investors and developers",
    "departmentCode": "INTEL",
    "targetAudience": [
      "investors",
      "developers"
    ],
    "pricing": {
      "type": "fixed",
      "amount": 25000
    },
    "workflow": {
      "estimatedDuration": "21 days",
      "stages": [
        {
          "order": 1,
          "name": "Brief Definition",
          "duration": "2 days",
          "actions": [
            "Scope definition",
            "Data requirements"
          ]
        },
        {
          "order": 2,
          "name": "Data Collection",
          "duration": "7 days",
          "actions": [
            "Primary research",
            "Secondary research"
          ]
        },
        {
          "order": 3,
          "name": "Analysis",
          "duration": "7 days",
          "actions": [
            "Data analysis",
            "Trend identification"
          ]
        },
        {
          "order": 4,
          "name": "Report Delivery",
          "duration": "5 days",
          "actions": [
            "Report writing",
            "Presentation"
          ]
        }
      ]
    },
    "requirements": [
      {
        "name": "Research Brief",
        "mandatory": true
      },
      {
        "name": "Geographic Scope",
        "mandatory": true
      }
    ],
    "deliverables": [
      {
        "name": "Market Intelligence Report",
        "format": "PDF"
      },
      {
        "name": "Data Dashboard Access",
        "format": "Digital"
      },
      {
        "name": "Executive Presentation",
        "format": "PPT"
      }
    ],
    "metrics": {
      "totalRequests": 28,
      "completedRequests": 26,
      "avgCompletionTime": 18,
      "satisfactionScore": 96,
      "revenue": 700000
    },
    "status": "active"
  },
  {
    "code": "WC-SVC-027",
    "name": "Rent Collection",
    "category": "Property Management",
    "shortDescription": "Automated rent collection",
    "description": "Systematic rent collection and payment tracking for property owners",
    "departmentCode": "FIN",
    "targetAudience": [
      "landlords"
    ],
    "pricing": {
      "type": "percentage",
      "percentage": 3
    },
    "workflow": {
      "estimatedDuration": "Ongoing",
      "stages": [
        {
          "order": 1,
          "name": "Setup",
          "duration": "3 days",
          "actions": [
            "Payment schedule",
            "Tenant onboarding"
          ]
        },
        {
          "order": 2,
          "name": "Collection",
          "duration": "Monthly",
          "actions": [
            "Reminders",
            "Payment processing"
          ]
        },
        {
          "order": 3,
          "name": "Reporting",
          "duration": "Monthly",
          "actions": [
            "Statement generation",
            "Disbursement"
          ]
        }
      ]
    },
    "requirements": [
      {
        "name": "Tenancy Contract",
        "mandatory": true
      },
      {
        "name": "Bank Details",
        "mandatory": true
      }
    ],
    "deliverables": [
      {
        "name": "Monthly Statement",
        "format": "PDF"
      },
      {
        "name": "Annual Summary",
        "format": "PDF"
      }
    ],
    "metrics": {
      "totalRequests": 280,
      "completedRequests": 275,
      "avgCompletionTime": 0,
      "satisfactionScore": 94,
      "revenue": 504000
    },
    "status": "active"
  },
  {
    "code": "WC-SVC-028",
    "name": "Ejari Registration",
    "category": "Legal & Compliance",
    "shortDescription": "Official tenancy registration",
    "description": "Complete Ejari registration service for tenancy contracts",
    "departmentCode": "OPS",
    "targetAudience": [
      "landlords",
      "tenants"
    ],
    "pricing": {
      "type": "fixed",
      "amount": 500
    },
    "workflow": {
      "estimatedDuration": "2 days",
      "stages": [
        {
          "order": 1,
          "name": "Document Collection",
          "duration": "1 day",
          "actions": [
            "Contract copy",
            "ID copies"
          ]
        },
        {
          "order": 2,
          "name": "Registration",
          "duration": "1 day",
          "actions": [
            "RERA submission",
            "Certificate issuance"
          ]
        }
      ]
    },
    "requirements": [
      {
        "name": "Signed Tenancy Contract",
        "mandatory": true
      },
      {
        "name": "Landlord Emirates ID",
        "mandatory": true
      },
      {
        "name": "Tenant Emirates ID",
        "mandatory": true
      }
    ],
    "deliverables": [
      {
        "name": "Ejari Certificate",
        "format": "PDF"
      }
    ],
    "metrics": {
      "totalRequests": 1500,
      "completedRequests": 1490,
      "avgCompletionTime": 1,
      "satisfactionScore": 98,
      "revenue": 750000
    },
    "status": "active"
  }
];
