// @ts-nocheck
export const ASSISTANTS_SEED_PART_2 = [
  {
    "name": "Maven",
    "code": "MAVEN",
    "role": "Investment Advisor",
    "departmentCode": "FIN",
    "avatar": "/avatars/maven.png",
    "color": "#A855F7",
    "description": "Provides investment portfolio analysis, yield calculations, and tax planning guidance.",
    "capabilities": [
      "Portfolio Analysis",
      "Yield Calculation",
      "Tax Planning",
      "Investment Advice"
    ],
    "features": [
      {
        "id": "portfolio",
        "name": "Portfolio",
        "icon": "PieChart",
        "route": "/finance/portfolio"
      },
      {
        "id": "yields",
        "name": "Yields",
        "icon": "TrendingUp",
        "route": "/finance/yields"
      }
    ],
    "accessLevel": "elevated",
    "status": "online",
    "health": {
      "score": 97,
      "lastCheck": "2026-11-27T00:02:27.282Z"
    },
    "metrics": {
      "tasksCompleted": 1560,
      "avgResponseTime": 2.3,
      "successRate": 96.8,
      "activeConnections": 2
    },
    "order": 12
  },
  {
    "name": "Olivia",
    "code": "OLIVIA",
    "role": "Research Lead",
    "departmentCode": "MKT",
    "avatar": "/avatars/olivia.png",
    "color": "#EC4899",
    "description": "Leads marketing campaigns, social media automation, and market intelligence gathering.",
    "capabilities": [
      "Campaign Management",
      "Social Media",
      "Marketing Automation",
      "Market Intelligence"
    ],
    "features": [
      {
        "id": "campaigns",
        "name": "Campaigns",
        "icon": "Megaphone",
        "route": "/marketing/campaigns"
      },
      {
        "id": "social",
        "name": "Social Media",
        "icon": "Share2",
        "route": "/marketing/social"
      },
      {
        "id": "automation",
        "name": "Automation",
        "icon": "Zap",
        "route": "/marketing/automation"
      }
    ],
    "accessLevel": "standard",
    "status": "online",
    "health": {
      "score": 98,
      "lastCheck": "2026-11-27T00:02:27.282Z"
    },
    "metrics": {
      "tasksCompleted": 3450,
      "avgResponseTime": 1.8,
      "successRate": 97.2,
      "activeConnections": 5
    },
    "order": 13
  },
  {
    "name": "Laila",
    "code": "LAILA",
    "role": "Brand Manager",
    "departmentCode": "COMP",
    "avatar": "/avatars/laila.png",
    "color": "#6366F1",
    "description": "Handles KYC verification, AML monitoring, contract review, and audit trail management.",
    "capabilities": [
      "KYC Verification",
      "AML Monitoring",
      "Contract Review",
      "Audit Trail"
    ],
    "features": [
      {
        "id": "kyc",
        "name": "KYC",
        "icon": "UserCheck",
        "route": "/compliance/kyc"
      },
      {
        "id": "aml",
        "name": "AML",
        "icon": "Shield",
        "route": "/compliance/aml"
      },
      {
        "id": "contracts",
        "name": "Contracts",
        "icon": "FileText",
        "route": "/compliance/contracts"
      }
    ],
    "accessLevel": "elevated",
    "status": "online",
    "health": {
      "score": 100,
      "lastCheck": "2026-11-27T00:02:27.282Z"
    },
    "metrics": {
      "tasksCompleted": 2180,
      "avgResponseTime": 1.2,
      "successRate": 99.5,
      "activeConnections": 3
    },
    "order": 14
  },
  {
    "name": "Henry",
    "code": "HENRY",
    "role": "Compliance Officer",
    "departmentCode": "TECH",
    "avatar": "/avatars/henry.png",
    "color": "#0EA5E9",
    "description": "Manages event logging, audit trails, timeline analytics, and compliance reporting.",
    "capabilities": [
      "Event Logging",
      "Audit Trail",
      "Timeline Analytics",
      "Compliance Reporting"
    ],
    "features": [
      {
        "id": "events",
        "name": "Events",
        "icon": "Activity",
        "route": "/tech/events"
      },
      {
        "id": "audit",
        "name": "Audit Log",
        "icon": "FileSearch",
        "route": "/tech/audit"
      },
      {
        "id": "timeline",
        "name": "Timeline",
        "icon": "Clock",
        "route": "/tech/timeline"
      }
    ],
    "accessLevel": "elevated",
    "status": "online",
    "health": {
      "score": 99,
      "lastCheck": "2026-11-27T00:02:27.282Z"
    },
    "metrics": {
      "tasksCompleted": 15600,
      "avgResponseTime": 0.2,
      "successRate": 99.9,
      "activeConnections": 12
    },
    "order": 15
  },
  {
    "name": "Aurora",
    "code": "AURORA",
    "role": "CTO Intelligence",
    "departmentCode": "TECH",
    "avatar": "/avatars/aurora.png",
    "color": "#7C3AED",
    "description": "Oversees system health, deployments, documentation, and AI governance.",
    "capabilities": [
      "System Monitoring",
      "Deployment Management",
      "Documentation",
      "AI Governance"
    ],
    "features": [
      {
        "id": "systems",
        "name": "Systems Health",
        "icon": "Server",
        "route": "/tech/systems"
      },
      {
        "id": "deployments",
        "name": "Deployments",
        "icon": "Rocket",
        "route": "/tech/deployments"
      },
      {
        "id": "docs",
        "name": "Documentation",
        "icon": "Book",
        "route": "/tech/docs"
      }
    ],
    "accessLevel": "executive",
    "status": "online",
    "health": {
      "score": 100,
      "lastCheck": "2026-11-27T00:02:27.282Z"
    },
    "metrics": {
      "tasksCompleted": 2890,
      "avgResponseTime": 0.5,
      "successRate": 99.7,
      "activeConnections": 6
    },
    "order": 16
  },
  {
    "name": "Hazel",
    "code": "HAZEL",
    "role": "Frontend UX",
    "departmentCode": "TECH",
    "avatar": "/avatars/hazel.png",
    "color": "#84CC16",
    "description": "Manages UI components, design system, accessibility, and theme customization.",
    "capabilities": [
      "UI Components",
      "Design System",
      "Accessibility",
      "Theme Management"
    ],
    "features": [
      {
        "id": "components",
        "name": "Components",
        "icon": "Layers",
        "route": "/tech/components"
      },
      {
        "id": "design",
        "name": "Design System",
        "icon": "Palette",
        "route": "/tech/design"
      }
    ],
    "accessLevel": "standard",
    "status": "online",
    "health": {
      "score": 96,
      "lastCheck": "2026-11-27T00:02:27.283Z"
    },
    "metrics": {
      "tasksCompleted": 1420,
      "avgResponseTime": 1.6,
      "successRate": 95.4,
      "activeConnections": 3
    },
    "order": 17
  },
  {
    "name": "Willow",
    "code": "WILLOW",
    "role": "Backend Ops",
    "departmentCode": "TECH",
    "avatar": "/avatars/willow.png",
    "color": "#14B8A6",
    "description": "Manages APIs, database operations, performance optimization, and security.",
    "capabilities": [
      "API Management",
      "Database Ops",
      "Performance",
      "Security"
    ],
    "features": [
      {
        "id": "apis",
        "name": "APIs",
        "icon": "Code",
        "route": "/tech/apis"
      },
      {
        "id": "database",
        "name": "Database",
        "icon": "Database",
        "route": "/tech/database"
      },
      {
        "id": "security",
        "name": "Security",
        "icon": "Lock",
        "route": "/tech/security"
      }
    ],
    "accessLevel": "elevated",
    "status": "online",
    "health": {
      "score": 98,
      "lastCheck": "2026-11-27T00:02:27.283Z"
    },
    "metrics": {
      "tasksCompleted": 3560,
      "avgResponseTime": 0.4,
      "successRate": 98.6,
      "activeConnections": 8
    },
    "order": 18
  },
  {
    "name": "Cipher",
    "code": "CIPHER",
    "role": "Market Intel",
    "departmentCode": "INTEL",
    "avatar": "/avatars/cipher.png",
    "color": "#0D9488",
    "description": "Analyzes market trends, generates predictions, and tracks competitor activities.",
    "capabilities": [
      "Market Trends",
      "Price Predictions",
      "Competitor Tracking",
      "Economic Analysis"
    ],
    "features": [
      {
        "id": "trends",
        "name": "Market Trends",
        "icon": "TrendingUp",
        "route": "/intel/trends"
      },
      {
        "id": "predictions",
        "name": "Predictions",
        "icon": "Sparkles",
        "route": "/intel/predictions"
      },
      {
        "id": "competitors",
        "name": "Competitors",
        "icon": "Users",
        "route": "/intel/competitors"
      }
    ],
    "accessLevel": "elevated",
    "status": "online",
    "health": {
      "score": 97,
      "lastCheck": "2026-11-27T00:02:27.283Z"
    },
    "metrics": {
      "tasksCompleted": 1890,
      "avgResponseTime": 3.2,
      "successRate": 96.1,
      "activeConnections": 4
    },
    "order": 19
  },
  {
    "name": "Atlas",
    "code": "ATLAS",
    "role": "API Monitor",
    "departmentCode": "INTEL",
    "avatar": "/avatars/atlas.png",
    "color": "#0369A1",
    "description": "Tracks off-plan projects, feasibility analysis, and zoning information.",
    "capabilities": [
      "Project Tracking",
      "Feasibility Analysis",
      "Developer Monitoring",
      "Zoning Info"
    ],
    "features": [
      {
        "id": "projects",
        "name": "Projects",
        "icon": "Building2",
        "route": "/intel/projects"
      },
      {
        "id": "feasibility",
        "name": "Feasibility",
        "icon": "Calculator",
        "route": "/intel/feasibility"
      }
    ],
    "accessLevel": "standard",
    "status": "online",
    "health": {
      "score": 95,
      "lastCheck": "2026-11-27T00:02:27.283Z"
    },
    "metrics": {
      "tasksCompleted": 2340,
      "avgResponseTime": 2.8,
      "successRate": 94.7,
      "activeConnections": 3
    },
    "order": 20
  },
  {
    "name": "Evangeline",
    "code": "EVANGELINE",
    "role": "Legal Risk",
    "departmentCode": "LEGAL",
    "avatar": "/avatars/evangeline.png",
    "color": "#EF4444",
    "description": "Analyzes legal risks, reviews contracts, and ensures regulatory compliance.",
    "capabilities": [
      "Risk Analysis",
      "Contract Review",
      "Regulatory Compliance",
      "Best Practices"
    ],
    "features": [
      {
        "id": "risks",
        "name": "Risk Analysis",
        "icon": "AlertTriangle",
        "route": "/legal/risks"
      },
      {
        "id": "contracts",
        "name": "Contracts",
        "icon": "FileText",
        "route": "/legal/contracts"
      },
      {
        "id": "regulations",
        "name": "Regulations",
        "icon": "Scale",
        "route": "/legal/regulations"
      }
    ],
    "accessLevel": "elevated",
    "status": "online",
    "health": {
      "score": 99,
      "lastCheck": "2026-11-27T00:02:27.283Z"
    },
    "metrics": {
      "tasksCompleted": 1560,
      "avgResponseTime": 2.1,
      "successRate": 98.9,
      "activeConnections": 2
    },
    "order": 21
  },
  {
    "name": "Vesta",
    "code": "VESTA",
    "role": "Project Handover",
    "departmentCode": "OPS",
    "avatar": "/avatars/vesta.png",
    "color": "#F97316",
    "description": "Manages project milestones, snagging, handovers, and defect tracking.",
    "capabilities": [
      "Milestone Tracking",
      "Snagging",
      "Handover Management",
      "Defect Tracking"
    ],
    "features": [
      {
        "id": "milestones",
        "name": "Milestones",
        "icon": "Flag",
        "route": "/ops/milestones"
      },
      {
        "id": "snagging",
        "name": "Snagging",
        "icon": "ClipboardList",
        "route": "/ops/snagging"
      },
      {
        "id": "handover",
        "name": "Handover",
        "icon": "Key",
        "route": "/ops/handover"
      }
    ],
    "accessLevel": "standard",
    "status": "online",
    "health": {
      "score": 96,
      "lastCheck": "2026-11-27T00:02:27.283Z"
    },
    "metrics": {
      "tasksCompleted": 1120,
      "avgResponseTime": 1.9,
      "successRate": 95.6,
      "activeConnections": 4
    },
    "order": 22
  }
];
