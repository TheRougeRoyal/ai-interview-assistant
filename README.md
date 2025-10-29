

# 🧠 AI Interview Assistant

A comprehensive **AI-powered interview platform** built with **Next.js 15**, featuring dual interfaces for interviewees and interviewers, automated question generation, real-time scoring, resume intelligence, and session recovery — all in a secure, accessible, and production-ready architecture.

---

## 🚀 Features

### 🎯 Interviewee Experience
- **Resume Upload** – PDF/DOCX support with intelligent text extraction (PDF.js + Mammoth.js)  
- **Profile Gating** – Chatbot-style data collection (name, email, phone)  
- **Timed Interview** – 6 questions with progressive difficulty (2 easy, 2 medium, 2 hard)  
- **Auto-Submit** – Automatic submission when timer expires  
- **Session Recovery** – “Welcome Back” modal for interrupted sessions  
- **Accessibility** – Keyboard navigation, screen-reader support, and time extensions  

### 🧑‍💼 Interviewer Dashboard
- **Candidate Management** – Sortable / searchable table of candidates  
- **Detailed Views** – Full Q&A history and resume details  
- **Scoring System** – Rubric-based evaluation (Accuracy, Completeness, Relevance, Timeliness)  
- **AI Summary** – Automatic candidate summaries highlighting strengths & areas for improvement  

### ⚙️ Technical Features
- **AI Gateway** – Vendor-agnostic integration (OpenAI, DeepSeek, + Mock)  
- **Circuit Breaker** – Automatic failure detection and recovery  
- **Retry Logic** – Exponential backoff for transient failures  
- **Fallback Strategies** – Graceful degradation when AI is unavailable  
- **Resume Analysis** – Structured extraction, skill categorization, and quality scoring  
- **PDF Processing** – Native PDF.js parsing with metadata  
- **State Persistence** – Redux Toolkit + Redux Persist with session recovery  
- **Real-time Updates** – Live timers & progress tracking  
- **Fairness Checks** – Bias-free AI evaluation guidelines  

---

## 🧩 Tech Stack

| Layer | Technology |
|-------|-------------|
| **Frontend** | Next.js 15 · React 19 · TypeScript |
| **Styling** | Tailwind CSS · shadcn/ui |
| **State Management** | Redux Toolkit · Redux Persist |
| **AI Integration** | DeepSeek API · OpenAI API · Mock Fallback |
| **Resilience** | Circuit Breaker · Retry · Caching · Fallback |
| **PDF Processing** | Native PDF.js |
| **File Parsing** | Enhanced resume analysis |
| **Testing** | Playwright (E2E) · Vitest (Unit) |
| **Database** | Prisma + SQLite (dev) |

---

## 🧰 Getting Started

### Prerequisites
- Node.js 18 +
- npm or yarn

### Installation
```bash
git clone <repository-url>
cd ai-interview-assistant
npm install
cp env.example .env.local
````

Edit `.env.local`:

```env
# AI Configuration
AI_VENDOR=deepseek   # 'deepseek', 'openai', or 'mock'

# DeepSeek Configuration (Recommended)
DEEPSEEK_API_KEY=sk-your-deepseek-key-here
AI_MODEL=deepseek-chat

# OpenAI Configuration (Alternative)
OPENAI_API_KEY=sk-your-openai-key-here
AI_MODEL=gpt-4o-mini

# Database
DATABASE_URL="file:./dev.db"

# Optional
UPLOAD_MAX_MB=5
```

**🎉 DeepSeek Integration**: This project now supports DeepSeek AI for cost-effective, high-quality interview assessments. See [DEEPSEEK_INTEGRATION.md](./DEEPSEEK_INTEGRATION.md) for details.

Initialize the database:

```bash
npm run db:push
```

Start the development server:

```bash
npm run dev
```

---

## 🧪 Available Scripts

```bash
npm run dev            # Start dev server
npm run build          # Build for production
npm run start          # Start production server
npm run lint           # Run ESLint
npm run type-check     # Run TypeScript checks
npm run test:unit      # Run unit tests
npm run test:e2e       # Run E2E tests
npm run e2e:ui         # E2E tests with UI
npm run db:push        # Push Prisma schema
npm run db:studio      # Open Prisma Studio
npm run test-pdf       # Test PDF parsing
npm run test-ai-resume # Test AI resume analysis
```

---

## ☁️ Deployment

### ▶️ Vercel (Recommended)

1. Connect your GitHub repo to [Vercel](https://vercel.com)

2. Set environment variables in Vercel Dashboard:

   | Variable         | Example             |
   | ---------------- | ------------------- |
   | `AI_VENDOR`      | `openai`            |
   | `OPENAI_API_KEY` | your OpenAI API key |
   | `DATABASE_URL`   | production DB URL   |

3. Deploy automatically on push to `main`

### 🧭 Manual Deployment

```bash
npm run build
npm run start
```

---

## 🧩 API Endpoints

| Method | Endpoint                     | Description                     |
| ------ | ---------------------------- | ------------------------------- |
| POST   | `/api/parse-resume`          | Extract text + PII from resumes |
| POST   | `/api/generate-question`     | Generate AI interview questions |
| POST   | `/api/score-answer`          | Score candidate answers         |
| POST   | `/api/summary`               | Generate AI summary             |
| GET    | `/api/candidates`            | List all candidates             |
| GET    | `/api/candidates/[id]`       | Candidate details               |
| POST   | `/api/sessions`              | Create interview session        |
| POST   | `/api/sessions/[id]/answers` | Submit answer                   |

---

## 🧠 Architecture Overview

### AI Gateway

* Centralized AI integration with vendor abstraction
* OpenAI for production · Mock for testing
* Schema validation + error handling

### Resume Processing

* Intelligent text extraction with confidence scores
* PDF.js + Mammoth.js backends
* PII detection via regex
* Confidence-based fallback logic

### State Management

* Redux Toolkit with persistent storage
* Tracks interview progress, profile data, timers, answers
* Automatic session recovery support

---

## 🧱 Branch Protection & Checks

To keep `main` stable:

1. **Protect** branch `main`
2. **Require** PR review (≥ 1 approval)
3. **Require** status checks:

   * `build-and-test`
   * `e2e` (optional)
   * `preview-deploy` (optional)
4. **Require** branches up-to-date before merge
5. (Optional) Restrict push access / enforce signed commits

**Typical workflow jobs**:

* `build-and-test` → Install, Lint, Typecheck, Tests, Build
* `e2e` → Playwright matrix
* `preview-deploy` → Vercel preview

---

## 🧭 Roadmap

* [ ] Multi-language interviews
* [ ] Video recording support
* [ ] Advanced analytics dashboard
* [ ] Custom question banks
* [ ] Interview templates
* [ ] Email notifications
* [ ] Calendar integration
* [ ] OCR for scanned PDFs
* [ ] Export to PDF reports

---

## 📈 Performance Benchmarks

| File Size         | Resume Processing Time |
| ----------------- | ---------------------- |
| Small (< 1 MB)    | ≈ 400 ms               |
| Medium (1 – 3 MB) | ≈ 1.8 s                |
| Large (3 – 5 MB)  | ≈ 4.5 s                |

| Task                | Latency                            |
| ------------------- | ---------------------------------- |
| Question Generation | 2 – 3 s (OpenAI) / < 100 ms (Mock) |
| Answer Scoring      | 1 – 2 s (OpenAI) / < 50 ms (Mock)  |

All resume processing runs in-memory with zero external storage.

---

## 🔒 Security & Privacy

* ✅ No files stored on disk
* ✅ All parsing in-memory
* ✅ No third-party resume services
* ✅ API keys server-side only
* ✅ HTTPS enforcement
* ✅ Zod input validation
* ✅ SQL injection protection (Prisma)
* ✅ XSS protection (React escaping)

---

## 🤝 Contributing

1. **Fork** the repository
2. **Create** a feature branch

   ```bash
   git checkout -b feature/your-feature
   ```
3. **Implement changes**

   * Use TypeScript strict mode
   * Add tests & docs
4. **Commit**

   ```bash
   git commit -m "feat: add your feature"
   ```
5. **Push**

   ```bash
   git push origin feature/your-feature
   ```
6. **Open a Pull Request**

### Coding Standards

* TypeScript strict mode
* ESLint + Prettier
* Tailwind CSS + shadcn/ui
* Redux Toolkit for state
* Clear comments & docs

---

## 📝 License

MIT License — see `LICENSE` for details.

---

## 🙏 Acknowledgments

* [Next.js](https://nextjs.org/) – React framework
* [OpenAI](https://openai.com/) – AI integration
* [PDF.js](https://mozilla.github.io/pdf.js/) – PDF parsing
* [shadcn/ui](https://ui.shadcn.com/) – UI components
* [Redux Toolkit](https://redux-toolkit.js.org/) – State management
* [Vercel](https://vercel.com/) – Deployment platform

---

## 📞 Support

* **Issues** → [GitHub Issues](https://github.com/YOUR_USERNAME/ai-interview-assistant/issues)
* **Docs** → `/docs` folder
* **Email** → [your-email@example.com](mailto:your-email@example.com)

---

Built with ❤️ using Next.js, TypeScript & AI.

