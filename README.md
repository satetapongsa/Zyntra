# Zyntra — Architectural Specification & System Design Document

[![Next.js](https://img.shields.io/badge/Next.js-15.2.4-black?style=flat&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.0.0-blue?style=flat&logo=react)](https://react.dev/)
[![Prisma](https://img.shields.io/badge/Prisma-6.5.0-2D3748?style=flat&logo=prisma)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?style=flat&logo=postgresql)](https://www.postgresql.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8.2-3178C6?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v4-06B6D4?style=flat&logo=tailwindcss)](https://tailwindcss.com/)

> **Document Classification:** Engineering Architecture & Operational Specification  
> **Target Audience:** Principal / Staff Engineers, SREs, Systems Architects, and Technical Leads  
> **Status:** Production-Ready Architectural Baseline  

---

## 1. Executive Summary & Architectural Overview

**Zyntra** is an enterprise-grade, privacy-first, self-hosted AI conversation orchestration platform. It is engineered to bridge client applications with diverse upstream Large Language Model (LLM) providers through a unified, fault-tolerant, streaming abstraction layer.

The architecture emphasizes **Zero-Trust Client Boundary**, **Sub-second Time-to-First-Token (TTFT)**, **Deterministic RBAC**, and **Strict Token Attribution / Audit Trails**.

### Core Value Drivers:
1. **Provider-Agnostic LLM Gateway:** Unified adapter interface supporting OpenAI-compatible APIs (DeepSeek, OpenAI, Google Gemini) alongside Anthropic Messages API, decoupling business logic from upstream schema shifts.
2. **Backpressure-Managed SSE Pipeline:** Pure `ReadableStream` implementation delivering real-time tokens to clients with atomic persistence of metrics upon stream completion.
3. **Stateless Edge Authentication with Stateful Audit:** High-speed HS256 signed JWT cookies for zero-latency route authorization, backed by full PostgreSQL ledgering of prompt completions, token consumption, and response latencies.
4. **Resilient Data Topology:** Fully relational schema with foreign key cascades, compound indices optimized for cursor pagination, and ACID-compliant transactional auditing.

---

## 2. High-Level Architecture (C4 Container Diagram)

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

## 3. System Decomposition & Layered Architecture

### 3.1 Presentation & State Management Layer
- **Framework:** Next.js 15 (React 19 Server & Client Components).
- **Styling Architecture:** Modern SaaS Dark Mode (`zinc-950` charcoal foundation, `zinc-800` hairline micro-borders, `lime-400` status accents) built with Tailwind CSS v4.
- **Rendering Strategy:** 
  - Dynamic route rendering for chat feeds and admin panels with SSR session hydration.
  - Streaming Markdown renderer powered by `react-markdown` and `remark-gfm` with incremental token consumption without UI re-render thrashing.
  - Client state manages optimistic updates for instant message rendering while the upstream SSE response streams asynchronously.

### 3.2 Security & Authentication Layer (`lib/auth.ts`)
- **Token Mechanism:** Stateless HS256 JWT managed via the `jose` cryptographic library. Minimum secret length enforced at $\ge 32$ bytes.
- **Cookie Security Policy:**
  - `HttpOnly`: Mitigates XSS-based token exfiltration.
  - `SameSite=Lax`: Mitigates Cross-Site Request Forgery (CSRF).
  - `Secure`: Forced in production (`NODE_ENV === 'production'`).
  - `Max-Age`: Hard 7-day TTL (`7d`).
- **Authorization Model:** Strict Role-Based Access Control (RBAC):
  - `USER`: Scoped strictly to personal chats, messages, and settings (`WHERE userId = session.sub`).
  - `ADMIN`: Unrestricted visibility across aggregated tenant usage, audit logs, and administrative ban/delete controls.
- **Sandboxed Demo Isolation:** A zero-database preview administrative principal (`preview-admin`) enabled only when `DEMO_MODE=true`, preventing test credentials from interacting with production database records.

---

## 4. End-to-End Chat & Streaming Lifecycle

The conversation lifecycle avoids HTTP buffering and delivers continuous chunked payloads using standard `text/event-stream` transport.

```mermaid
sequenceDiagram
    autonumber
    actor Client as User Browser
    participant API as /api/chat (Next.js)
    participant DB as PostgreSQL (Prisma)
    participant Adapter as Provider Gateway
    participant AI as Upstream LLM (e.g. DeepSeek)

    Client->>API: POST /api/chat (chatId, message)
    Note over API: Authenticate JWT from Cookie<br/>Validate Payload with Zod
    API->>DB: Fetch System Prompt & Recent Messages (take: 40)
    API->>DB: INSERT User Message into DB
    API->>Adapter: complete(turns, {stream: true, maxTokens, temp})
    Adapter->>AI: POST /v1/chat/completions (Stream: true, AbortSignal: 90s)
    
    activate AI
    AI-->>Adapter: 200 OK (text/event-stream)
    Adapter-->>API: Response Body ReadableStream
    API-->>Client: 200 OK (Transfer-Encoding: chunked, text/event-stream)
    
    loop Stream Chunks
        AI-->>API: SSE chunk ('data: {"choices":[{"delta":{"content":"..."}}]}')
        API-->>Client: data: {"text":"..."}\n\n
    end
    deactivate AI

    Note over API: Stream Finished ([DONE] received)<br/>Calculate estimated tokens & latency
    API->>DB: $transaction([Create Assistant Message, Create AiLog, Create ApiUsage])
    API-->>Client: data: {"done":true,"chatId":"..."}\n\n
    Client->>Client: Re-enable Input & Sync Local State
```

### Key Resiliency Guarantees:
- **Client Disconnection / Early Abort:** The gateway accepts `AbortSignal.timeout(90000)` to prevent zombie upstream connections from consuming cloud API credits.
- **Circuit Breaker / Single Retry:** Transparent 600ms backoff-retry on upstream `429 Rate Limit` or `5xx Gateway Error`.
- **Atomic Log Attribution:** Token consumption, response latency, and message histories are wrapped in a single ACID database transaction (`db.$transaction`) after stream closure, ensuring zero orphan telemetry.

---

## 5. Domain Data Architecture & Entity Relationships

The relational model utilizes PostgreSQL with explicit foreign key cascading rules and targeted compound indexes to ensure queries operate in $O(\log N)$ time complexity.

```mermaid
erDiagram
    User ||--o{ Chat : "owns"
    User ||--o{ AiLog : "triggers"
    User ||--o{ ApiUsage : "incurs"
    User ||--o| Setting : "configures"
    Chat ||--o{ Message : "contains"

    User {
        string id PK "cuid()"
        string name
        string email UK
        string password "bcrypt cost 12"
        enum role "USER | ADMIN"
        boolean banned
        string avatar
        datetime createdAt
        datetime updatedAt
    }

    Chat {
        string id PK "cuid()"
        string title
        boolean pinned
        boolean favorite
        string userId FK
        datetime createdAt
        datetime updatedAt
    }

    Message {
        string id PK "cuid()"
        string sessionId FK
        enum role "USER | ASSISTANT | SYSTEM"
        text content
        string model
        int tokens
        datetime createdAt
    }

    AiLog {
        string id PK "cuid()"
        string userId FK
        text prompt
        text response
        string model
        int responseTime "ms"
        int tokens
        datetime createdAt
    }

    ApiUsage {
        string id PK "cuid()"
        string userId FK
        string provider
        int tokens
        float cost
        datetime createdAt
    }

    Setting {
        string id PK "cuid()"
        string userId FK UK
        string theme
        string model
        float temperature
        string language
        int maxTokens
        float topP
        text systemPrompt
    }
```

### Indexing Topology & Query Optimization:
- **`Chat @@index([userId, updatedAt])`:** Supports zero-cost sorting and cursor pagination for the user's sidebar conversation list.
- **`Message @@index([sessionId, createdAt])`:** Guarantees chronological chat hydration within an active session without table scans.
- **`AiLog @@index([userId, createdAt])` & `ApiUsage @@index([userId, createdAt])`:** Powers tenant analytics and administrative audit dashboards with minimal index overhead.

---

## 6. Upstream LLM Adapter Specification (`lib/ai/provider.ts`)

The gateway provides a unified signature regardless of upstream wire protocols:

```typescript
type Turn = { role: 'user' | 'assistant' | 'system'; content: string };

interface CompletionOptions {
  temperature: number;
  maxTokens: number;
  topP: number;
  stream?: boolean;
}

export async function complete(
  turns: Turn[], 
  opts: CompletionOptions, 
  retry?: boolean
): Promise<Response>;
```

| Provider | Gateway Wire Protocol | System Prompt Handling | Default Upstream Target |
| :--- | :--- | :--- | :--- |
| **DeepSeek** | OpenAI Chat Completions | Integrated in message array (`role: 'system'`) | `https://api.deepseek.com/chat/completions` |
| **OpenAI** | OpenAI Chat Completions | Integrated in message array (`role: 'system'`) | `https://api.openai.com/v1/chat/completions` |
| **Google Gemini** | OpenAI Compatible Endpoint | Handled via Gemini OpenAI translation layer | `https://generativelanguage.googleapis.com/...` |
| **Anthropic Claude** | Messages API (`/v1/messages`) | Extracted as dedicated top-level `system` payload | `https://api.anthropic.com/v1/messages` |

---

## 7. Production Deployment & Security Runbook

### 7.1 Environment Variable Matrix

| Variable | Requirement | Default | Description |
| :--- | :--- | :--- | :--- |
| `DATABASE_URL` | **Required** | - | PostgreSQL connection string (`postgresql://user:pass@host:5432/db`) |
| `JWT_SECRET` | **Required** | - | Cryptographic secret for HS256 tokens ($\ge 32$ random characters) |
| `AI_PROVIDER` | Optional | `deepseek` | Active provider: `deepseek`, `openai`, `gemini`, `claude` |
| `DEEPSEEK_API_KEY` | Conditional | - | API key when `AI_PROVIDER=deepseek` |
| `OPENAI_API_KEY` | Conditional | - | API key when `AI_PROVIDER=openai` |
| `GEMINI_API_KEY` | Conditional | - | API key when `AI_PROVIDER=gemini` |
| `CLAUDE_API_KEY` | Conditional | - | API key when `AI_PROVIDER=claude` |
| `AI_MODEL` | Optional | Provider Default | Upstream model identifier override |
| `AI_BASE_URL` | Optional | Provider URL | Custom proxy/gateway URL (e.g. Helicone, LiteLLM) |
| `DEMO_MODE` | Operational | `false` | Enables isolated in-memory preview credentials |

---

### 7.2 Containerized Orchestration (`docker-compose.yml`)

The system provides a production container definition using multi-stage builds and minimal Alpine runtime footprints.

```bash
# 1. Provision Infrastructure & Database
docker compose up -d db

# 2. Execute Production Schema Migrations
npx prisma migrate deploy

# 3. Build & Run Application Services
docker compose up --build -d app
```

### 7.3 Security Baseline Checklist
- [x] **Zero Client-Side Secrets:** API credentials never leak to browser bundles (`NEXT_PUBLIC_` prefix intentionally omitted).
- [x] **Input Sanitization:** All payload surfaces validated with strict `zod` schemas.
- [x] **Injection Prevention:** SQL queries strictly parameterized via Prisma ORM engine.
- [x] **Brute-Force Hardening:** Passwords hashed with `bcryptjs` (salt cost 12).
- [x] **Buffer Bloat Mitigation:** Reverse proxy configured with `X-Accel-Buffering: no` to preserve real-time streaming buffers over HTTP/2 or HTTP/3.

---

## 8. License & Attribution

Distributed under the MIT License. Built for teams requiring autonomous control over generative AI workspaces.
