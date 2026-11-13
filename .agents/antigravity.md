# White Caves Server — Antigravity & AEGIS Sovereign Backend Node
# Location: C:\Users\Dell\Documents\antigravity\White-Caves\White-Caves-Server\.agents\antigravity.md
# Hierarchy: Server Project Layer

---
description: White Caves Server project-level Antigravity instructions, backend governance, and AEGIS engine execution.
globs: ["*"]
alwaysApply: true
---

# 1. Server Role & Authority
- Authoritative backend for White Caves Real Estate LLC.
- Host for Express/Fastify API, Prisma ORM, PostgreSQL/Supabase, Redis, and Background Micro-workers.
- Global rule reference: `~/.gemini/config/rules/antigravity.md`
- Monorepo umbrella reference: `../.agents/antigravity.md`

# 2. Key Server Rules
- Strictly adhere to `server-engineering.md` in `.agents/rules/`.
- All database modifications must be handled via Prisma migrations (`npx prisma migrate dev`).
- Secret abstraction: NEVER hardcode API keys or secrets in source code; use `.env` and `secrets/`.
- When user provides architectural or backend corrections:
  - Update `.agents/rules/server-engineering.md` or this file.
  - Log milestone to `White-Caves-Frontend/.agents/book-white-caves/` chronicler.
