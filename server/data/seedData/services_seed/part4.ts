// @ts-nocheck
export const SERVICES_SEED_PART_4 = [
  {
    "name": "Interior Design & Staging",
    "code": "VAS-001",
    "category": "Value-Added Services",
    "tier": "essential",
    "description": "Luxury interior design for sales enhancement or personalization",
    "shortDescription": "Interior design and staging",
    "icon": "Palette",
    "departmentCode": "MKT",
    "assistantCode": "STELLA",
    "workflow": {
      "stages": [
        {
          "order": 1,
          "name": "Consultation",
          "description": "Design brief",
          "duration": "1-2 days",
          "actions": [
            "Style assessment",
            "Budget setting",
            "Scope definition"
          ]
        },
        {
          "order": 2,
          "name": "Design",
          "description": "Concept development",
          "duration": "5-10 days",
          "actions": [
            "Concept creation",
            "3D renders",
            "Material selection"
          ]
        },
        {
          "order": 3,
          "name": "Execution",
          "description": "Implementation",
          "duration": "2-8 weeks",
          "actions": [
            "Procurement",
            "Installation",
            "Styling"
          ]
        }
      ],
      "estimatedDuration": "3-10 weeks",
      "sla": "48 hours response"
    },
    "pricing": {
      "type": "percentage",
      "percentage": 15,
      "details": "10-20% of project cost"
    },
    "targetAudience": [
      "sellers",
      "new_owners",
      "landlords"
    ],
    "metrics": {
      "totalRequests": 186,
      "completedRequests": 168,
      "avgCompletionTime": 42,
      "satisfactionScore": 95,
      "revenue": 2800000
    },
    "order": 31
  },
  {
    "name": "Property Marketing Premium",
    "code": "VAS-002",
    "category": "Value-Added Services",
    "tier": "essential",
    "description": "Professional photography, drone videography, 3D virtual tours",
    "shortDescription": "Premium property marketing",
    "icon": "Camera",
    "departmentCode": "MKT",
    "assistantCode": "OLIVIA",
    "workflow": {
      "stages": [
        {
          "order": 1,
          "name": "Scheduling",
          "description": "Shoot planning",
          "duration": "1-2 days",
          "actions": [
            "Date scheduling",
            "Property prep",
            "Shot list"
          ]
        },
        {
          "order": 2,
          "name": "Production",
          "description": "Content creation",
          "duration": "1 day",
          "actions": [
            "Photography",
            "Drone footage",
            "Virtual tour capture"
          ]
        },
        {
          "order": 3,
          "name": "Post-production",
          "description": "Editing and delivery",
          "duration": "3-5 days",
          "actions": [
            "Photo editing",
            "Video editing",
            "Tour processing"
          ]
        },
        {
          "order": 4,
          "name": "Distribution",
          "description": "Multi-platform publishing",
          "duration": "1-2 days",
          "actions": [
            "Portal upload",
            "Social posting",
            "Analytics setup"
          ]
        }
      ],
      "estimatedDuration": "7-10 days",
      "sla": "24 hours response"
    },
    "pricing": {
      "type": "fixed",
      "amount": 8000,
      "currency": "AED",
      "details": "AED 3,000-15,000 package"
    },
    "targetAudience": [
      "sellers",
      "landlords"
    ],
    "metrics": {
      "totalRequests": 785,
      "completedRequests": 742,
      "avgCompletionTime": 8,
      "satisfactionScore": 94,
      "revenue": 5936000
    },
    "order": 32
  },
  {
    "name": "Relocation & Settling-In",
    "code": "VAS-003",
    "category": "Value-Added Services",
    "tier": "essential",
    "description": "Visa processing, school placements, utility connections, cultural orientation",
    "shortDescription": "Relocation assistance",
    "icon": "Plane",
    "departmentCode": "OPS",
    "assistantCode": "JUNO",
    "workflow": {
      "stages": [
        {
          "order": 1,
          "name": "Needs Assessment",
          "description": "Relocation requirements",
          "duration": "1-2 days",
          "actions": [
            "Family profiling",
            "Service selection",
            "Timeline planning"
          ]
        },
        {
          "order": 2,
          "name": "Visa & Documentation",
          "description": "Legal requirements",
          "duration": "2-4 weeks",
          "actions": [
            "Visa processing",
            "Emirates ID",
            "License conversions"
          ]
        },
        {
          "order": 3,
          "name": "Setup Services",
          "description": "Daily life setup",
          "duration": "1-2 weeks",
          "actions": [
            "Utilities",
            "Banking",
            "School enrollment"
          ]
        },
        {
          "order": 4,
          "name": "Orientation",
          "description": "Cultural integration",
          "duration": "1-3 days",
          "actions": [
            "City orientation",
            "Cultural briefing",
            "Local tips"
          ]
        }
      ],
      "estimatedDuration": "4-8 weeks",
      "sla": "24 hours response"
    },
    "pricing": {
      "type": "fixed",
      "amount": 15000,
      "currency": "AED",
      "details": "AED 7,500-25,000 per family"
    },
    "targetAudience": [
      "new_residents",
      "corporate_transferees"
    ],
    "metrics": {
      "totalRequests": 124,
      "completedRequests": 112,
      "avgCompletionTime": 35,
      "satisfactionScore": 96,
      "revenue": 1680000
    },
    "order": 33
  },
  {
    "name": "Lifestyle Concierge",
    "code": "VAS-004",
    "category": "Value-Added Services",
    "tier": "ultra",
    "description": "Restaurant reservations, event tickets, club memberships, yacht charters",
    "shortDescription": "Lifestyle management",
    "icon": "Sparkles",
    "departmentCode": "OPS",
    "assistantCode": "JUNO",
    "workflow": {
      "stages": [
        {
          "order": 1,
          "name": "Preference Profiling",
          "description": "Lifestyle assessment",
          "duration": "1 day",
          "actions": [
            "Interest mapping",
            "Preference documentation",
            "Contact list"
          ]
        },
        {
          "order": 2,
          "name": "Service Activation",
          "description": "Concierge setup",
          "duration": "1 day",
          "actions": [
            "Team assignment",
            "Priority protocols",
            "Communication setup"
          ]
        },
        {
          "order": 3,
          "name": "Ongoing Service",
          "description": "Request fulfillment",
          "duration": "Continuous",
          "actions": [
            "Request handling",
            "Proactive suggestions",
            "Quality assurance"
          ]
        }
      ],
      "estimatedDuration": "Ongoing service",
      "sla": "1 hour response"
    },
    "pricing": {
      "type": "subscription",
      "monthly": 1500,
      "details": "AED 1,500/month retainer"
    },
    "targetAudience": [
      "vip_clients",
      "tenants"
    ],
    "metrics": {
      "totalRequests": 86,
      "completedRequests": 86,
      "avgCompletionTime": 0.5,
      "satisfactionScore": 98,
      "revenue": 1548000
    },
    "order": 34
  },
  {
    "name": "AI-Powered Market Alerts",
    "code": "VAS-005",
    "category": "Value-Added Services",
    "tier": "basic",
    "description": "Personalized property alerts based on AI learning of preferences",
    "shortDescription": "Smart property alerts",
    "icon": "Bell",
    "departmentCode": "TECH",
    "assistantCode": "MARY",
    "workflow": {
      "stages": [
        {
          "order": 1,
          "name": "Preference Setup",
          "description": "Alert configuration",
          "duration": "30 min",
          "actions": [
            "Property criteria",
            "Budget range",
            "Location preferences"
          ]
        },
        {
          "order": 2,
          "name": "AI Learning",
          "description": "Preference refinement",
          "duration": "Ongoing",
          "actions": [
            "Interaction tracking",
            "Preference updates",
            "Algorithm tuning"
          ]
        },
        {
          "order": 3,
          "name": "Alert Delivery",
          "description": "Match notifications",
          "duration": "Real-time",
          "actions": [
            "Match identification",
            "Alert dispatch",
            "Feedback collection"
          ]
        }
      ],
      "estimatedDuration": "Ongoing service",
      "sla": "Real-time alerts"
    },
    "pricing": {
      "type": "subscription",
      "monthly": 500,
      "details": "AED 500/month"
    },
    "targetAudience": [
      "all_registered_clients"
    ],
    "metrics": {
      "totalRequests": 1245,
      "completedRequests": 1245,
      "avgCompletionTime": 0.1,
      "satisfactionScore": 89,
      "revenue": 622500
    },
    "order": 35
  },
  {
    "name": "White Caves AI Platform Access",
    "code": "TS-001",
    "category": "Technology Services",
    "tier": "ultra",
    "description": "Premium access to all 32 AI assistants for personal use",
    "shortDescription": "Full AI platform access",
    "icon": "Bot",
    "departmentCode": "TECH",
    "assistantCode": "AURORA",
    "workflow": {
      "stages": [
        {
          "order": 1,
          "name": "Subscription",
          "description": "Account activation",
          "duration": "1 day",
          "actions": [
            "Account upgrade",
            "Access provisioning",
            "Training session"
          ]
        },
        {
          "order": 2,
          "name": "Onboarding",
          "description": "Platform training",
          "duration": "2-3 hours",
          "actions": [
            "Feature walkthrough",
            "Use case examples",
            "Support setup"
          ]
        },
        {
          "order": 3,
          "name": "Active Use",
          "description": "Ongoing access",
          "duration": "Continuous",
          "actions": [
            "AI assistant usage",
            "Feature updates",
            "Premium support"
          ]
        }
      ],
      "estimatedDuration": "Annual subscription",
      "sla": "30 minutes response"
    },
    "pricing": {
      "type": "subscription",
      "annual": 10000,
      "details": "AED 10,000/year"
    },
    "targetAudience": [
      "uhnwi_clients",
      "corporate_accounts"
    ],
    "metrics": {
      "totalRequests": 48,
      "completedRequests": 48,
      "avgCompletionTime": 1,
      "satisfactionScore": 97,
      "revenue": 480000
    },
    "order": 36
  },
  {
    "name": "Digital Portfolio Dashboard",
    "code": "TS-002",
    "category": "Technology Services",
    "tier": "premium",
    "description": "Real-time dashboard of property portfolio performance",
    "shortDescription": "Portfolio analytics dashboard",
    "icon": "LayoutDashboard",
    "departmentCode": "TECH",
    "assistantCode": "AURORA",
    "workflow": {
      "stages": [
        {
          "order": 1,
          "name": "Data Integration",
          "description": "Property data sync",
          "duration": "2-3 days",
          "actions": [
            "Property linking",
            "Data import",
            "Metric configuration"
          ]
        },
        {
          "order": 2,
          "name": "Dashboard Setup",
          "description": "Customization",
          "duration": "1-2 days",
          "actions": [
            "Layout selection",
            "KPI configuration",
            "Alert setup"
          ]
        },
        {
          "order": 3,
          "name": "Go Live",
          "description": "Dashboard activation",
          "duration": "1 day",
          "actions": [
            "User training",
            "Access provisioning",
            "Support handoff"
          ]
        }
      ],
      "estimatedDuration": "1 week setup",
      "sla": "4 hours for issues"
    },
    "pricing": {
      "type": "subscription",
      "monthly": 2500,
      "details": "AED 2,500/month"
    },
    "targetAudience": [
      "portfolio_owners"
    ],
    "metrics": {
      "totalRequests": 86,
      "completedRequests": 82,
      "avgCompletionTime": 5,
      "satisfactionScore": 94,
      "revenue": 2580000
    },
    "order": 37
  },
  {
    "name": "Predictive Analytics Reports",
    "code": "TS-003",
    "category": "Technology Services",
    "tier": "premium",
    "description": "AI-generated forecasts for property values and rental yields",
    "shortDescription": "AI market predictions",
    "icon": "Sparkles",
    "departmentCode": "INTEL",
    "assistantCode": "CIPHER",
    "workflow": {
      "stages": [
        {
          "order": 1,
          "name": "Scope Definition",
          "description": "Report requirements",
          "duration": "1-2 days",
          "actions": [
            "Area selection",
            "Metrics selection",
            "Timeline definition"
          ]
        },
        {
          "order": 2,
          "name": "AI Analysis",
          "description": "Data processing",
          "duration": "3-5 days",
          "actions": [
            "Data aggregation",
            "Model execution",
            "Prediction generation"
          ]
        },
        {
          "order": 3,
          "name": "Report Delivery",
          "description": "Insights presentation",
          "duration": "1-2 days",
          "actions": [
            "Report compilation",
            "Visualization",
            "Presentation"
          ]
        }
      ],
      "estimatedDuration": "7-10 days",
      "sla": "48 hours response"
    },
    "pricing": {
      "type": "fixed",
      "amount": 2500,
      "currency": "AED",
      "details": "AED 2,500/report"
    },
    "targetAudience": [
      "serious_investors",
      "developers"
    ],
    "metrics": {
      "totalRequests": 124,
      "completedRequests": 118,
      "avgCompletionTime": 8,
      "satisfactionScore": 93,
      "revenue": 295000
    },
    "order": 38
  },
  {
    "name": "API Integration Services",
    "code": "TS-004",
    "category": "Technology Services",
    "tier": "corporate",
    "description": "Connect White Caves platform to client systems and portals",
    "shortDescription": "API and system integration",
    "icon": "Code",
    "departmentCode": "TECH",
    "assistantCode": "WILLOW",
    "workflow": {
      "stages": [
        {
          "order": 1,
          "name": "Requirements",
          "description": "Integration scope",
          "duration": "3-5 days",
          "actions": [
            "System analysis",
            "API design",
            "Security review"
          ]
        },
        {
          "order": 2,
          "name": "Development",
          "description": "Integration build",
          "duration": "2-4 weeks",
          "actions": [
            "API development",
            "Testing",
            "Documentation"
          ]
        },
        {
          "order": 3,
          "name": "Deployment",
          "description": "Go-live",
          "duration": "1 week",
          "actions": [
            "Production deployment",
            "Training",
            "Support transition"
          ]
        }
      ],
      "estimatedDuration": "4-6 weeks",
      "sla": "4 hours for production issues"
    },
    "pricing": {
      "type": "fixed",
      "amount": 30000,
      "currency": "AED",
      "details": "AED 15,000-50,000 setup"
    },
    "targetAudience": [
      "corporate_clients",
      "partner_firms"
    ],
    "metrics": {
      "totalRequests": 18,
      "completedRequests": 15,
      "avgCompletionTime": 35,
      "satisfactionScore": 95,
      "revenue": 540000
    },
    "order": 39
  },
  {
    "name": "Blockchain Title Management",
    "code": "TS-005",
    "category": "Technology Services",
    "tier": "ultra",
    "description": "Digital title deeds on blockchain for enhanced security and transparency",
    "shortDescription": "Blockchain title deeds",
    "icon": "Link",
    "departmentCode": "TECH",
    "assistantCode": "HENRY",
    "workflow": {
      "stages": [
        {
          "order": 1,
          "name": "Title Verification",
          "description": "Ownership confirmation",
          "duration": "2-3 days",
          "actions": [
            "DLD verification",
            "Document collection",
            "Chain of title"
          ]
        },
        {
          "order": 2,
          "name": "Blockchain Registration",
          "description": "Digital tokenization",
          "duration": "3-5 days",
          "actions": [
            "Token creation",
            "Metadata upload",
            "Smart contract"
          ]
        },
        {
          "order": 3,
          "name": "Certificate Issuance",
          "description": "Blockchain title",
          "duration": "1-2 days",
          "actions": [
            "Certificate generation",
            "Owner notification",
            "Platform access"
          ]
        }
      ],
      "estimatedDuration": "7-10 days",
      "sla": "24 hours response"
    },
    "pricing": {
      "type": "percentage",
      "percentage": 0.5,
      "details": "0.5% of property value"
    },
    "targetAudience": [
      "tech_forward_investors"
    ],
    "metrics": {
      "totalRequests": 24,
      "completedRequests": 18,
      "avgCompletionTime": 8,
      "satisfactionScore": 96,
      "revenue": 450000
    },
    "order": 40
  }
];
