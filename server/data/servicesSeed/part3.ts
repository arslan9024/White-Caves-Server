// @ts-nocheck
export const SERVICES_SEED_PART_3 = [
  {
    "code": "WC-SVC-015",
    "name": "Rental Yield Analysis",
    "category": "Financial Services",
    "shortDescription": "Investment return calculations",
    "description": "Detailed rental yield and investment return analysis for property investment decisions",
    "departmentCode": "FIN",
    "targetAudience": [
      "investors",
      "landlords"
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
          "name": "Property Assessment",
          "duration": "1 day",
          "actions": [
            "Property details",
            "Location analysis"
          ]
        },
        {
          "order": 2,
          "name": "Market Research",
          "duration": "2 days",
          "actions": [
            "Rental comparisons",
            "Occupancy rates"
          ]
        },
        {
          "order": 3,
          "name": "Financial Modeling",
          "duration": "1 day",
          "actions": [
            "Yield calculation",
            "ROI projections"
          ]
        },
        {
          "order": 4,
          "name": "Report Delivery",
          "duration": "1 day",
          "actions": [
            "Report preparation",
            "Presentation"
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
        "name": "Purchase Price / Value",
        "mandatory": true
      }
    ],
    "deliverables": [
      {
        "name": "Yield Analysis Report",
        "format": "PDF"
      },
      {
        "name": "Investment Recommendation",
        "format": "PDF"
      }
    ],
    "metrics": {
      "totalRequests": 240,
      "completedRequests": 235,
      "avgCompletionTime": 4,
      "satisfactionScore": 93,
      "revenue": 960000
    },
    "status": "active"
  },
  {
    "code": "WC-SVC-016",
    "name": "Maintenance Coordination",
    "category": "Property Management",
    "shortDescription": "Property maintenance services",
    "description": "Complete maintenance coordination including contractor management and quality assurance",
    "departmentCode": "OPS",
    "targetAudience": [
      "landlords",
      "tenants"
    ],
    "pricing": {
      "type": "percentage",
      "percentage": 10
    },
    "workflow": {
      "estimatedDuration": "As needed",
      "stages": [
        {
          "order": 1,
          "name": "Request Logging",
          "duration": "1 hour",
          "actions": [
            "Issue recording",
            "Prioritization"
          ]
        },
        {
          "order": 2,
          "name": "Contractor Dispatch",
          "duration": "24 hours",
          "actions": [
            "Vendor selection",
            "Scheduling"
          ]
        },
        {
          "order": 3,
          "name": "Work Execution",
          "duration": "Variable",
          "actions": [
            "Supervision",
            "Quality check"
          ]
        },
        {
          "order": 4,
          "name": "Completion",
          "duration": "1 day",
          "actions": [
            "Final inspection",
            "Invoice processing"
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
        "name": "Issue Description",
        "mandatory": true
      }
    ],
    "deliverables": [
      {
        "name": "Work Completion Report",
        "format": "PDF"
      },
      {
        "name": "Invoice",
        "format": "PDF"
      }
    ],
    "metrics": {
      "totalRequests": 1200,
      "completedRequests": 1150,
      "avgCompletionTime": 3,
      "satisfactionScore": 91,
      "revenue": 360000
    },
    "status": "active"
  },
  {
    "code": "WC-SVC-017",
    "name": "Interior Design Consultation",
    "category": "Client Services",
    "shortDescription": "Property interior design services",
    "description": "Professional interior design consultation for property staging or renovation",
    "departmentCode": "MKT",
    "targetAudience": [
      "buyers",
      "landlords",
      "sellers"
    ],
    "pricing": {
      "type": "fixed",
      "amount": 10000
    },
    "workflow": {
      "estimatedDuration": "21 days",
      "stages": [
        {
          "order": 1,
          "name": "Initial Consultation",
          "duration": "2 days",
          "actions": [
            "Style assessment",
            "Budget planning"
          ]
        },
        {
          "order": 2,
          "name": "Concept Development",
          "duration": "5 days",
          "actions": [
            "Mood boards",
            "3D visualization"
          ]
        },
        {
          "order": 3,
          "name": "Sourcing",
          "duration": "7 days",
          "actions": [
            "Furniture selection",
            "Vendor coordination"
          ]
        },
        {
          "order": 4,
          "name": "Implementation",
          "duration": "7 days",
          "actions": [
            "Installation",
            "Styling"
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
        "name": "Design Brief",
        "mandatory": true
      }
    ],
    "deliverables": [
      {
        "name": "Design Concept",
        "format": "PDF"
      },
      {
        "name": "3D Renders",
        "format": "Digital"
      },
      {
        "name": "Shopping List",
        "format": "PDF"
      }
    ],
    "metrics": {
      "totalRequests": 85,
      "completedRequests": 80,
      "avgCompletionTime": 18,
      "satisfactionScore": 96,
      "revenue": 850000
    },
    "status": "active"
  },
  {
    "code": "WC-SVC-018",
    "name": "Relocation Assistance",
    "category": "Client Services",
    "shortDescription": "Complete relocation services",
    "description": "End-to-end relocation assistance including moving, utility setup, and area orientation",
    "departmentCode": "OPS",
    "targetAudience": [
      "buyers",
      "tenants"
    ],
    "pricing": {
      "type": "fixed",
      "amount": 5000
    },
    "workflow": {
      "estimatedDuration": "14 days",
      "stages": [
        {
          "order": 1,
          "name": "Planning",
          "duration": "2 days",
          "actions": [
            "Moving assessment",
            "Schedule planning"
          ]
        },
        {
          "order": 2,
          "name": "Utility Setup",
          "duration": "5 days",
          "actions": [
            "DEWA",
            "Internet",
            "Cooling"
          ]
        },
        {
          "order": 3,
          "name": "Moving Day",
          "duration": "1 day",
          "actions": [
            "Coordination",
            "Supervision"
          ]
        },
        {
          "order": 4,
          "name": "Area Orientation",
          "duration": "2 days",
          "actions": [
            "Neighborhood tour",
            "Essential services"
          ]
        }
      ]
    },
    "requirements": [
      {
        "name": "Tenancy Contract / Title Deed",
        "mandatory": true
      },
      {
        "name": "Emirates ID",
        "mandatory": true
      }
    ],
    "deliverables": [
      {
        "name": "Utility Confirmation",
        "format": "PDF"
      },
      {
        "name": "Area Guide",
        "format": "PDF"
      },
      {
        "name": "Welcome Pack",
        "format": "Physical"
      }
    ],
    "metrics": {
      "totalRequests": 180,
      "completedRequests": 175,
      "avgCompletionTime": 12,
      "satisfactionScore": 94,
      "revenue": 900000
    },
    "status": "active"
  },
  {
    "code": "WC-SVC-019",
    "name": "Holiday Home Management",
    "category": "Property Rentals",
    "shortDescription": "Short-term rental management",
    "description": "Complete holiday home management including DTCM licensing, guest management, and revenue optimization",
    "departmentCode": "OPS",
    "targetAudience": [
      "landlords",
      "investors"
    ],
    "pricing": {
      "type": "percentage",
      "percentage": 20
    },
    "workflow": {
      "estimatedDuration": "Ongoing",
      "stages": [
        {
          "order": 1,
          "name": "DTCM Licensing",
          "duration": "14 days",
          "actions": [
            "Application",
            "Approval"
          ]
        },
        {
          "order": 2,
          "name": "Platform Setup",
          "duration": "7 days",
          "actions": [
            "Airbnb",
            "Booking.com",
            "Photos"
          ]
        },
        {
          "order": 3,
          "name": "Operations",
          "duration": "Ongoing",
          "actions": [
            "Guest management",
            "Cleaning",
            "Maintenance"
          ]
        },
        {
          "order": 4,
          "name": "Reporting",
          "duration": "Monthly",
          "actions": [
            "Revenue report",
            "Performance analysis"
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
        "name": "Furnished Property",
        "mandatory": true
      }
    ],
    "deliverables": [
      {
        "name": "DTCM License",
        "format": "Physical"
      },
      {
        "name": "Monthly Revenue Report",
        "format": "PDF"
      },
      {
        "name": "Guest Reviews Summary",
        "format": "PDF"
      }
    ],
    "metrics": {
      "totalRequests": 65,
      "completedRequests": 62,
      "avgCompletionTime": 0,
      "satisfactionScore": 92,
      "revenue": 780000
    },
    "status": "active"
  },
  {
    "code": "WC-SVC-020",
    "name": "Commercial Leasing",
    "category": "Property Rentals",
    "shortDescription": "Commercial property leasing services",
    "description": "Professional commercial property leasing including office, retail, and warehouse spaces",
    "departmentCode": "SALES",
    "targetAudience": [
      "landlords",
      "tenants",
      "investors"
    ],
    "pricing": {
      "type": "percentage",
      "percentage": 5
    },
    "workflow": {
      "estimatedDuration": "30 days",
      "stages": [
        {
          "order": 1,
          "name": "Requirements Analysis",
          "duration": "3 days",
          "actions": [
            "Space needs",
            "Budget assessment"
          ]
        },
        {
          "order": 2,
          "name": "Property Search",
          "duration": "7 days",
          "actions": [
            "Market search",
            "Shortlisting"
          ]
        },
        {
          "order": 3,
          "name": "Viewings & Negotiation",
          "duration": "10 days",
          "actions": [
            "Site visits",
            "Terms negotiation"
          ]
        },
        {
          "order": 4,
          "name": "Contract & Handover",
          "duration": "10 days",
          "actions": [
            "Legal review",
            "Contract signing",
            "Fit-out"
          ]
        }
      ]
    },
    "requirements": [
      {
        "name": "Trade License",
        "mandatory": true
      },
      {
        "name": "Company Emirates ID",
        "mandatory": true
      }
    ],
    "deliverables": [
      {
        "name": "Commercial Lease Agreement",
        "format": "Physical"
      },
      {
        "name": "Ejari Certificate",
        "format": "PDF"
      }
    ],
    "metrics": {
      "totalRequests": 140,
      "completedRequests": 125,
      "avgCompletionTime": 25,
      "satisfactionScore": 90,
      "revenue": 1750000
    },
    "status": "active"
  },
  {
    "code": "WC-SVC-021",
    "name": "Portfolio Management",
    "category": "Financial Services",
    "shortDescription": "Multi-property portfolio services",
    "description": "Comprehensive portfolio management for investors with multiple properties",
    "departmentCode": "FIN",
    "targetAudience": [
      "investors"
    ],
    "pricing": {
      "type": "percentage",
      "percentage": 1
    },
    "workflow": {
      "estimatedDuration": "Ongoing",
      "stages": [
        {
          "order": 1,
          "name": "Portfolio Assessment",
          "duration": "7 days",
          "actions": [
            "Asset valuation",
            "Performance review"
          ]
        },
        {
          "order": 2,
          "name": "Strategy Development",
          "duration": "5 days",
          "actions": [
            "Optimization plan",
            "Risk assessment"
          ]
        },
        {
          "order": 3,
          "name": "Implementation",
          "duration": "Ongoing",
          "actions": [
            "Buy/Sell recommendations",
            "Rebalancing"
          ]
        },
        {
          "order": 4,
          "name": "Reporting",
          "duration": "Quarterly",
          "actions": [
            "Performance reports",
            "Market updates"
          ]
        }
      ]
    },
    "requirements": [
      {
        "name": "Portfolio Details",
        "mandatory": true
      },
      {
        "name": "Investment Goals",
        "mandatory": true
      }
    ],
    "deliverables": [
      {
        "name": "Portfolio Strategy",
        "format": "PDF"
      },
      {
        "name": "Quarterly Reports",
        "format": "PDF"
      },
      {
        "name": "Tax Documentation",
        "format": "PDF"
      }
    ],
    "metrics": {
      "totalRequests": 35,
      "completedRequests": 34,
      "avgCompletionTime": 0,
      "satisfactionScore": 97,
      "revenue": 850000
    },
    "status": "active"
  }
];
