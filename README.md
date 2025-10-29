

# 🧠 AI Interview Assistant

A comprehensive **AI-powered interview platform** built with **Next.js 15**, featuring dual interfaces for interviewees and interviewers, automated question generation, real-time scoring, resume intelligence, and session recovery — all in a secure, accessible, and production-ready architecture.

> **Live Demo**: [https://github.com/TheRougeRoyal/ai-interview-assistant](https://github.com/TheRougeRoyal/ai-interview-assistant)

---

## 🚀 Features

### 🎯 Interviewee Experience
- **Resume Upload** – PDF/DOCX support with intelligent text extraction (PDF.js + Mammoth.js)  
- **AI Resume Analysis** – Automatic skill extraction, experience categorization, and quality scoring
- **Profile Gating** – Chatbot-style data collection (name, email, phone)  
- **Timed Interview** – 6 questions with progressive difficulty (2 easy, 2 medium, 2 hard)
  - Easy: 20 seconds each
  - Medium: 60 seconds each
  - Hard: 120 seconds each
- **Auto-Submit** – Automatic submission when timer expires  
- **Session Recovery** – "Welcome Back" modal for interrupted sessions  
- **Accessibility** – Keyboard navigation, screen-reader support, and time extensions

### 🧑‍💼 Interviewer Dashboard
- **User Authentication** – Secure login with JWT and Supabase integration
- **Role-Based Access Control** – Separate interviewer and interviewee roles
- **Candidate Management** – Sortable / searchable table with virtualization for performance
- **Detailed Views** – Full Q&A history, resume details, and AI analysis
- **Scoring System** – Rubric-based evaluation (Accuracy, Completeness, Relevance, Timeliness)  
- **AI Summary** – Automatic candidate summaries highlighting strengths & areas for improvement
- **Audit Logging** – Complete activity tracking for compliance and security  

### ⚙️ Technical Features
- **AI Gateway** – Vendor-agnostic integration (OpenAI, DeepSeek, + Mock)  
- **Circuit Breaker** – Automatic failure detection and recovery  
- **Retry Logic** – Exponential backoff for transient failures  
- **Fallback Strategies** – Graceful degradation when AI is unavailable  
- **Resume Analysis** – Structured extraction with skill categorization, experience parsing, and quality scoring  
- **PDF Processing** – Native PDF.js parsing with metadata extraction  
- **DOCX Processing** – Mammoth.js integration for Word document support
- **File Processing Queue** – Background job processing with Prisma-based queue
- **State Persistence** – Redux Toolkit + Redux Persist (IndexedDB via localForage) with session recovery  
- **Real-time Updates** – Live timers & progress tracking  
- **Health Monitoring** – System health checks for AI, database, and application status
- **Performance Optimization** – Caching, lazy loading, and virtualized tables
- **Security Hardening** – JWT authentication, RBAC, rate limiting, CORS, CSP headers
- **Audit Trail** – Comprehensive logging of all system activities
- **Fairness Checks** – Bias-free AI evaluation guidelines  

---

## 🧩 Tech Stack

| Layer | Technology |
|-------|-------------|
| **Frontend** | Next.js 15 · React 19 · TypeScript 5.9 |
| **Styling** | Tailwind CSS 4.1 · shadcn/ui |
| **State Management** | Redux Toolkit 2.9 · Redux Persist 6.0 |
| **AI Integration** | DeepSeek API · OpenAI API 5.23 · Mock Fallback |
| **Resilience** | Circuit Breaker · Retry · Caching · Fallback |
| **Authentication** | Supabase Auth · JWT (jose) · bcryptjs |
| **PDF Processing** | PDF.js (native) · pdf-parse |
| **DOCX Processing** | Mammoth.js 1.11 |
| **File Queue** | Prisma-based job queue with retry logic |
| **Testing** | Playwright 1.55 (E2E) · Vitest 3.2 (Unit) |
| **Database** | Prisma 6.18 · SQLite (dev) · PostgreSQL (prod) |
| **Validation** | Zod 3.25 |
| **Deployment** | Vercel · Docker support |

---

## 🧰 Getting Started

### Prerequisites
- Node.js 18 +
- npm or yarn

### Installation
```bash
git clone https://github.com/TheRougeRoyal/ai-interview-assistant.git
cd ai-interview-assistant
npm install
cp env.example .env.local
```

Edit `.env.local`:

```env
# AI Configuration
AI_VENDOR=deepseek   # 'deepseek', 'openai', or 'mock'

# DeepSeek Configuration (Recommended - Cost-effective)
DEEPSEEK_API_KEY=sk-your-deepseek-key-here
AI_MODEL=deepseek-chat

# OpenAI Configuration (Alternative)
OPENAI_API_KEY=sk-your-openai-key-here
AI_MODEL=gpt-4o-mini

# Database
DATABASE_URL="file:./prisma/dev.db"

# Supabase Authentication (Required for multi-user features)
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Security
JWT_SECRET=your-secure-secret-here   # Generate with: openssl rand -base64 32

# Optional Configuration
UPLOAD_MAX_MB=5
MAX_TOKENS=512
NEXT_PUBLIC_PERSIST_TO_API=false
NEXT_PUBLIC_SHOW_DEBUG=false
```

**🎉 DeepSeek Integration**: This project supports DeepSeek AI for cost-effective, high-quality interview assessments. DeepSeek offers competitive pricing at ~$0.14/$0.28 per million tokens (vs OpenAI's $0.15/$0.60). See [DEEPSEEK_INTEGRATION.md](./DEEPSEEK_INTEGRATION.md) for details.

**🔐 Supabase Authentication**: For multi-user features with role-based access control, set up Supabase authentication. See [SUPABASE_AUTH_SETUP.md](./SUPABASE_AUTH_SETUP.md) for complete setup instructions.

Initialize the database:

```bash
npx prisma generate
npm run db:push
```

*Optional: Seed with test data*

```bash
npm run db:seed
```

Start the development server:

```bash
npm run dev
```

---

## 🧪 Available Scripts

```bash
# Development
npm run dev            # Start dev server (http://localhost:3000)
npm run build          # Build for production
npm run start          # Start production server
npm run lint           # Run ESLint
npm run type-check     # Run TypeScript checks (alias: typecheck)

# Testing
npm run test           # Run all Vitest tests
npm run test:unit      # Run unit tests only
npm run test:integration # Run integration tests
npm run test:watch     # Run tests in watch mode
npm run test:coverage  # Generate test coverage report
npm run test:e2e       # Install Playwright & run E2E tests
npm run test:e2e:run   # Run E2E tests (Playwright must be installed)
npm run e2e            # Run Playwright E2E tests
npm run e2e:ui         # Run E2E tests with Playwright UI
npm run test:performance # Run performance benchmarks
npm run test:load      # Run load testing

# Database
npm run db:push        # Push Prisma schema to database
npm run db:migrate     # Run Prisma migrations (production)
npm run db:studio      # Open Prisma Studio
npm run db:seed        # Seed development data
npm run db:seed:dev    # Seed development environment
npm run db:seed:staging # Seed staging environment
npm run db:seed:production # Seed production environment
npm run db:seed:clear  # Clear all seeded data
npm run db:seed:random # Seed with random test data

# Utilities
npm run test-pdf       # Test native PDF parsing
npm run test-ai-resume # Test AI resume analysis
npm run process-resumes # Process resume files
npm run process-resumes:dry # Dry-run resume processing
```

---

## ☁️ Deployment

### ▶️ Vercel (Recommended)

1. Fork and connect your GitHub repo to [Vercel](https://vercel.com)

2. Set environment variables in Vercel Dashboard:

   | Variable         | Example / Description             | Required |
   | ---------------- | --------------------------------- | -------- |
   | `AI_VENDOR`      | `deepseek` or `openai`            | ✅ Yes   |
   | `DEEPSEEK_API_KEY` | Your DeepSeek API key           | If using DeepSeek |
   | `OPENAI_API_KEY` | Your OpenAI API key               | If using OpenAI |
   | `AI_MODEL`       | `deepseek-chat` or `gpt-4o-mini`  | ✅ Yes   |
   | `DATABASE_URL`   | PostgreSQL connection string      | ✅ Yes   |
   | `JWT_SECRET`     | Random 32+ char secret            | ✅ Yes   |
   | `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL | For auth |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key | For auth |
   | `SUPABASE_SERVICE_ROLE_KEY` | Supabase service key | For auth |

3. Deploy automatically on push to `main`

**Note**: For production, use PostgreSQL instead of SQLite. Update `DATABASE_URL` accordingly.

### 🐳 Docker Deployment

```bash
# Production build
docker-compose up -d

# Development with hot reload
docker-compose -f docker-compose.dev.yml up
```

---

## 🧩 API Endpoints

### Public Endpoints
| Method | Endpoint                     | Description                     |
| ------ | ---------------------------- | ------------------------------- |
| POST   | `/api/parse-resume`          | Extract text + PII from resumes |
| POST   | `/api/assess-resume`         | AI-powered resume analysis      |
| POST   | `/api/process-resume`        | Complete resume processing      |
| POST   | `/api/generate-question`     | Generate AI interview questions |
| POST   | `/api/score-answer`          | Score candidate answers         |
| POST   | `/api/summary`               | Generate AI candidate summary   |

### Authentication Endpoints
| Method | Endpoint                     | Description                     |
| ------ | ---------------------------- | ------------------------------- |
| POST   | `/api/auth/register`         | Register new user               |
| POST   | `/api/auth/login`            | User login                      |
| POST   | `/api/auth/logout`           | User logout                     |
| GET    | `/api/auth/me`               | Get current user                |
| POST   | `/api/auth/refresh`          | Refresh auth token              |
| POST   | `/api/auth/token`            | Get new access token            |

### Protected Endpoints (Require Authentication)
| Method | Endpoint                     | Description                     |
| ------ | ---------------------------- | ------------------------------- |
| GET    | `/api/candidates`            | List all candidates             |
| GET    | `/api/candidates/[id]`       | Get candidate details           |
| GET    | `/api/candidates/[id]/full`  | Get complete candidate data     |
| POST   | `/api/sessions`              | Create interview session        |
| GET    | `/api/sessions/[id]`         | Get session details             |
| POST   | `/api/sessions/[id]/answers` | Submit answer                   |

### Health & Monitoring
| Method | Endpoint                     | Description                     |
| ------ | ---------------------------- | ------------------------------- |
| GET    | `/api/health`                | System health check             |
| GET    | `/api/health/ai`             | AI service health               |
| GET    | `/api/health/database`       | Database health                 |
| GET    | `/api/health/database/metrics` | Database performance metrics  |
| GET    | `/api/metrics`               | Application metrics             |
| GET    | `/api/audit-logs`            | Audit trail logs                |
| GET    | `/api/notifications`         | System notifications            |

---

## 🧠 Architecture Overview

### AI Gateway Pattern

* **Vendor Abstraction**: Single entry point (`lib/ai/gateway.ts`) for all AI calls
* **Multiple Providers**: OpenAI, DeepSeek, and Mock implementations
* **Circuit Breaker**: Automatic failure detection and recovery with configurable thresholds
* **Retry Logic**: Exponential backoff for transient failures (3 retries by default)
* **Fallback Chain**: Graceful degradation from primary → secondary → mock
* **Schema Validation**: Zod-based validation for all AI responses
* **Error Normalization**: Consistent error handling across vendors

### Resume Processing Pipeline

* **Multi-format Support**: PDF (via PDF.js) and DOCX (via Mammoth.js)
* **Intelligent Extraction**: Text extraction with confidence scores
* **PII Detection**: Regex-based detection of emails, phones, names
* **AI Analysis**: Structured skill extraction, experience parsing, quality scoring
* **Job Queue**: Prisma-based background processing with retry logic
* **Progress Tracking**: Real-time progress updates for long-running operations
* **Fallback Strategy**: Native parsing → heuristics → AI fallback

### State Management Architecture

* **Redux Toolkit**: Centralized state with slice-based organization
* **Redux Persist**: Automatic persistence to IndexedDB via localForage
* **Session Recovery**: "Welcome Back" modal for interrupted sessions
* **Normalized Data**: Entity-adapter pattern for efficient data access
* **Optimistic Updates**: Instant UI feedback with server sync
* **Migration Support**: Version-based state migrations

### Authentication & Security

* **Supabase Auth**: Industry-standard authentication with Row Level Security
* **JWT Tokens**: Secure token-based authentication with jose
* **Role-Based Access**: Separate interviewer and interviewee permissions
* **Session Management**: Automatic token refresh and session validation
* **Password Hashing**: bcryptjs with salt rounds for secure storage
* **Audit Logging**: Complete activity tracking for compliance

### Database Design

* **Prisma ORM**: Type-safe database access with migrations
* **SQLite (Dev)**: Zero-config local development
* **PostgreSQL (Prod)**: Scalable production database
* **Optimized Indexes**: Performance-tuned queries
* **Cascade Deletes**: Clean data relationships
* **Soft Deletes**: Optional data retention (via timestamps)

---

## 🧱 CI/CD & Quality Checks

### GitHub Actions Workflows

The project includes comprehensive CI/CD pipelines:

**Build & Test Job**
- ✅ Install dependencies with caching
- ✅ ESLint code quality checks
- ✅ TypeScript strict type checking
- ✅ Unit tests with Vitest
- ✅ Integration tests
- ✅ Production build verification
- ✅ PostgreSQL service for testing

**E2E Testing Job** (Optional)
- ✅ Playwright tests on Chromium, Firefox, WebKit
- ✅ Automated browser installation
- ✅ Parallel test execution

**Preview Deploy** (Pull Requests)
- ✅ Automatic Vercel preview deployments
- ✅ Per-PR preview URLs for testing

**Production Deploy** (main branch)
- ✅ Automatic production deployment to Vercel
- ✅ Environment variable management

### Branch Protection Recommendations

To maintain code quality on `main`:

1. **Enable Branch Protection**
   - Require pull request reviews (≥ 1 approval)
   - Require status checks to pass:
     - `build-and-test` (required)
     - `e2e` (optional but recommended)
   - Require branches to be up-to-date before merging

2. **Optional Enhanced Security**
   - Require signed commits
   - Restrict direct pushes to main
   - Enable automatic deletion of merged branches
   - Require linear history

3. **Status Check Configuration**
   - Set `build-and-test` as required
   - Set `e2e` as optional for faster merges
   - Configure Vercel preview as optional

---

## 🧭 Roadmap

### 🎯 Planned Features
- [ ] **Multi-language Support** – Internationalization (i18n) for global reach
- [ ] **Video Recording** – Record candidate responses for review
- [ ] **Advanced Analytics** – Detailed performance metrics and trends
- [ ] **Custom Question Banks** – Create and manage question repositories
- [ ] **Interview Templates** – Pre-configured interview workflows
- [ ] **Email Notifications** – Automated candidate communication
- [ ] **Calendar Integration** – Schedule and manage interview slots
- [ ] **OCR Support** – Extract text from scanned/image PDFs
- [ ] **PDF Reports** – Export candidate assessments as PDFs
- [ ] **Team Collaboration** – Multi-interviewer scoring and notes
- [ ] **Webhook Integration** – Connect with ATS and HR systems
- [ ] **Mobile App** – Native iOS/Android applications

### ✅ Completed Features
- [x] AI-powered question generation with difficulty levels
- [x] Native PDF parsing with PDF.js
- [x] DeepSeek AI integration for cost savings
- [x] Resume analysis with skill extraction
- [x] User authentication with Supabase
- [x] Role-based access control
- [x] Session recovery for interrupted interviews
- [x] Real-time countdown timers
- [x] Rubric-based scoring system
- [x] Audit logging and compliance tracking
- [x] Docker containerization
- [x] CI/CD pipeline with GitHub Actions
- [x] Comprehensive test coverage (Unit + E2E)

---

## 📈 Performance Benchmarks

### Resume Processing Performance

| File Size         | Format | Processing Time | Memory Usage |
| ----------------- | ------ | --------------- | ------------ |
| Small (< 1 MB)    | PDF    | ~400 ms         | ~15 MB       |
| Medium (1-3 MB)   | PDF    | ~1.8 s          | ~40 MB       |
| Large (3-5 MB)    | PDF    | ~4.5 s          | ~80 MB       |
| Small (< 1 MB)    | DOCX   | ~250 ms         | ~10 MB       |
| Medium (1-3 MB)   | DOCX   | ~1.2 s          | ~30 MB       |

*All processing is in-memory with zero disk I/O for security*

### AI Operations Latency

| Operation           | DeepSeek       | OpenAI         | Mock           |
| ------------------- | -------------- | -------------- | -------------- |
| Question Generation | 1.5 - 2.5 s    | 2 - 3 s        | < 50 ms        |
| Answer Scoring      | 1 - 1.5 s      | 1 - 2 s        | < 30 ms        |
| Resume Analysis     | 2 - 3 s        | 3 - 4 s        | < 100 ms       |
| Summary Generation  | 1.5 - 2 s      | 2 - 3 s        | < 50 ms        |

*Measured on 100 Mbps connection, may vary based on network conditions*

### Database Performance

| Operation           | SQLite (Dev)   | PostgreSQL (Prod) |
| ------------------- | -------------- | ----------------- |
| Candidate Insert    | ~5 ms          | ~15 ms            |
| Candidate Query     | ~2 ms          | ~8 ms             |
| Session Create      | ~8 ms          | ~20 ms            |
| Answer Batch Insert | ~12 ms         | ~35 ms            |
| Full Candidate Fetch| ~15 ms         | ~40 ms            |

### Frontend Performance

| Metric              | Target         | Actual         |
| ------------------- | -------------- | -------------- |
| First Contentful Paint | < 1.5 s     | ~1.2 s         |
| Time to Interactive | < 3 s          | ~2.5 s         |
| Largest Contentful Paint | < 2.5 s   | ~2.1 s         |
| Cumulative Layout Shift | < 0.1      | ~0.05          |

*Measured on Vercel with Lighthouse in production mode*

---

## 🔒 Security & Privacy

### Data Protection
* ✅ **Zero Disk Storage** – No resume files written to disk
* ✅ **In-Memory Processing** – All parsing happens in RAM
* ✅ **No Third-Party Services** – Direct AI API calls only
* ✅ **Secure Transmission** – HTTPS enforcement in production
* ✅ **Data Encryption** – Database encryption at rest (when configured)

### Authentication & Authorization
* ✅ **Supabase Auth** – Industry-standard authentication
* ✅ **JWT Tokens** – Secure token-based sessions
* ✅ **Password Hashing** – bcryptjs with salt rounds
* ✅ **RBAC** – Role-based access control (interviewer/interviewee)
* ✅ **Session Management** – Automatic token refresh and expiration
* ✅ **API Key Protection** – Server-side only, never exposed to client

### Application Security
* ✅ **Input Validation** – Zod schema validation on all inputs
* ✅ **SQL Injection Protection** – Prisma ORM parameterized queries
* ✅ **XSS Protection** – React automatic escaping + CSP headers
* ✅ **CSRF Protection** – SameSite cookie attributes
* ✅ **Rate Limiting** – Configurable API rate limits
* ✅ **CORS Configuration** – Restricted origins in production
* ✅ **Security Headers** – Helmet-style security headers
* ✅ **Audit Logging** – Complete activity trail for compliance

### Compliance Features
* ✅ **GDPR Ready** – Data export and deletion capabilities
* ✅ **Audit Trails** – Comprehensive logging of all actions
* ✅ **Data Retention** – Configurable retention policies
* ✅ **Access Logs** – IP address and user agent tracking
* ✅ **Consent Management** – User consent tracking (when needed)

### Security Best Practices
* ✅ **Environment Variables** – Sensitive config server-side only
* ✅ **Dependency Scanning** – Regular security updates
* ✅ **Type Safety** – TypeScript strict mode eliminates many bugs
* ✅ **Error Handling** – No sensitive data in error messages
* ✅ **Secure Defaults** – Security-first configuration

See [SECURITY.md](./SECURITY.md) for detailed security documentation.

---

## 🤝 Contributing

We welcome contributions! Here's how to get started:

### Development Setup

1. **Fork** the repository
2. **Clone** your fork
   ```bash
   git clone https://github.com/YOUR_USERNAME/ai-interview-assistant.git
   cd ai-interview-assistant
   ```
3. **Install** dependencies
   ```bash
   npm install
   ```
4. **Set up** environment
   ```bash
   cp env.example .env.local
   # Edit .env.local with your configuration
   ```
5. **Initialize** database
   ```bash
   npx prisma generate
   npm run db:push
   npm run db:seed
   ```

### Making Changes

1. **Create** a feature branch
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Implement** your changes
   - Write TypeScript in strict mode
   - Follow existing code patterns
   - Add tests for new features
   - Update documentation as needed

3. **Test** your changes
   ```bash
   npm run lint           # Check code style
   npm run type-check     # Verify TypeScript
   npm run test:unit      # Run unit tests
   npm run test:e2e       # Run E2E tests
   npm run build          # Verify build
   ```

4. **Commit** with conventional commits
   ```bash
   git commit -m "feat: add your feature description"
   # Types: feat, fix, docs, style, refactor, test, chore
   ```

5. **Push** to your fork
   ```bash
   git push origin feature/your-feature-name
   ```

6. **Open** a Pull Request
   - Provide clear description of changes
   - Reference related issues
   - Ensure all CI checks pass
   - Request review from maintainers

### Coding Standards

* ✅ **TypeScript Strict Mode** – No `any` types, full type safety
* ✅ **ESLint** – Airbnb style guide with Next.js rules
* ✅ **Prettier** – Automatic code formatting
* ✅ **Component Structure** – Functional components with hooks
* ✅ **File Naming** – `kebab-case` for files, `PascalCase` for components
* ✅ **Import Order** – React → External → Internal → Relative
* ✅ **Error Handling** – Always handle errors gracefully
* ✅ **Documentation** – JSDoc comments for complex functions
* ✅ **Testing** – Unit tests for utilities, E2E for user flows
* ✅ **Accessibility** – WCAG 2.1 Level AA compliance

### Project Structure

```
ai-interview-assistant/
├── app/                      # Next.js 15 App Router
│   ├── (flow)/              # Interview flow routes
│   ├── (interview)/         # Interviewee/Interviewer tabs
│   ├── api/                 # API routes
│   └── auth/                # Authentication pages
├── components/              # React components
│   ├── auth/                # Auth-related components
│   ├── dashboard/           # Dashboard components
│   ├── shared/              # Shared/reusable components
│   ├── timers/              # Timer components
│   └── ui/                  # shadcn/ui components
├── lib/                     # Core library code
│   ├── ai/                  # AI gateway & vendors
│   ├── auth/                # Authentication logic
│   ├── db/                  # Database & repositories
│   ├── parsing/             # Resume parsing
│   └── services/            # Business logic
├── prisma/                  # Database schema & migrations
├── store/                   # Redux state management
├── tests/                   # Test suites
│   ├── e2e/                # Playwright E2E tests
│   ├── integration/        # Integration tests
│   └── unit/               # Unit tests
└── types/                   # TypeScript type definitions
```

### Commit Message Format

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Build process or auxiliary tool changes
- `perf`: Performance improvements
- `ci`: CI/CD changes

**Examples:**
```bash
feat(ai): add DeepSeek vendor support
fix(auth): resolve token refresh race condition
docs(readme): update deployment instructions
test(parsing): add PDF edge case tests
```

---

## 📝 License

MIT License © 2025 AI Interview Assistant

See [LICENSE](./LICENSE) file for details.

---

## 🙏 Acknowledgments

### Core Technologies
* [Next.js](https://nextjs.org/) – React framework for production
* [React](https://react.dev/) – UI library
* [TypeScript](https://www.typescriptlang.org/) – Type-safe JavaScript
* [Tailwind CSS](https://tailwindcss.com/) – Utility-first CSS framework
* [shadcn/ui](https://ui.shadcn.com/) – Beautiful UI components
* [Redux Toolkit](https://redux-toolkit.js.org/) – State management
* [Prisma](https://www.prisma.io/) – Next-generation ORM

### AI & ML
* [OpenAI](https://openai.com/) – GPT models for interview intelligence
* [DeepSeek](https://www.deepseek.com/) – Cost-effective AI alternative

### Authentication & Database
* [Supabase](https://supabase.com/) – Open-source Firebase alternative
* [PostgreSQL](https://www.postgresql.org/) – Production database
* [SQLite](https://www.sqlite.org/) – Development database

### File Processing
* [PDF.js](https://mozilla.github.io/pdf.js/) – Native PDF parsing
* [Mammoth.js](https://github.com/mwilliamson/mammoth.js) – DOCX conversion

### Testing & Quality
* [Playwright](https://playwright.dev/) – E2E testing framework
* [Vitest](https://vitest.dev/) – Unit testing framework
* [ESLint](https://eslint.org/) – Code linting
* [Prettier](https://prettier.io/) – Code formatting

### Deployment & Infrastructure
* [Vercel](https://vercel.com/) – Deployment platform
* [Docker](https://www.docker.com/) – Containerization
* [GitHub Actions](https://github.com/features/actions) – CI/CD automation

### Community
Special thanks to all contributors and the open-source community for making this project possible.

---

## 📞 Support & Contact

### Getting Help
* **Documentation** – Check the `/docs` folder and inline code comments
* **Issues** – [GitHub Issues](https://github.com/TheRougeRoyal/ai-interview-assistant/issues)
* **Discussions** – [GitHub Discussions](https://github.com/TheRougeRoyal/ai-interview-assistant/discussions)

### Reporting Bugs
When reporting bugs, please include:
- Steps to reproduce
- Expected vs actual behavior
- Screenshots (if applicable)
- Environment details (OS, Node version, browser)
- Relevant error messages or logs

### Feature Requests
We welcome feature requests! Please:
- Search existing issues first
- Provide clear use case and rationale
- Explain expected behavior
- Consider contributing the feature yourself

### Security Issues
For security vulnerabilities, please see [SECURITY.md](./SECURITY.md) for responsible disclosure guidelines.

---

## 📊 Project Stats

![GitHub Stars](https://img.shields.io/github/stars/TheRougeRoyal/ai-interview-assistant?style=social)
![GitHub Forks](https://img.shields.io/github/forks/TheRougeRoyal/ai-interview-assistant?style=social)
![GitHub Issues](https://img.shields.io/github/issues/TheRougeRoyal/ai-interview-assistant)
![GitHub Pull Requests](https://img.shields.io/github/issues-pr/TheRougeRoyal/ai-interview-assistant)
![License](https://img.shields.io/github/license/TheRougeRoyal/ai-interview-assistant)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)
![Next.js](https://img.shields.io/badge/Next.js-15-black)

---

<div align="center">

**Built with ❤️ using Next.js, TypeScript & AI**

[⭐ Star this repo](https://github.com/TheRougeRoyal/ai-interview-assistant) · [🐛 Report Bug](https://github.com/TheRougeRoyal/ai-interview-assistant/issues) · [✨ Request Feature](https://github.com/TheRougeRoyal/ai-interview-assistant/issues)

</div>

