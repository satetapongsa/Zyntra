# Zyntra — Autonomous AI Workspace Platform

[![Next.js](https://img.shields.io/badge/Next.js-15.2.4-black?style=flat&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.0.0-blue?style=flat&logo=react)](https://react.dev/)
[![Prisma](https://img.shields.io/badge/Prisma-6.5.0-2D3748?style=flat&logo=prisma)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?style=flat&logo=postgresql)](https://www.postgresql.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8.2-3178C6?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v4-06B6D4?style=flat&logo=tailwindcss)](https://tailwindcss.com/)

> **Zyntra** is an enterprise-grade, privacy-first, self-hosted AI conversation orchestration platform. It connects client applications with multi-provider LLM backends (DeepSeek, OpenAI, Google Gemini, Anthropic Claude) through a fault-tolerant, streaming abstraction layer with token attribution and role-based access control.

---

## ⚡ Quick Start & Development

### 1. Requirements
- Node.js 20+
- PostgreSQL (or run via Docker)
- npm / pnpm / yarn

### 2. Installation & Setup

```bash
# Clone the repository
git clone https://github.com/satetapongsa/Zyntra.git
cd Zyntra

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env

# Generate Prisma Client
npx prisma generate
```

### 3. Run Development Server

To run the application locally on the customized default port **3333**:

```bash
npx next dev -p 3333
```

Open [http://localhost:3333](http://localhost:3333) in your browser.

---

## 🛠️ Features & Recent Updates

- **Streamlined Chat Header:** Clean, distraction-free header layout optimized for focused interactions.
- **Admin-Locked Preferences:** User Preferences (Model, Temperature, Maximum tokens, System Prompt) are locked and managed centrally by system administrators.
- **Multi-Provider LLM Gateway:** Unified adapter interface supporting OpenAI-compatible endpoints (DeepSeek, OpenAI, Gemini) and Anthropic Claude.
- **Backpressure-Managed SSE Pipeline:** Pure `ReadableStream` implementation delivering real-time tokens with atomic metrics persistence.
- **Stateless Edge Auth & RBAC:** Secure HS256 JWT HTTP-only cookies with deterministic user/admin authorization.

---

## 📐 High-Level Architecture

```mermaid
graph TB
    subgraph Client_Layer ["Client Tier (Browser / Mobile)"]
        UI["React 19 Client SPA<br/>(Markdown, Auto-Grow Textarea, State Machine)"]
    end

    subgraph Ingress_Layer ["Ingress & Reverse Proxy"]
        RP["Reverse Proxy / Cloudflare / Nginx<br/>(TLS Termination, DDoS, Rate Limiting)"]
    end

    subgraph Application_Tier ["Application Tier (Next.js 15 App Router)"]
        AuthMiddleware["Auth & RBAC Interceptor<br/>(jose HS256, HTTP-Only Cookies)"]
        APIRoutes["Route Handlers (Zod Schemas)"]
        StreamEngine["Streaming Engine<br/>(ReadableStream / Server-Sent Events)"]
        ProviderAdapter["Multi-Provider LLM Gateway<br/>(DeepSeek / OpenAI / Gemini / Claude)"]
    end

    subgraph Data_Tier ["Data & Persistence Tier"]
        PrismaORM["Prisma ORM Client (v6)"]
        PostgresDB[("PostgreSQL 16 Engine<br/>(Chats, Messages, Logs, Settings, Usage)")]
    end

    subgraph External_Cloud ["Upstream AI Providers"]
        DeepSeek["DeepSeek API"]
        OpenAI["OpenAI API"]
        Gemini["Google Gemini Gateway"]
        Anthropic["Anthropic Claude API"]
    end

    UI -->|"HTTPS / Cookie Session"| RP
    RP --> Application_Tier
    AuthMiddleware --> APIRoutes
    APIRoutes --> StreamEngine
    StreamEngine --> ProviderAdapter
    ProviderAdapter -->|"SSE Stream / AbortSignal"| External_Cloud
    APIRoutes --> PrismaORM
    StreamEngine -.->|"Atomic Transaction (onDone)"| PrismaORM
    PrismaORM -->|"TCP / Connection Pool"| PostgresDB
```

---

## ⚙️ Environment Variables

Copy `.env.example` to `.env` and configure:

| Variable | Description | Default |
| :--- | :--- | :--- |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://postgres:postgres@localhost:5432/converse?schema=public` |
| `JWT_SECRET` | Cryptographic secret for JWTs ($\ge 32$ chars) | - |
| `AI_PROVIDER` | Upstream provider (`deepseek`, `openai`, `gemini`, `claude`) | `deepseek` |
| `DEEPSEEK_API_KEY` | DeepSeek API key | - |
| `OPENAI_API_KEY` | OpenAI API key | - |
| `GEMINI_API_KEY` | Google Gemini API key | - |
| `CLAUDE_API_KEY` | Anthropic Claude API key | - |
| `AI_MODEL` | Provider model override | `deepseek-chat` |
| `AI_BASE_URL` | Custom base URL for AI gateway / proxy | - |
| `APP_URL` | Application URL | `http://localhost:3333` |
| `DEMO_MODE` | Enable preview mock admin | `false` |

---

## 🐳 Docker Deployment

Run database and app services with Docker Compose:

```bash
# Start PostgreSQL database
docker compose up -d db

# Run database migrations
npx prisma migrate deploy

# Build and start application container
docker compose up --build -d app
```

---

## 🔒 Security Baseline

- **Zero Client-Side Secrets:** All upstream API keys remain strictly server-side.
- **Strict Parameterization:** All SQL operations parameterized through Prisma ORM.
- **Input Validation:** Endpoints guarded by strict `zod` schemas.
- **Password Hashing:** Passwords encrypted using `bcryptjs` (salt cost 12).
- **Stream Buffering:** HTTP headers specify `X-Accel-Buffering: no` for smooth streaming.

---

## 📄 License

Distributed under the [MIT License](LICENSE).
