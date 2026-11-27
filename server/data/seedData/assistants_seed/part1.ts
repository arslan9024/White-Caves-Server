// @ts-nocheck
export const ASSISTANTS_SEED_PART_1 = [
  {
    "name": "Zoe",
    "code": "ZOE",
    "role": "MD Executive Assistant",
    "departmentCode": "EXEC",
    "avatar": "/avatars/zoe.png",
    "color": "#10B981",
    "description": "Executive AI assistant providing strategic intelligence, decision support, and organizational oversight for the Managing Director.",
    "capabilities": [
      "Strategic Analysis",
      "Executive Briefings",
      "Decision Support",
      "Organizational Oversight",
      "Meeting Coordination"
    ],
    "features": [
      {
        "id": "dashboard",
        "name": "Executive Dashboard",
        "icon": "LayoutDashboard",
        "route": "/md/dashboard"
      },
      {
        "id": "inbox",
        "name": "Suggestion Inbox",
        "icon": "Inbox",
        "route": "/md/suggestions"
      },
      {
        "id": "analytics",
        "name": "Analytics",
        "icon": "BarChart3",
        "route": "/md/analytics"
      },
      {
        "id": "reports",
        "name": "Reports",
        "icon": "FileText",
        "route": "/md/reports"
      }
    ],
    "accessLevel": "executive",
    "permissions": [
      {
        "resource": "*",
        "actions": [
          "read",
          "write",
          "delete",
          "approve"
        ]
      }
    ],
    "status": "online",
    "health": {
      "score": 100,
      "lastCheck": "2026-11-27T00:02:27.280Z"
    },
    "metrics": {
      "tasksCompleted": 1250,
      "avgResponseTime": 0.8,
      "successRate": 99.2,
      "activeConnections": 3
    },
    "order": 1
  },
  {
    "name": "Mary",
    "code": "MARY",
    "role": "Inventory Manager",
    "departmentCode": "OPS",
    "avatar": "/avatars/mary.png",
    "color": "#3B82F6",
    "description": "Manages property inventory database, data acquisition tools, and listing coordination across all platforms.",
    "capabilities": [
      "Inventory Management",
      "Data Acquisition",
      "Asset Fetching",
      "OCR Processing",
      "Listing Sync"
    ],
    "features": [
      {
        "id": "inventory",
        "name": "Inventory",
        "icon": "Package",
        "route": "/ops/inventory"
      },
      {
        "id": "data-tools",
        "name": "Data Tools",
        "icon": "Database",
        "route": "/ops/data-tools"
      },
      {
        "id": "import",
        "name": "Data Import",
        "icon": "Upload",
        "route": "/ops/import"
      }
    ],
    "accessLevel": "elevated",
    "status": "online",
    "health": {
      "score": 98,
      "lastCheck": "2026-11-27T00:02:27.280Z"
    },
    "metrics": {
      "tasksCompleted": 8750,
      "avgResponseTime": 1.2,
      "successRate": 97.5,
      "activeConnections": 5
    },
    "order": 2
  },
  {
    "name": "Daisy",
    "code": "DAISY",
    "role": "Property Coordinator",
    "departmentCode": "OPS",
    "avatar": "/avatars/daisy.png",
    "color": "#22C55E",
    "description": "Coordinates leasing operations, tenant management, and rental analytics.",
    "capabilities": [
      "Lease Management",
      "Tenant Coordination",
      "Maintenance Tracking",
      "Rental Analytics"
    ],
    "features": [
      {
        "id": "leases",
        "name": "Leases",
        "icon": "FileText",
        "route": "/ops/leases"
      },
      {
        "id": "tenants",
        "name": "Tenants",
        "icon": "Users",
        "route": "/ops/tenants"
      },
      {
        "id": "maintenance",
        "name": "Maintenance",
        "icon": "Wrench",
        "route": "/ops/maintenance"
      }
    ],
    "accessLevel": "standard",
    "status": "online",
    "health": {
      "score": 96,
      "lastCheck": "2026-11-27T00:02:27.281Z"
    },
    "metrics": {
      "tasksCompleted": 5420,
      "avgResponseTime": 1.5,
      "successRate": 95.8,
      "activeConnections": 4
    },
    "order": 3
  },
  {
    "name": "Sentinel",
    "code": "SENTINEL",
    "role": "Quality Control",
    "departmentCode": "OPS",
    "avatar": "/avatars/sentinel.png",
    "color": "#EF4444",
    "description": "Monitors property conditions, predicts maintenance needs, and manages emergency responses.",
    "capabilities": [
      "Property Monitoring",
      "Predictive Maintenance",
      "Quality Inspections",
      "Emergency Response"
    ],
    "features": [
      {
        "id": "monitoring",
        "name": "Monitoring",
        "icon": "Eye",
        "route": "/ops/monitoring"
      },
      {
        "id": "maintenance",
        "name": "Predictive Maintenance",
        "icon": "Wrench",
        "route": "/ops/predictive"
      },
      {
        "id": "inspections",
        "name": "Inspections",
        "icon": "ClipboardCheck",
        "route": "/ops/inspections"
      }
    ],
    "accessLevel": "elevated",
    "status": "online",
    "health": {
      "score": 100,
      "lastCheck": "2026-11-27T00:02:27.281Z"
    },
    "metrics": {
      "tasksCompleted": 3250,
      "avgResponseTime": 0.5,
      "successRate": 99.8,
      "activeConnections": 8
    },
    "order": 4
  },
  {
    "name": "Clara",
    "code": "CLARA",
    "role": "Lead Manager",
    "departmentCode": "SALES",
    "avatar": "/avatars/clara.png",
    "color": "#8B5CF6",
    "description": "Manages lead pipeline, scoring algorithms, and nurturing workflows for optimal conversion.",
    "capabilities": [
      "Lead Management",
      "Pipeline Optimization",
      "Lead Scoring",
      "Nurturing Automation"
    ],
    "features": [
      {
        "id": "pipeline",
        "name": "Pipeline",
        "icon": "GitBranch",
        "route": "/sales/pipeline"
      },
      {
        "id": "leads",
        "name": "Lead List",
        "icon": "Users",
        "route": "/sales/leads"
      },
      {
        "id": "scoring",
        "name": "Scoring",
        "icon": "Star",
        "route": "/sales/scoring"
      }
    ],
    "accessLevel": "standard",
    "status": "online",
    "health": {
      "score": 97,
      "lastCheck": "2026-11-27T00:02:27.281Z"
    },
    "metrics": {
      "tasksCompleted": 4820,
      "avgResponseTime": 1.1,
      "successRate": 96.5,
      "activeConnections": 6
    },
    "order": 5
  },
  {
    "name": "Sophia",
    "code": "SOPHIA",
    "role": "Contract Manager",
    "departmentCode": "SALES",
    "avatar": "/avatars/sophia.png",
    "color": "#F59E0B",
    "description": "Manages deals, sales pipeline, forecasting, and commission calculations.",
    "capabilities": [
      "Deal Management",
      "Sales Pipeline",
      "Forecasting",
      "Commission Tracking"
    ],
    "features": [
      {
        "id": "deals",
        "name": "Deals",
        "icon": "Handshake",
        "route": "/sales/deals"
      },
      {
        "id": "pipeline",
        "name": "Sales Pipeline",
        "icon": "TrendingUp",
        "route": "/sales/sales-pipeline"
      },
      {
        "id": "forecast",
        "name": "Forecast",
        "icon": "LineChart",
        "route": "/sales/forecast"
      }
    ],
    "accessLevel": "elevated",
    "status": "online",
    "health": {
      "score": 99,
      "lastCheck": "2026-11-27T00:02:27.281Z"
    },
    "metrics": {
      "tasksCompleted": 6150,
      "avgResponseTime": 0.9,
      "successRate": 98.2,
      "activeConnections": 7
    },
    "order": 6
  },
  {
    "name": "Hunter",
    "code": "HUNTER",
    "role": "Lead Hunter",
    "departmentCode": "SALES",
    "avatar": "/avatars/hunter.png",
    "color": "#EF4444",
    "description": "Actively prospects new leads, runs outreach campaigns, and enriches lead data.",
    "capabilities": [
      "Lead Prospecting",
      "Outreach Campaigns",
      "Pattern Detection",
      "Lead Enrichment"
    ],
    "features": [
      {
        "id": "prospects",
        "name": "Prospects",
        "icon": "Target",
        "route": "/sales/prospects"
      },
      {
        "id": "outreach",
        "name": "Outreach",
        "icon": "Send",
        "route": "/sales/outreach"
      },
      {
        "id": "enrichment",
        "name": "Enrichment",
        "icon": "Sparkles",
        "route": "/sales/enrichment"
      }
    ],
    "accessLevel": "standard",
    "status": "online",
    "health": {
      "score": 95,
      "lastCheck": "2026-11-27T00:02:27.281Z"
    },
    "metrics": {
      "tasksCompleted": 2890,
      "avgResponseTime": 2.1,
      "successRate": 94.3,
      "activeConnections": 3
    },
    "order": 7
  },
  {
    "name": "Kairos",
    "code": "KAIROS",
    "role": "VIP Services",
    "departmentCode": "SALES",
    "avatar": "/avatars/kairos.png",
    "color": "#FFD700",
    "description": "Provides white-glove service for VIP clients with concierge support and lifestyle partnerships.",
    "capabilities": [
      "VIP Client Management",
      "Concierge Services",
      "Lifestyle Partnerships",
      "Exclusive Access"
    ],
    "features": [
      {
        "id": "vip",
        "name": "VIP Clients",
        "icon": "Crown",
        "route": "/sales/vip"
      },
      {
        "id": "concierge",
        "name": "Concierge",
        "icon": "Star",
        "route": "/sales/concierge"
      }
    ],
    "accessLevel": "elevated",
    "status": "online",
    "health": {
      "score": 100,
      "lastCheck": "2026-11-27T00:02:27.281Z"
    },
    "metrics": {
      "tasksCompleted": 890,
      "avgResponseTime": 0.6,
      "successRate": 99.5,
      "activeConnections": 2
    },
    "order": 8
  },
  {
    "name": "Linda",
    "code": "LINDA",
    "role": "WhatsApp Manager",
    "departmentCode": "COMM",
    "avatar": "/avatars/linda.png",
    "color": "#25D366",
    "description": "Manages WhatsApp Business conversations, agent status, templates, and broadcasts.",
    "capabilities": [
      "WhatsApp Management",
      "Agent Coordination",
      "Template Management",
      "Broadcast Campaigns"
    ],
    "features": [
      {
        "id": "conversations",
        "name": "Conversations",
        "icon": "MessageSquare",
        "route": "/comm/conversations"
      },
      {
        "id": "agents",
        "name": "Agent Status",
        "icon": "Users",
        "route": "/comm/agents"
      },
      {
        "id": "templates",
        "name": "Templates",
        "icon": "FileText",
        "route": "/comm/templates"
      }
    ],
    "accessLevel": "standard",
    "status": "online",
    "health": {
      "score": 98,
      "lastCheck": "2026-11-27T00:02:27.281Z"
    },
    "metrics": {
      "tasksCompleted": 12500,
      "avgResponseTime": 0.3,
      "successRate": 97.8,
      "activeConnections": 15
    },
    "order": 9
  },
  {
    "name": "Nina",
    "code": "NINA",
    "role": "Client Relations",
    "departmentCode": "COMM",
    "avatar": "/avatars/nina.png",
    "color": "#06B6D4",
    "description": "Builds and manages chatbot flows, client sessions, and conversation analytics.",
    "capabilities": [
      "Bot Building",
      "Flow Design",
      "Session Management",
      "Conversation Analytics"
    ],
    "features": [
      {
        "id": "bot-builder",
        "name": "Bot Builder",
        "icon": "Bot",
        "route": "/comm/bot-builder"
      },
      {
        "id": "flows",
        "name": "Flow Designer",
        "icon": "GitBranch",
        "route": "/comm/flows"
      },
      {
        "id": "sessions",
        "name": "Sessions",
        "icon": "Activity",
        "route": "/comm/sessions"
      }
    ],
    "accessLevel": "standard",
    "status": "online",
    "health": {
      "score": 96,
      "lastCheck": "2026-11-27T00:02:27.282Z"
    },
    "metrics": {
      "tasksCompleted": 4280,
      "avgResponseTime": 1.4,
      "successRate": 95.2,
      "activeConnections": 8
    },
    "order": 10
  },
  {
    "name": "Theodora",
    "code": "THEODORA",
    "role": "CFO Intelligence",
    "departmentCode": "FIN",
    "avatar": "/avatars/theodora.png",
    "color": "#F59E0B",
    "description": "Manages invoicing, payments, financial reporting, and escrow operations.",
    "capabilities": [
      "Invoice Processing",
      "Payment Management",
      "Financial Reporting",
      "Escrow Management"
    ],
    "features": [
      {
        "id": "invoices",
        "name": "Invoices",
        "icon": "Receipt",
        "route": "/finance/invoices"
      },
      {
        "id": "payments",
        "name": "Payments",
        "icon": "CreditCard",
        "route": "/finance/payments"
      },
      {
        "id": "reports",
        "name": "Reports",
        "icon": "FileText",
        "route": "/finance/reports"
      }
    ],
    "accessLevel": "elevated",
    "status": "online",
    "health": {
      "score": 100,
      "lastCheck": "2026-11-27T00:02:27.282Z"
    },
    "metrics": {
      "tasksCompleted": 8920,
      "avgResponseTime": 0.7,
      "successRate": 99.1,
      "activeConnections": 4
    },
    "order": 11
  }
];
