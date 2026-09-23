# Zyntra

A self-hosted AI chat workspace built with Next.js App Router, TypeScript, Prisma, PostgreSQL and server-side AI provider adapters.

## Features

- Email and password registration/login with bcrypt hashes and HTTP-only signed session cookies.
- Persistent conversations, messages, settings, usage records, favorites and pinned chats.
- Streaming OpenAI-compatible chat completion APIs, including DeepSeek, OpenAI, and Gemini. Anthropic Claude is also supported.
- User-controlled model, temperature, token cap and system prompt settings.
- Markdown and GitHub-flavored Markdown rendering; responsive layout, search and starter prompts.
- Role-guarded admin overview, user ban/delete, aggregate usage counts and conversation visibility.
- PostgreSQL schema with cascading relations and useful indexes; Docker Compose for local deployment.

## Run locally

1. Install Node.js 20+ and Docker (or use a managed PostgreSQL database).
2. Copy `.env.example` to `.env`. Set a random `JWT_SECRET` of at least 32 characters and the API key for your selected provider.
3. Start PostgreSQL: `docker compose up -d db`
4. Install and prepare: `npm install`, `npx prisma generate`, `npx prisma migrate dev --name init`
5. Start Next.js: `npm run dev`, then open http://localhost:3000.

For full container deployment: `docker compose up --build -d`. Database schema is applied separately with `npx prisma migrate deploy` before serving traffic.

## Providers

Set `AI_PROVIDER` to `deepseek`, `openai`, `gemini`, or `claude`, and set the corresponding API key. The server chooses a provider default model, overridable with `AI_MODEL`. `AI_BASE_URL` can override the provider URL for compatible gateways. Keys are only read in server code and never returned to the browser. Claude calls use the Anthropic Messages API; the other adapters use OpenAI-compatible chat completions.

## Admin

New accounts have the `USER` role. Promote an account to `ADMIN` through a trusted database operation, for example:

```sql
UPDATE "User" SET role = 'ADMIN' WHERE email = 'admin@example.com';
```

Admin routes verify the signed-in user's database role on each request. Admin conversation visibility is a privileged feature; restrict admin access and database credentials accordingly.

## Deploy

- Use a managed PostgreSQL URL from Neon, Supabase, Railway, or another PostgreSQL service. For pooled serverless connections, use provider-recommended Prisma connection options.
- Store secrets in the deployment platform's secret manager. Never add `.env` to source control.
- Apply migrations during deployment with `npx prisma migrate deploy`.
- Run behind HTTPS. The session cookie is marked `Secure` in production.
- Set `APP_URL` to the public origin. Configure provider limits and platform request duration for streaming.
- Back up PostgreSQL and set a retention policy for chat content and usage logs.

## Security and operational notes

Passwords use bcrypt cost 12; session JWTs expire after seven days and are stored in HTTP-only, SameSite=Lax cookies. API inputs are validated with Zod, Prisma parameterizes database operations, chat/profile endpoints enforce ownership, and request bodies are size-limited at the application layer. Provider secrets stay server-side. Keep Next.js and dependencies patched, terminate TLS at a trusted proxy, add infrastructure rate limiting/WAF rules, and configure monitoring/log redaction before public launch. Chat prompts and responses are persisted as requested and may contain sensitive information.

This repository is a production-oriented application foundation. Before serving real users, perform an environment-specific security review, add operational rate limits and account recovery/email verification, establish backups/retention, and verify provider billing and data policies. API usage token counts are estimated from response text where providers do not expose consistent streaming usage metadata.
