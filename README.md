# Project Skeld: Round 1 Web App

Standalone web app for Round 1 of "Project Skeld", the Robotics Club NIT Warangal freshers event (Among Us theme).

## Tech Stack
- Next.js 16 (App Router)
- TypeScript (Strict)
- Tailwind CSS v4
- Drizzle ORM + PostgreSQL (Neon DB-only, pooled/unpooled connection strings — switched from Supabase 2026-09-26, see CLAUDE.md)
- Vitest & Playwright

## Getting Started
1. Install dependencies:
   ```bash
   npm install
   ```
2. Configure `.env.local` based on `.env.example`.
3. Run migrations:
   ```bash
   npx drizzle-kit migrate
   ```
4. Run development server:
   ```bash
   npm run dev
   ```
5. Run tests:
   ```bash
   npx vitest run
   ```
