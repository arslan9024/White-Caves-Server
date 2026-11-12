# White-Caves Server — Antigravity Engineering Rules

## 1. Core Directives
- **Prisma & Data Layer:** All schema mutations require valid Prisma migrations. Never run raw untyped queries where Prisma models exist.
- **Statutory UAE Compliance:** Maintain strict accounting invariants (5% UAE FTA VAT, 9% Corporate Tax reserves, DLD/Ejari idempotency).
- **Security & Secret Abstraction:** Never hardcode secrets. Always read from environment variables (`.env`).
- **Endpoint Timeouts & Resilience:** External government or third-party APIs must have timeouts (1500ms max) and exponential backoff retry wrappers.
