// @ts-nocheck
export const SERVICES_SEED_PART_2 = [
  {
    "name": "Full-Service Property Management",
    "code": "PPM-001",
    "category": "Property & Portfolio Management",
    "tier": "essential",
    "description": "End-to-end management: tenant sourcing, rent collection, maintenance, compliance",
    "shortDescription": "Complete property management",
    "icon": "Settings",
    "departmentCode": "OPS",
    "assistantCode": "SENTINEL",
    "workflow": {
      "stages": [
        {
          "order": 1,
          "name": "Onboarding",
          "description": "Property setup",
          "duration": "3-5 days",
          "actions": [
            "Property inspection",
            "Documentation",
            "System setup"
          ]
        },
        {
          "order": 2,
          "name": "Tenant Management",
          "description": "Ongoing tenant relations",
          "duration": "Continuous",
          "actions": [
            "Communication",
            "Issue resolution",
            "Lease renewals"
          ]
        },
        {
          "order": 3,
          "name": "Financial Management",
          "description": "Rent and expenses",
          "duration": "Monthly",
          "actions": [
            "Rent collection",
            "Expense tracking",
            "Owner reporting"
          ]
        },
        {
          "order": 4,
          "name": "Maintenance",
          "description": "Property upkeep",
          "duration": "As needed",
          "actions": [
            "Issue logging",
            "Vendor coordination",
            "Quality control"
          ]
        }
      ],
      "estimatedDuration": "Ongoing service",
      "sla": "4 hours for urgent issues"
    },
    "pricing": {
      "type": "percentage",
      "percentage": 6,
      "details": "4-8% of monthly rent"
    },
    "targetAudience": [
      "absentee_landlords",
      "international_investors"
    ],
    "metrics": {
      "totalRequests": 456,
      "completedRequests": 423,
      "avgCompletionTime": 5,
      "satisfactionScore": 91,
      "revenue": 4200000
    },
    "order": 11
  },
  {
    "name": "Luxury Concierge Services",
    "code": "PPM-002",
    "category": "Property & Portfolio Management",
    "tier": "ultra",
    "description": "24/7 concierge, housekeeping, personal shopping, event planning",
    "shortDescription": "24/7 luxury concierge",
    "icon": "Bell",
    "departmentCode": "OPS",
    "assistantCode": "JUNO",
    "workflow": {
      "stages": [
        {
          "order": 1,
          "name": "Client Profiling",
          "description": "Lifestyle assessment",
          "duration": "1-2 days",
          "actions": [
            "Preference gathering",
            "Service selection",
            "Schedule setup"
          ]
        },
        {
          "order": 2,
          "name": "Service Activation",
          "description": "Concierge team assignment",
          "duration": "1 day",
          "actions": [
            "Team briefing",
            "Contact setup",
            "Emergency protocols"
          ]
        },
        {
          "order": 3,
          "name": "Ongoing Support",
          "description": "24/7 availability",
          "duration": "Continuous",
          "actions": [
            "Request fulfillment",
            "Proactive service",
            "Quality assurance"
          ]
        }
      ],
      "estimatedDuration": "Ongoing service",
      "sla": "15 minutes response"
    },
    "pricing": {
      "type": "subscription",
      "monthly": 5000,
      "details": "AED 2,500-10,000/month"
    },
    "targetAudience": [
      "uhnwi_residents",
      "vip_tenants"
    ],
    "metrics": {
      "totalRequests": 89,
      "completedRequests": 89,
      "avgCompletionTime": 0.5,
      "satisfactionScore": 98,
      "revenue": 3200000
    },
    "order": 12
  },
  {
    "name": "Portfolio Performance Optimization",
    "code": "PPM-003",
    "category": "Property & Portfolio Management",
    "tier": "premium",
    "description": "AI-driven analysis of rental yields, occupancy rates, value appreciation",
    "shortDescription": "Portfolio analytics and optimization",
    "icon": "TrendingUp",
    "departmentCode": "INTEL",
    "assistantCode": "CIPHER",
    "workflow": {
      "stages": [
        {
          "order": 1,
          "name": "Portfolio Audit",
          "description": "Comprehensive review",
          "duration": "5-7 days",
          "actions": [
            "Asset inventory",
            "Performance analysis",
            "Market comparison"
          ]
        },
        {
          "order": 2,
          "name": "Strategy Development",
          "description": "Optimization plan",
          "duration": "3-5 days",
          "actions": [
            "Yield optimization",
            "Rebalancing recommendations",
            "Exit strategies"
          ]
        },
        {
          "order": 3,
          "name": "Implementation",
          "description": "Action execution",
          "duration": "Ongoing",
          "actions": [
            "Action items",
            "Progress tracking",
            "Quarterly reviews"
          ]
        }
      ],
      "estimatedDuration": "Initial 2 weeks, then quarterly",
      "sla": "24 hours response"
    },
    "pricing": {
      "type": "percentage",
      "percentage": 1,
      "details": "1% of portfolio value annually"
    },
    "targetAudience": [
      "portfolio_owners",
      "hnwi"
    ],
    "metrics": {
      "totalRequests": 68,
      "completedRequests": 62,
      "avgCompletionTime": 14,
      "satisfactionScore": 95,
      "revenue": 4800000
    },
    "order": 13
  },
  {
    "name": "Smart Home Integration",
    "code": "PPM-004",
    "category": "Property & Portfolio Management",
    "tier": "premium",
    "description": "Installation and management of luxury home automation systems",
    "shortDescription": "Home automation services",
    "icon": "Smartphone",
    "departmentCode": "TECH",
    "assistantCode": "AURORA",
    "workflow": {
      "stages": [
        {
          "order": 1,
          "name": "Assessment",
          "description": "Smart home evaluation",
          "duration": "1-2 days",
          "actions": [
            "Property assessment",
            "Client requirements",
            "System design"
          ]
        },
        {
          "order": 2,
          "name": "Installation",
          "description": "System setup",
          "duration": "3-7 days",
          "actions": [
            "Equipment installation",
            "Integration",
            "Testing"
          ]
        },
        {
          "order": 3,
          "name": "Training",
          "description": "Client onboarding",
          "duration": "1 day",
          "actions": [
            "System training",
            "App setup",
            "Support handoff"
          ]
        },
        {
          "order": 4,
          "name": "Maintenance",
          "description": "Ongoing support",
          "duration": "Continuous",
          "actions": [
            "Updates",
            "Troubleshooting",
            "Enhancements"
          ]
        }
      ],
      "estimatedDuration": "7-14 days setup",
      "sla": "4 hours for issues"
    },
    "pricing": {
      "type": "custom",
      "details": "15-20% of system cost + monthly fee"
    },
    "targetAudience": [
      "tech_savvy_owners",
      "new_builds"
    ],
    "metrics": {
      "totalRequests": 156,
      "completedRequests": 142,
      "avgCompletionTime": 10,
      "satisfactionScore": 94,
      "revenue": 2100000
    },
    "order": 14
  },
  {
    "name": "Green & Sustainable Certification",
    "code": "PPM-005",
    "category": "Property & Portfolio Management",
    "tier": "premium",
    "description": "LEED/BREEAM certification and sustainable property management",
    "shortDescription": "Sustainability certification",
    "icon": "Leaf",
    "departmentCode": "OPS",
    "assistantCode": "JUNO",
    "workflow": {
      "stages": [
        {
          "order": 1,
          "name": "Sustainability Audit",
          "description": "Environmental assessment",
          "duration": "5-7 days",
          "actions": [
            "Energy audit",
            "Water assessment",
            "Waste analysis"
          ]
        },
        {
          "order": 2,
          "name": "Improvement Plan",
          "description": "Green strategy",
          "duration": "3-5 days",
          "actions": [
            "Recommendations",
            "ROI analysis",
            "Implementation roadmap"
          ]
        },
        {
          "order": 3,
          "name": "Certification",
          "description": "Formal certification",
          "duration": "30-90 days",
          "actions": [
            "Documentation",
            "Inspections",
            "Certification"
          ]
        }
      ],
      "estimatedDuration": "60-120 days",
      "sla": "48 hours response"
    },
    "pricing": {
      "type": "fixed",
      "amount": 25000,
      "currency": "AED",
      "details": "AED 15,000-50,000 setup"
    },
    "targetAudience": [
      "esg_investors",
      "corporate_owners"
    ],
    "metrics": {
      "totalRequests": 24,
      "completedRequests": 18,
      "avgCompletionTime": 75,
      "satisfactionScore": 96,
      "revenue": 720000
    },
    "order": 15
  },
  {
    "name": "Real Estate Investment Strategy",
    "code": "IA-001",
    "category": "Investment Advisory",
    "tier": "premium",
    "description": "Personalized investment roadmap based on risk profile, timeline, and goals",
    "shortDescription": "Investment strategy consulting",
    "icon": "Target",
    "departmentCode": "FIN",
    "assistantCode": "FELIX",
    "workflow": {
      "stages": [
        {
          "order": 1,
          "name": "Discovery",
          "description": "Investor profiling",
          "duration": "2-3 days",
          "actions": [
            "Financial assessment",
            "Risk profiling",
            "Goal setting"
          ]
        },
        {
          "order": 2,
          "name": "Strategy Development",
          "description": "Investment roadmap",
          "duration": "5-7 days",
          "actions": [
            "Market analysis",
            "Portfolio design",
            "Timeline creation"
          ]
        },
        {
          "order": 3,
          "name": "Implementation",
          "description": "Strategy execution",
          "duration": "Ongoing",
          "actions": [
            "Property sourcing",
            "Transaction support",
            "Performance tracking"
          ]
        }
      ],
      "estimatedDuration": "Initial 2 weeks, then ongoing",
      "sla": "24 hours response"
    },
    "pricing": {
      "type": "percentage",
      "percentage": 1,
      "details": "1% of investment amount (min AED 25,000)"
    },
    "targetAudience": [
      "first_time_investors",
      "portfolio_builders"
    ],
    "metrics": {
      "totalRequests": 186,
      "completedRequests": 162,
      "avgCompletionTime": 18,
      "satisfactionScore": 94,
      "revenue": 5200000
    },
    "order": 16
  },
  {
    "name": "Market Intelligence & Research",
    "code": "IA-002",
    "category": "Investment Advisory",
    "tier": "premium",
    "description": "Custom reports on market trends, emerging areas, and yield projections",
    "shortDescription": "Custom market research",
    "icon": "BarChart2",
    "departmentCode": "INTEL",
    "assistantCode": "SAGE",
    "workflow": {
      "stages": [
        {
          "order": 1,
          "name": "Brief",
          "description": "Research scope definition",
          "duration": "1-2 days",
          "actions": [
            "Requirements gathering",
            "Scope definition",
            "Timeline agreement"
          ]
        },
        {
          "order": 2,
          "name": "Research",
          "description": "Data collection and analysis",
          "duration": "5-10 days",
          "actions": [
            "Data gathering",
            "Market analysis",
            "Trend identification"
          ]
        },
        {
          "order": 3,
          "name": "Report Delivery",
          "description": "Insights presentation",
          "duration": "2-3 days",
          "actions": [
            "Report writing",
            "Presentation",
            "Q&A session"
          ]
        }
      ],
      "estimatedDuration": "10-15 days",
      "sla": "48 hours response"
    },
    "pricing": {
      "type": "fixed",
      "amount": 15000,
      "currency": "AED",
      "details": "AED 5,000-25,000 per report"
    },
    "targetAudience": [
      "institutional_investors",
      "family_offices"
    ],
    "metrics": {
      "totalRequests": 86,
      "completedRequests": 78,
      "avgCompletionTime": 12,
      "satisfactionScore": 96,
      "revenue": 1290000
    },
    "order": 17
  },
  {
    "name": "Development Site Acquisition",
    "code": "IA-003",
    "category": "Investment Advisory",
    "tier": "corporate",
    "description": "Land sourcing, feasibility studies, and developer partnerships",
    "shortDescription": "Development land acquisition",
    "icon": "MapPin",
    "departmentCode": "SALES",
    "assistantCode": "ATLAS",
    "workflow": {
      "stages": [
        {
          "order": 1,
          "name": "Site Search",
          "description": "Land identification",
          "duration": "2-4 weeks",
          "actions": [
            "Location scouting",
            "Zoning analysis",
            "Availability confirmation"
          ]
        },
        {
          "order": 2,
          "name": "Feasibility",
          "description": "Development viability",
          "duration": "2-3 weeks",
          "actions": [
            "Financial modeling",
            "Regulatory review",
            "Risk assessment"
          ]
        },
        {
          "order": 3,
          "name": "Negotiation",
          "description": "Deal structuring",
          "duration": "3-6 weeks",
          "actions": [
            "Price negotiation",
            "Terms finalization",
            "Due diligence"
          ]
        },
        {
          "order": 4,
          "name": "Acquisition",
          "description": "Transaction completion",
          "duration": "4-8 weeks",
          "actions": [
            "Contract execution",
            "Payment management",
            "Transfer"
          ]
        }
      ],
      "estimatedDuration": "3-6 months",
      "sla": "24 hours response"
    },
    "pricing": {
      "type": "percentage",
      "percentage": 2.5,
      "details": "2-3% of land value"
    },
    "targetAudience": [
      "developers",
      "land_bankers"
    ],
    "metrics": {
      "totalRequests": 28,
      "completedRequests": 18,
      "avgCompletionTime": 120,
      "satisfactionScore": 95,
      "revenue": 12500000
    },
    "order": 18
  },
  {
    "name": "REIT & Fund Investment",
    "code": "IA-004",
    "category": "Investment Advisory",
    "tier": "premium",
    "description": "Access to UAE real estate funds and REIT investment opportunities",
    "shortDescription": "REIT and fund access",
    "icon": "PieChart",
    "departmentCode": "FIN",
    "assistantCode": "FELIX",
    "workflow": {
      "stages": [
        {
          "order": 1,
          "name": "Investor Profiling",
          "description": "Suitability assessment",
          "duration": "1-2 days",
          "actions": [
            "Risk assessment",
            "Investment horizon",
            "Liquidity needs"
          ]
        },
        {
          "order": 2,
          "name": "Fund Selection",
          "description": "Investment matching",
          "duration": "3-5 days",
          "actions": [
            "Fund comparison",
            "Performance analysis",
            "Fee review"
          ]
        },
        {
          "order": 3,
          "name": "Investment",
          "description": "Capital deployment",
          "duration": "3-7 days",
          "actions": [
            "Subscription",
            "Documentation",
            "Fund transfer"
          ]
        },
        {
          "order": 4,
          "name": "Monitoring",
          "description": "Performance tracking",
          "duration": "Ongoing",
          "actions": [
            "NAV updates",
            "Distribution tracking",
            "Rebalancing"
          ]
        }
      ],
      "estimatedDuration": "2-3 weeks initial",
      "sla": "24 hours response"
    },
    "pricing": {
      "type": "percentage",
      "percentage": 1,
      "details": "1% AUM annually"
    },
    "targetAudience": [
      "passive_investors",
      "retirement_planners"
    ],
    "metrics": {
      "totalRequests": 124,
      "completedRequests": 112,
      "avgCompletionTime": 15,
      "satisfactionScore": 93,
      "revenue": 2800000
    },
    "order": 19
  },
  {
    "name": "Exit Strategy Planning",
    "code": "IA-005",
    "category": "Investment Advisory",
    "tier": "premium",
    "description": "Optimal timing and method for property disposal to maximize returns",
    "shortDescription": "Exit strategy consulting",
    "icon": "LogOut",
    "departmentCode": "FIN",
    "assistantCode": "FELIX",
    "workflow": {
      "stages": [
        {
          "order": 1,
          "name": "Portfolio Review",
          "description": "Asset assessment",
          "duration": "3-5 days",
          "actions": [
            "Performance analysis",
            "Market timing",
            "Tax implications"
          ]
        },
        {
          "order": 2,
          "name": "Exit Options",
          "description": "Strategy development",
          "duration": "3-5 days",
          "actions": [
            "Sale scenarios",
            "Timing optimization",
            "Buyer targeting"
          ]
        },
        {
          "order": 3,
          "name": "Execution",
          "description": "Exit implementation",
          "duration": "Variable",
          "actions": [
            "Marketing",
            "Negotiation",
            "Transaction management"
          ]
        }
      ],
      "estimatedDuration": "2-4 weeks planning",
      "sla": "24 hours response"
    },
    "pricing": {
      "type": "percentage",
      "percentage": 1,
      "details": "1% of final sale price"
    },
    "targetAudience": [
      "investors_exiting",
      "portfolio_rebalancers"
    ],
    "metrics": {
      "totalRequests": 68,
      "completedRequests": 58,
      "avgCompletionTime": 21,
      "satisfactionScore": 95,
      "revenue": 3400000
    },
    "order": 20
  }
];
