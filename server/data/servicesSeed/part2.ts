// @ts-nocheck
export const SERVICES_SEED_PART_2 = [
  {
    "code": "WC-SVC-008",
    "name": "Legal Conveyancing",
    "category": "Legal & Compliance",
    "shortDescription": "Property legal services and compliance",
    "description": "Full legal conveyancing including contract review, DLD registration, and compliance verification",
    "departmentCode": "LEGAL",
    "targetAudience": [
      "buyers",
      "sellers",
      "landlords",
      "tenants"
    ],
    "pricing": {
      "type": "fixed",
      "amount": 12000
    },
    "workflow": {
      "estimatedDuration": "21 days",
      "stages": [
        {
          "order": 1,
          "name": "Document Review",
          "duration": "3 days",
          "actions": [
            "Contract analysis",
            "Risk assessment"
          ]
        },
        {
          "order": 2,
          "name": "Due Diligence",
          "duration": "5 days",
          "actions": [
            "Title search",
            "Lien verification"
          ]
        },
        {
          "order": 3,
          "name": "Contract Finalization",
          "duration": "5 days",
          "actions": [
            "Amendments",
            "Final draft"
          ]
        },
        {
          "order": 4,
          "name": "DLD Registration",
          "duration": "5 days",
          "actions": [
            "Fee payment",
            "Registration"
          ]
        },
        {
          "order": 5,
          "name": "Completion",
          "duration": "3 days",
          "actions": [
            "Title issuance",
            "File closure"
          ]
        }
      ]
    },
    "requirements": [
      {
        "name": "Signed SPA",
        "mandatory": true
      },
      {
        "name": "Party Identification",
        "mandatory": true
      },
      {
        "name": "Payment Receipts",
        "mandatory": true
      }
    ],
    "deliverables": [
      {
        "name": "Legal Opinion",
        "format": "PDF"
      },
      {
        "name": "Registered Title Deed",
        "format": "Physical"
      },
      {
        "name": "Closing Statement",
        "format": "PDF"
      }
    ],
    "metrics": {
      "totalRequests": 420,
      "completedRequests": 405,
      "avgCompletionTime": 18,
      "satisfactionScore": 97,
      "revenue": 5040000
    },
    "status": "active"
  },
  {
    "code": "WC-SVC-009",
    "name": "Property Marketing",
    "category": "Marketing",
    "shortDescription": "Premium property marketing campaigns",
    "description": "High-end property marketing including photography, virtual tours, and multi-channel campaigns",
    "departmentCode": "MKT",
    "targetAudience": [
      "sellers",
      "landlords",
      "developers"
    ],
    "pricing": {
      "type": "fixed",
      "amount": 8000
    },
    "workflow": {
      "estimatedDuration": "14 days",
      "stages": [
        {
          "order": 1,
          "name": "Photography Session",
          "duration": "2 days",
          "actions": [
            "Professional shoot",
            "Drone footage"
          ]
        },
        {
          "order": 2,
          "name": "Content Creation",
          "duration": "4 days",
          "actions": [
            "Copywriting",
            "Video editing"
          ]
        },
        {
          "order": 3,
          "name": "Virtual Tour",
          "duration": "3 days",
          "actions": [
            "3D scanning",
            "Tour creation"
          ]
        },
        {
          "order": 4,
          "name": "Campaign Launch",
          "duration": "3 days",
          "actions": [
            "Portal listing",
            "Social media"
          ]
        },
        {
          "order": 5,
          "name": "Performance Tracking",
          "duration": "Ongoing",
          "actions": [
            "Analytics",
            "Optimization"
          ]
        }
      ]
    },
    "requirements": [
      {
        "name": "Property Access",
        "mandatory": true
      },
      {
        "name": "Marketing Authorization",
        "mandatory": true
      }
    ],
    "deliverables": [
      {
        "name": "Professional Photos",
        "format": "Digital"
      },
      {
        "name": "Virtual Tour Link",
        "format": "URL"
      },
      {
        "name": "Marketing Report",
        "format": "PDF"
      }
    ],
    "metrics": {
      "totalRequests": 350,
      "completedRequests": 340,
      "avgCompletionTime": 12,
      "satisfactionScore": 93,
      "revenue": 2800000
    },
    "status": "active"
  },
  {
    "code": "WC-SVC-010",
    "name": "Property Valuation",
    "category": "Client Services",
    "shortDescription": "Professional property valuation",
    "description": "RERA-certified property valuation for sale, mortgage, or insurance purposes",
    "departmentCode": "OPS",
    "targetAudience": [
      "sellers",
      "landlords",
      "buyers",
      "investors"
    ],
    "pricing": {
      "type": "fixed",
      "amount": 3500
    },
    "workflow": {
      "estimatedDuration": "5 days",
      "stages": [
        {
          "order": 1,
          "name": "Site Inspection",
          "duration": "1 day",
          "actions": [
            "Property visit",
            "Measurement"
          ]
        },
        {
          "order": 2,
          "name": "Market Analysis",
          "duration": "2 days",
          "actions": [
            "Comparable sales",
            "Market trends"
          ]
        },
        {
          "order": 3,
          "name": "Report Preparation",
          "duration": "2 days",
          "actions": [
            "Valuation calculation",
            "Report writing"
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
        "name": "Property Access",
        "mandatory": true
      }
    ],
    "deliverables": [
      {
        "name": "Valuation Report",
        "format": "PDF"
      },
      {
        "name": "RERA Certificate",
        "format": "PDF"
      }
    ],
    "metrics": {
      "totalRequests": 680,
      "completedRequests": 670,
      "avgCompletionTime": 4,
      "satisfactionScore": 96,
      "revenue": 2380000
    },
    "status": "active"
  },
  {
    "code": "WC-SVC-011",
    "name": "Golden Visa Assistance",
    "category": "Client Services",
    "shortDescription": "UAE Golden Visa property investment route",
    "description": "Complete assistance for obtaining UAE Golden Visa through property investment of AED 2M+",
    "departmentCode": "SALES",
    "targetAudience": [
      "investors",
      "buyers"
    ],
    "pricing": {
      "type": "fixed",
      "amount": 20000
    },
    "workflow": {
      "estimatedDuration": "45 days",
      "stages": [
        {
          "order": 1,
          "name": "Eligibility Assessment",
          "duration": "2 days",
          "actions": [
            "Investment review",
            "Criteria check"
          ]
        },
        {
          "order": 2,
          "name": "Document Preparation",
          "duration": "7 days",
          "actions": [
            "Document collection",
            "Translation"
          ]
        },
        {
          "order": 3,
          "name": "Application Submission",
          "duration": "3 days",
          "actions": [
            "Online application",
            "Fee payment"
          ]
        },
        {
          "order": 4,
          "name": "ICP Processing",
          "duration": "21 days",
          "actions": [
            "Government review",
            "Approval wait"
          ]
        },
        {
          "order": 5,
          "name": "Visa Stamping",
          "duration": "7 days",
          "actions": [
            "Medical test",
            "Emirates ID"
          ]
        }
      ]
    },
    "requirements": [
      {
        "name": "Property Title Deed (2M+)",
        "mandatory": true
      },
      {
        "name": "Passport",
        "mandatory": true
      },
      {
        "name": "Photos",
        "mandatory": true
      }
    ],
    "deliverables": [
      {
        "name": "Golden Visa",
        "format": "Physical"
      },
      {
        "name": "Emirates ID",
        "format": "Physical"
      },
      {
        "name": "Process Completion Report",
        "format": "PDF"
      }
    ],
    "metrics": {
      "totalRequests": 95,
      "completedRequests": 88,
      "avgCompletionTime": 40,
      "satisfactionScore": 99,
      "revenue": 1900000
    },
    "status": "active"
  },
  {
    "code": "WC-SVC-012",
    "name": "Snagging & Handover",
    "category": "Property Management",
    "shortDescription": "New property inspection services",
    "description": "Professional snagging inspection and handover coordination for new properties",
    "departmentCode": "OPS",
    "targetAudience": [
      "buyers",
      "investors"
    ],
    "pricing": {
      "type": "fixed",
      "amount": 2500
    },
    "workflow": {
      "estimatedDuration": "7 days",
      "stages": [
        {
          "order": 1,
          "name": "Pre-Inspection",
          "duration": "1 day",
          "actions": [
            "Schedule coordination",
            "Checklist prep"
          ]
        },
        {
          "order": 2,
          "name": "Snagging Inspection",
          "duration": "1 day",
          "actions": [
            "Full inspection",
            "Issue logging"
          ]
        },
        {
          "order": 3,
          "name": "Report Generation",
          "duration": "2 days",
          "actions": [
            "Photo documentation",
            "Report creation"
          ]
        },
        {
          "order": 4,
          "name": "Developer Follow-up",
          "duration": "3 days",
          "actions": [
            "Issue submission",
            "Resolution tracking"
          ]
        }
      ]
    },
    "requirements": [
      {
        "name": "Handover Appointment",
        "mandatory": true
      },
      {
        "name": "Property Access",
        "mandatory": true
      }
    ],
    "deliverables": [
      {
        "name": "Snagging Report",
        "format": "PDF"
      },
      {
        "name": "Photo Documentation",
        "format": "Digital"
      },
      {
        "name": "Resolution Tracker",
        "format": "PDF"
      }
    ],
    "metrics": {
      "totalRequests": 220,
      "completedRequests": 215,
      "avgCompletionTime": 5,
      "satisfactionScore": 95,
      "revenue": 550000
    },
    "status": "active"
  },
  {
    "code": "WC-SVC-013",
    "name": "Tenant Screening",
    "category": "Property Rentals",
    "shortDescription": "Comprehensive tenant verification",
    "description": "Thorough tenant screening including background checks, employment verification, and reference checks",
    "departmentCode": "OPS",
    "targetAudience": [
      "landlords"
    ],
    "pricing": {
      "type": "fixed",
      "amount": 1500
    },
    "workflow": {
      "estimatedDuration": "3 days",
      "stages": [
        {
          "order": 1,
          "name": "Document Collection",
          "duration": "1 day",
          "actions": [
            "ID collection",
            "Employment docs"
          ]
        },
        {
          "order": 2,
          "name": "Verification",
          "duration": "1 day",
          "actions": [
            "Employment check",
            "Reference calls"
          ]
        },
        {
          "order": 3,
          "name": "Report",
          "duration": "1 day",
          "actions": [
            "Risk assessment",
            "Recommendation"
          ]
        }
      ]
    },
    "requirements": [
      {
        "name": "Applicant Emirates ID",
        "mandatory": true
      },
      {
        "name": "Employment Letter",
        "mandatory": true
      }
    ],
    "deliverables": [
      {
        "name": "Screening Report",
        "format": "PDF"
      },
      {
        "name": "Risk Assessment",
        "format": "PDF"
      }
    ],
    "metrics": {
      "totalRequests": 450,
      "completedRequests": 445,
      "avgCompletionTime": 2,
      "satisfactionScore": 94,
      "revenue": 675000
    },
    "status": "active"
  },
  {
    "code": "WC-SVC-014",
    "name": "KYC & AML Compliance",
    "category": "Legal & Compliance",
    "shortDescription": "Regulatory compliance verification",
    "description": "Complete KYC and AML compliance services as per UAE Central Bank and RERA requirements",
    "departmentCode": "COMP",
    "targetAudience": [
      "buyers",
      "sellers",
      "investors",
      "all"
    ],
    "pricing": {
      "type": "fixed",
      "amount": 5000
    },
    "workflow": {
      "estimatedDuration": "5 days",
      "stages": [
        {
          "order": 1,
          "name": "Document Collection",
          "duration": "1 day",
          "actions": [
            "ID verification",
            "Address proof"
          ]
        },
        {
          "order": 2,
          "name": "Background Screening",
          "duration": "2 days",
          "actions": [
            "PEP check",
            "Sanctions screening"
          ]
        },
        {
          "order": 3,
          "name": "Source of Funds",
          "duration": "1 day",
          "actions": [
            "Fund verification",
            "Bank confirmation"
          ]
        },
        {
          "order": 4,
          "name": "Compliance Report",
          "duration": "1 day",
          "actions": [
            "Risk rating",
            "Clearance issuance"
          ]
        }
      ]
    },
    "requirements": [
      {
        "name": "Emirates ID / Passport",
        "mandatory": true
      },
      {
        "name": "Bank Statements",
        "mandatory": true
      },
      {
        "name": "Source of Funds Declaration",
        "mandatory": true
      }
    ],
    "deliverables": [
      {
        "name": "KYC Report",
        "format": "PDF"
      },
      {
        "name": "AML Clearance",
        "format": "PDF"
      },
      {
        "name": "Risk Rating Certificate",
        "format": "PDF"
      }
    ],
    "metrics": {
      "totalRequests": 380,
      "completedRequests": 375,
      "avgCompletionTime": 4,
      "satisfactionScore": 98,
      "revenue": 1900000
    },
    "status": "active"
  }
];
