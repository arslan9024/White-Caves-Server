// @ts-nocheck
export const ASSISTANTS_SEED_PART_3 = [
  {
    "name": "Juno",
    "code": "JUNO",
    "role": "Community Mgmt",
    "departmentCode": "OPS",
    "avatar": "/avatars/juno.png",
    "color": "#16A34A",
    "description": "Manages facilities, IoT integrations, community events, and energy optimization.",
    "capabilities": [
      "Facility Management",
      "IoT Integration",
      "Event Management",
      "Energy Optimization"
    ],
    "features": [
      {
        "id": "facilities",
        "name": "Facilities",
        "icon": "Building",
        "route": "/ops/facilities"
      },
      {
        "id": "iot",
        "name": "IoT",
        "icon": "Wifi",
        "route": "/ops/iot"
      },
      {
        "id": "events",
        "name": "Events",
        "icon": "Calendar",
        "route": "/ops/events"
      }
    ],
    "accessLevel": "standard",
    "status": "online",
    "health": {
      "score": 94,
      "lastCheck": "2026-11-27T00:02:27.284Z"
    },
    "metrics": {
      "tasksCompleted": 890,
      "avgResponseTime": 2.4,
      "successRate": 93.8,
      "activeConnections": 3
    },
    "order": 23
  },
  {
    "name": "Nancy",
    "code": "NANCY",
    "role": "HR & Performance",
    "departmentCode": "OPS",
    "avatar": "/avatars/nancy.png",
    "color": "#E11D48",
    "description": "Manages employees, recruitment, attendance, and performance reviews.",
    "capabilities": [
      "Employee Management",
      "Recruitment",
      "Attendance Tracking",
      "Performance Reviews"
    ],
    "features": [
      {
        "id": "employees",
        "name": "Employees",
        "icon": "Users",
        "route": "/hr/employees"
      },
      {
        "id": "recruitment",
        "name": "Recruitment",
        "icon": "UserPlus",
        "route": "/hr/recruitment"
      },
      {
        "id": "attendance",
        "name": "Attendance",
        "icon": "Clock",
        "route": "/hr/attendance"
      }
    ],
    "accessLevel": "elevated",
    "status": "online",
    "health": {
      "score": 98,
      "lastCheck": "2026-11-27T00:02:27.284Z"
    },
    "metrics": {
      "tasksCompleted": 2450,
      "avgResponseTime": 1.3,
      "successRate": 97.4,
      "activeConnections": 5
    },
    "order": 24
  },
  {
    "name": "Penny",
    "code": "PENNY",
    "role": "Commission Tracker",
    "departmentCode": "FIN",
    "avatar": "/avatars/penny.png",
    "color": "#CA8A04",
    "description": "Calculates commissions, manages payout schedules, and tracks agent earnings.",
    "capabilities": [
      "Commission Calculation",
      "Payout Scheduling",
      "Agent Earnings",
      "Performance Bonuses"
    ],
    "features": [
      {
        "id": "commissions",
        "name": "Commissions",
        "icon": "DollarSign",
        "route": "/finance/commissions"
      },
      {
        "id": "payouts",
        "name": "Payouts",
        "icon": "Send",
        "route": "/finance/payouts"
      }
    ],
    "accessLevel": "standard",
    "status": "online",
    "health": {
      "score": 97,
      "lastCheck": "2026-11-27T00:02:27.284Z"
    },
    "metrics": {
      "tasksCompleted": 1890,
      "avgResponseTime": 0.9,
      "successRate": 98.2,
      "activeConnections": 3
    },
    "order": 25
  },
  {
    "name": "Quinn",
    "code": "QUINN",
    "role": "Payment Processor",
    "departmentCode": "FIN",
    "avatar": "/avatars/quinn.png",
    "color": "#4F46E5",
    "description": "Manages payment gateway, transaction tracking, and refund processing.",
    "capabilities": [
      "Payment Gateway",
      "Transaction Tracking",
      "Refund Processing",
      "Payment Reconciliation"
    ],
    "features": [
      {
        "id": "gateway",
        "name": "Payment Gateway",
        "icon": "CreditCard",
        "route": "/finance/gateway"
      },
      {
        "id": "transactions",
        "name": "Transactions",
        "icon": "ArrowLeftRight",
        "route": "/finance/transactions"
      }
    ],
    "accessLevel": "elevated",
    "status": "online",
    "health": {
      "score": 100,
      "lastCheck": "2026-11-27T00:02:27.284Z"
    },
    "metrics": {
      "tasksCompleted": 4560,
      "avgResponseTime": 0.4,
      "successRate": 99.8,
      "activeConnections": 6
    },
    "order": 26
  },
  {
    "name": "Marcus",
    "code": "MARCUS",
    "role": "Campaign Manager",
    "departmentCode": "MKT",
    "avatar": "/avatars/marcus.png",
    "color": "#BE185D",
    "description": "Creates and manages marketing campaigns, A/B testing, and performance tracking.",
    "capabilities": [
      "Campaign Creation",
      "A/B Testing",
      "Performance Tracking",
      "Budget Management"
    ],
    "features": [
      {
        "id": "campaigns",
        "name": "Campaigns",
        "icon": "Target",
        "route": "/marketing/campaign-manager"
      },
      {
        "id": "ab-testing",
        "name": "A/B Testing",
        "icon": "Split",
        "route": "/marketing/ab-testing"
      }
    ],
    "accessLevel": "standard",
    "status": "online",
    "health": {
      "score": 95,
      "lastCheck": "2026-11-27T00:02:27.284Z"
    },
    "metrics": {
      "tasksCompleted": 1230,
      "avgResponseTime": 2.1,
      "successRate": 94.5,
      "activeConnections": 4
    },
    "order": 27
  },
  {
    "name": "Stella",
    "code": "STELLA",
    "role": "Content Creator",
    "departmentCode": "MKT",
    "avatar": "/avatars/stella.png",
    "color": "#DB2777",
    "description": "Manages content calendar, asset management, and copywriting.",
    "capabilities": [
      "Content Calendar",
      "Asset Management",
      "Copywriting",
      "Brand Voice"
    ],
    "features": [
      {
        "id": "calendar",
        "name": "Content Calendar",
        "icon": "Calendar",
        "route": "/marketing/calendar"
      },
      {
        "id": "assets",
        "name": "Assets",
        "icon": "Image",
        "route": "/marketing/assets"
      }
    ],
    "accessLevel": "standard",
    "status": "online",
    "health": {
      "score": 96,
      "lastCheck": "2026-11-27T00:02:27.284Z"
    },
    "metrics": {
      "tasksCompleted": 2340,
      "avgResponseTime": 1.7,
      "successRate": 95.8,
      "activeConnections": 3
    },
    "order": 28
  },
  {
    "name": "Vera",
    "code": "VERA",
    "role": "KYC Specialist",
    "departmentCode": "COMP",
    "avatar": "/avatars/vera.png",
    "color": "#7C3AED",
    "description": "Specializes in identity verification, document validation, and risk scoring.",
    "capabilities": [
      "Identity Verification",
      "Document Validation",
      "Risk Scoring",
      "Fraud Detection"
    ],
    "features": [
      {
        "id": "verification",
        "name": "Verification",
        "icon": "UserCheck",
        "route": "/compliance/verification"
      },
      {
        "id": "documents",
        "name": "Documents",
        "icon": "FileCheck",
        "route": "/compliance/documents"
      }
    ],
    "accessLevel": "elevated",
    "status": "online",
    "health": {
      "score": 99,
      "lastCheck": "2026-11-27T00:02:27.284Z"
    },
    "metrics": {
      "tasksCompleted": 3450,
      "avgResponseTime": 0.8,
      "successRate": 99.1,
      "activeConnections": 5
    },
    "order": 29
  },
  {
    "name": "Ivy",
    "code": "IVY",
    "role": "Ejari Specialist",
    "departmentCode": "LEGAL",
    "avatar": "/avatars/ivy.png",
    "color": "#059669",
    "description": "Handles Ejari registration, contract compliance, and renewal processing.",
    "capabilities": [
      "Ejari Registration",
      "Contract Compliance",
      "Renewal Processing",
      "DLD Coordination"
    ],
    "features": [
      {
        "id": "ejari",
        "name": "Ejari",
        "icon": "FileText",
        "route": "/legal/ejari"
      },
      {
        "id": "renewals",
        "name": "Renewals",
        "icon": "RefreshCw",
        "route": "/legal/renewals"
      }
    ],
    "accessLevel": "standard",
    "status": "online",
    "health": {
      "score": 98,
      "lastCheck": "2026-11-27T00:02:27.284Z"
    },
    "metrics": {
      "tasksCompleted": 2890,
      "avgResponseTime": 1.1,
      "successRate": 97.6,
      "activeConnections": 4
    },
    "order": 30
  },
  {
    "name": "Max",
    "code": "MAX",
    "role": "Document Processor",
    "departmentCode": "LEGAL",
    "avatar": "/avatars/max.png",
    "color": "#78716C",
    "description": "Generates documents, processes OCR, and manages document archival.",
    "capabilities": [
      "Document Generation",
      "OCR Processing",
      "Archival",
      "Template Management"
    ],
    "features": [
      {
        "id": "generate",
        "name": "Generate",
        "icon": "FilePlus",
        "route": "/legal/generate"
      },
      {
        "id": "ocr",
        "name": "OCR",
        "icon": "Scan",
        "route": "/legal/ocr"
      },
      {
        "id": "archive",
        "name": "Archive",
        "icon": "Archive",
        "route": "/legal/archive"
      }
    ],
    "accessLevel": "standard",
    "status": "online",
    "health": {
      "score": 94,
      "lastCheck": "2026-11-27T00:02:27.285Z"
    },
    "metrics": {
      "tasksCompleted": 4120,
      "avgResponseTime": 1.5,
      "successRate": 93.8,
      "activeConnections": 6
    },
    "order": 31
  },
  {
    "name": "Sage",
    "code": "SAGE",
    "role": "Market Analyst",
    "departmentCode": "INTEL",
    "avatar": "/avatars/sage.png",
    "color": "#65A30D",
    "description": "Analyzes market trends, generates pricing predictions, and tracks competitors.",
    "capabilities": [
      "Market Trends",
      "Pricing Predictions",
      "Competitor Tracking",
      "Investment Analysis"
    ],
    "features": [
      {
        "id": "analysis",
        "name": "Market Analysis",
        "icon": "BarChart2",
        "route": "/intel/analysis"
      },
      {
        "id": "pricing",
        "name": "Pricing",
        "icon": "DollarSign",
        "route": "/intel/pricing"
      }
    ],
    "accessLevel": "elevated",
    "status": "online",
    "health": {
      "score": 97,
      "lastCheck": "2026-11-27T00:02:27.285Z"
    },
    "metrics": {
      "tasksCompleted": 1670,
      "avgResponseTime": 2.5,
      "successRate": 96.3,
      "activeConnections": 3
    },
    "order": 32
  }
];
