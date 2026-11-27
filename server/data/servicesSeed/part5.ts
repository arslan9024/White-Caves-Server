// @ts-nocheck
export const SERVICES_SEED_PART_5 = [
  {
    "code": "WC-SVC-029",
    "name": "Property Photography",
    "category": "Marketing",
    "shortDescription": "Professional property photography",
    "description": "High-quality professional photography and videography for property listings",
    "departmentCode": "MKT",
    "targetAudience": [
      "sellers",
      "landlords"
    ],
    "pricing": {
      "type": "fixed",
      "amount": 2500
    },
    "workflow": {
      "estimatedDuration": "3 days",
      "stages": [
        {
          "order": 1,
          "name": "Scheduling",
          "duration": "1 day",
          "actions": [
            "Appointment booking",
            "Preparation tips"
          ]
        },
        {
          "order": 2,
          "name": "Photo Shoot",
          "duration": "1 day",
          "actions": [
            "Interior photos",
            "Exterior photos",
            "Drone shots"
          ]
        },
        {
          "order": 3,
          "name": "Post-processing",
          "duration": "1 day",
          "actions": [
            "Editing",
            "Delivery"
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
        "name": "Prepared Property",
        "mandatory": false
      }
    ],
    "deliverables": [
      {
        "name": "HD Photos (20+)",
        "format": "Digital"
      },
      {
        "name": "Drone Footage",
        "format": "Video"
      },
      {
        "name": "Floor Plan",
        "format": "PDF"
      }
    ],
    "metrics": {
      "totalRequests": 480,
      "completedRequests": 475,
      "avgCompletionTime": 2,
      "satisfactionScore": 95,
      "revenue": 1200000
    },
    "status": "active"
  },
  {
    "code": "WC-SVC-030",
    "name": "Virtual Tour Creation",
    "category": "Marketing",
    "shortDescription": "3D virtual property tours",
    "description": "Immersive 3D virtual tours using Matterport technology",
    "departmentCode": "MKT",
    "targetAudience": [
      "sellers",
      "landlords",
      "developers"
    ],
    "pricing": {
      "type": "fixed",
      "amount": 4000
    },
    "workflow": {
      "estimatedDuration": "5 days",
      "stages": [
        {
          "order": 1,
          "name": "3D Scanning",
          "duration": "1 day",
          "actions": [
            "Property scan",
            "Data capture"
          ]
        },
        {
          "order": 2,
          "name": "Processing",
          "duration": "2 days",
          "actions": [
            "Cloud processing",
            "Model creation"
          ]
        },
        {
          "order": 3,
          "name": "Enhancement",
          "duration": "2 days",
          "actions": [
            "Hotspots",
            "Information tags",
            "Branding"
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
        "name": "Staged Property",
        "mandatory": false
      }
    ],
    "deliverables": [
      {
        "name": "Matterport Tour Link",
        "format": "URL"
      },
      {
        "name": "Embedded Player",
        "format": "HTML"
      },
      {
        "name": "Floor Plan",
        "format": "PDF"
      }
    ],
    "metrics": {
      "totalRequests": 180,
      "completedRequests": 175,
      "avgCompletionTime": 4,
      "satisfactionScore": 97,
      "revenue": 720000
    },
    "status": "active"
  },
  {
    "code": "WC-SVC-031",
    "name": "Social Media Marketing",
    "category": "Marketing",
    "shortDescription": "Property social media campaigns",
    "description": "Targeted social media marketing campaigns for property promotion",
    "departmentCode": "MKT",
    "targetAudience": [
      "sellers",
      "landlords",
      "developers"
    ],
    "pricing": {
      "type": "fixed",
      "amount": 6000
    },
    "workflow": {
      "estimatedDuration": "30 days",
      "stages": [
        {
          "order": 1,
          "name": "Strategy",
          "duration": "3 days",
          "actions": [
            "Target audience",
            "Content plan"
          ]
        },
        {
          "order": 2,
          "name": "Content Creation",
          "duration": "5 days",
          "actions": [
            "Graphics",
            "Video content"
          ]
        },
        {
          "order": 3,
          "name": "Campaign Launch",
          "duration": "7 days",
          "actions": [
            "Ads setup",
            "Initial optimization"
          ]
        },
        {
          "order": 4,
          "name": "Optimization",
          "duration": "15 days",
          "actions": [
            "A/B testing",
            "Performance tracking"
          ]
        }
      ]
    },
    "requirements": [
      {
        "name": "Property Photos",
        "mandatory": true
      },
      {
        "name": "Marketing Budget",
        "mandatory": true
      }
    ],
    "deliverables": [
      {
        "name": "Campaign Report",
        "format": "PDF"
      },
      {
        "name": "Lead Report",
        "format": "Excel"
      }
    ],
    "metrics": {
      "totalRequests": 120,
      "completedRequests": 115,
      "avgCompletionTime": 28,
      "satisfactionScore": 88,
      "revenue": 720000
    },
    "status": "active"
  },
  {
    "code": "WC-SVC-032",
    "name": "Move-in/Move-out Inspection",
    "category": "Property Management",
    "shortDescription": "Property condition reports",
    "description": "Detailed property inspection reports for move-in and move-out",
    "departmentCode": "OPS",
    "targetAudience": [
      "landlords",
      "tenants"
    ],
    "pricing": {
      "type": "fixed",
      "amount": 800
    },
    "workflow": {
      "estimatedDuration": "2 days",
      "stages": [
        {
          "order": 1,
          "name": "Inspection",
          "duration": "1 day",
          "actions": [
            "Full property check",
            "Photo documentation"
          ]
        },
        {
          "order": 2,
          "name": "Report",
          "duration": "1 day",
          "actions": [
            "Condition report",
            "Recommendations"
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
        "name": "Both Parties Present",
        "mandatory": false
      }
    ],
    "deliverables": [
      {
        "name": "Inspection Report",
        "format": "PDF"
      },
      {
        "name": "Photo Documentation",
        "format": "Digital"
      }
    ],
    "metrics": {
      "totalRequests": 650,
      "completedRequests": 645,
      "avgCompletionTime": 1,
      "satisfactionScore": 94,
      "revenue": 520000
    },
    "status": "active"
  },
  {
    "code": "WC-SVC-033",
    "name": "Lease Renewal",
    "category": "Property Rentals",
    "shortDescription": "Tenancy renewal services",
    "description": "Complete lease renewal service including negotiation and Ejari update",
    "departmentCode": "OPS",
    "targetAudience": [
      "landlords",
      "tenants"
    ],
    "pricing": {
      "type": "fixed",
      "amount": 1500
    },
    "workflow": {
      "estimatedDuration": "14 days",
      "stages": [
        {
          "order": 1,
          "name": "Renewal Notice",
          "duration": "3 days",
          "actions": [
            "Tenant communication",
            "Terms proposal"
          ]
        },
        {
          "order": 2,
          "name": "Negotiation",
          "duration": "7 days",
          "actions": [
            "Rent discussion",
            "Terms finalization"
          ]
        },
        {
          "order": 3,
          "name": "Documentation",
          "duration": "4 days",
          "actions": [
            "Addendum signing",
            "Ejari update"
          ]
        }
      ]
    },
    "requirements": [
      {
        "name": "Current Tenancy Contract",
        "mandatory": true
      },
      {
        "name": "Renewal Intent",
        "mandatory": true
      }
    ],
    "deliverables": [
      {
        "name": "Renewal Addendum",
        "format": "PDF"
      },
      {
        "name": "Updated Ejari",
        "format": "PDF"
      }
    ],
    "metrics": {
      "totalRequests": 420,
      "completedRequests": 410,
      "avgCompletionTime": 10,
      "satisfactionScore": 93,
      "revenue": 630000
    },
    "status": "active"
  },
  {
    "code": "WC-SVC-034",
    "name": "Eviction Support",
    "category": "Legal & Compliance",
    "shortDescription": "Legal eviction assistance",
    "description": "Legal support for property eviction cases through RERA and RDC",
    "departmentCode": "LEGAL",
    "targetAudience": [
      "landlords"
    ],
    "pricing": {
      "type": "fixed",
      "amount": 8000
    },
    "workflow": {
      "estimatedDuration": "90 days",
      "stages": [
        {
          "order": 1,
          "name": "Case Assessment",
          "duration": "5 days",
          "actions": [
            "Legal review",
            "Evidence collection"
          ]
        },
        {
          "order": 2,
          "name": "Notice Period",
          "duration": "30 days",
          "actions": [
            "Legal notice",
            "Documentation"
          ]
        },
        {
          "order": 3,
          "name": "RDC Filing",
          "duration": "14 days",
          "actions": [
            "Case filing",
            "Hearing scheduling"
          ]
        },
        {
          "order": 4,
          "name": "Resolution",
          "duration": "41 days",
          "actions": [
            "Court proceedings",
            "Execution"
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
        "name": "Evidence of Breach",
        "mandatory": true
      }
    ],
    "deliverables": [
      {
        "name": "Legal Opinion",
        "format": "PDF"
      },
      {
        "name": "Court Order",
        "format": "Physical"
      },
      {
        "name": "Eviction Execution",
        "format": "Physical"
      }
    ],
    "metrics": {
      "totalRequests": 25,
      "completedRequests": 20,
      "avgCompletionTime": 75,
      "satisfactionScore": 82,
      "revenue": 200000
    },
    "status": "active"
  },
  {
    "code": "WC-SVC-035",
    "name": "API Integration Services",
    "category": "Technology",
    "shortDescription": "Property tech integration",
    "description": "Custom API integrations for property portals and management systems",
    "departmentCode": "TECH",
    "targetAudience": [
      "developers",
      "investors"
    ],
    "pricing": {
      "type": "custom",
      "details": "Quote-based"
    },
    "workflow": {
      "estimatedDuration": "30-90 days",
      "stages": [
        {
          "order": 1,
          "name": "Requirements",
          "duration": "5 days",
          "actions": [
            "Scope definition",
            "Technical assessment"
          ]
        },
        {
          "order": 2,
          "name": "Development",
          "duration": "Variable",
          "actions": [
            "API development",
            "Integration"
          ]
        },
        {
          "order": 3,
          "name": "Testing",
          "duration": "7 days",
          "actions": [
            "QA testing",
            "UAT"
          ]
        },
        {
          "order": 4,
          "name": "Deployment",
          "duration": "3 days",
          "actions": [
            "Go-live",
            "Documentation"
          ]
        }
      ]
    },
    "requirements": [
      {
        "name": "Technical Requirements",
        "mandatory": true
      },
      {
        "name": "API Access",
        "mandatory": true
      }
    ],
    "deliverables": [
      {
        "name": "API Documentation",
        "format": "Digital"
      },
      {
        "name": "Integration Guide",
        "format": "PDF"
      },
      {
        "name": "Support SLA",
        "format": "PDF"
      }
    ],
    "metrics": {
      "totalRequests": 12,
      "completedRequests": 10,
      "avgCompletionTime": 45,
      "satisfactionScore": 94,
      "revenue": 600000
    },
    "status": "active"
  }
];
