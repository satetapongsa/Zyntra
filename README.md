# Zyntra — Enterprise Autonomous AI Workspace Platform

[![Next.js](https://img.shields.io/badge/Next.js-15.2.4-black?style=flat&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.0.0-blue?style=flat&logo=react)](https://react.dev/)
[![Prisma](https://img.shields.io/badge/Prisma-6.5.0-2D3748?style=flat&logo=prisma)](https://www.prisma.io/)
[![Neon Database](https://img.shields.io/badge/Neon-Serverless_Postgres-00E599?style=flat&logo=postgresql)](https://neon.tech/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8.2-3178C6?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v4-06B6D4?style=flat&logo=tailwindcss)](https://tailwindcss.com/)

> **Zyntra** is an enterprise-grade, privacy-first, self-hosted AI conversation orchestration platform engineered to bridge client applications with upstream LLMs (DeepSeek-R1 / DeepSeek-V3, OpenAI, Gemini, Claude). It features deep reasoning visualization, document attachment analysis, corporate prompt libraries, session export, and strict RBAC authorization.

---

## ⚡ Quick Start & Development

### 1. Requirements
- Node.js 20+
- PostgreSQL (or Serverless [Neon Database](https://neon.tech/))
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

# Sync schema to PostgreSQL / Neon
npx prisma db push

# Generate Prisma Client
npx prisma generate
```

### 3. Run Development Server

The application is configured to run on port **3300**:

```bash
npx next dev -p 3300
```

Open [http://localhost:3300](http://localhost:3300) in your browser.

---

## 🚀 Key Features

### 🧠 Collapsible Thinking Process (DeepSeek-R1 / Reasoning)
- **Real-Time Reasoning Parser:** Automatically extracts and isolates `<think>...</think>` tags during token streaming and upon completion.
- **Accordion Drawer:** Clean, collapsible UI allowing users to inspect or hide chain-of-thought analysis, architecture decisions, and reasoning steps without cluttering the final output.

### 📎 Document & Code Attachment Analysis
- **Attach Documents (📎):** Supports client-side ingestion of `.txt`, `.md`, `.json`, `.csv`, `.js`, `.ts`, `.tsx`, `.html`, `.css`, `.py`, `.sql` files up to 2MB.
- **Attachment Chips:** Interactive preview badges displaying file names, formatted sizes, and instant removal options.
- **Context Injection:** Seamlessly bundles document contents directly into the prompt payload for instant summarization, code reviews, and data extraction.

### 🏛️ Enterprise-Grade Chat Experience
- **Differentiated Capsule Message Flow:** High-contrast user capsules aligned alongside sleek, styled assistant surfaces labeled `ENTERPRISE AI`.
- **Telemetries & Action Bar:**
  - 📋 **Copy:** One-click copy with visual tick feedback.
  - 🔄 **Retry / Regenerate:** Regenerate responses on demand.
  - 👍 / 👎 **Feedback Ratings:** Helpful / Needs Improvement evaluation buttons.
  - ⏱️ **Telemetry Metrics:** Live response latency and token usage metrics.
- **📚 Enterprise Prompt Library:** Integrated template drawer for common enterprise workflows (Executive Briefings, Code Review, Formal Customer Communications, Meeting Action Items).
- **📥 Conversation Export:** Export full conversations as cleanly formatted Markdown (`.md`) files with timestamps and author headers.
- **🔒 Admin-Locked Preferences:** User Preferences (Model, Temperature, Maximum tokens, System Prompt) are locked and managed centrally by system administrators.

---

## 📐 High-Level Architecture

```mermaid
graph TB
    subgraph Client_Layer ["Client Tier (Browser / Mobile)"]
        UI["React 19 Client SPA<br/>(Thinking Drawer, File Attachments, Markdown, Presets)"]
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
        PostgresDB[("Neon Serverless PostgreSQL<br/>(Chats, Messages, Logs, Settings, Usage)")]
    end

    subgraph External_Cloud ["Upstream AI Providers"]
        DeepSeek["DeepSeek API (V3 / R1)"]
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

| Variable | Description | Example / Default |
| :--- | :--- | :--- |
| `DATABASE_URL` | Neon / PostgreSQL connection string | `postgresql://user:pass@host/neondb?sslmode=require` |
| `JWT_SECRET` | Cryptographic secret for JWTs ($\ge 32$ chars) | `replace-with-at-least-32-random-characters` |
| `AI_PROVIDER` | Upstream provider (`deepseek`, `openai`, `gemini`, `claude`) | `deepseek` |
| `DEEPSEEK_API_KEY` | DeepSeek API key | `sk-...` |
| `OPENAI_API_KEY` | OpenAI API key | `sk-...` |
| `GEMINI_API_KEY` | Google Gemini API key | `AIza...` |
| `CLAUDE_API_KEY` | Anthropic Claude API key | `sk-ant-...` |
| `AI_MODEL` | Provider model override | `deepseek-chat` |
| `APP_URL` | Application URL | `http://localhost:3300` |
| `DEMO_MODE` | Enable preview mock admin | `false` |

> 🔒 **Security Notice:** `.env` and `.env.*` files are strictly excluded via `.gitignore` to prevent secret leakage. Never commit production keys to version control.

---

## 🐳 Docker Deployment

Run database and app services with Docker Compose:

```bash
# Start PostgreSQL database container (if not using Neon)
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

Distributed under the [MIT License](LICENSE). Built for teams requiring autonomous control over generative AI workspaces.
