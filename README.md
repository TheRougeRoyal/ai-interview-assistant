# AI Interview Assistant

A comprehensive AI-powered interview platform built with Next.js 15, featuring dual-tab interface for interviewees and interviewers, automated question generation, real-time scoring, and session recovery.

## Features

-### Interviewee Experience

- **Resume Upload**: Support for PDF and DOCX files with intelligent text extraction
- **Profile Gating**: Chatbot-style collection of required information (name, email, phone)
- **Timed Interview**: 6 questions with progressive difficulty (2 easy, 2 medium, 2 hard)
- **Auto-Submit**: Automatic submission when time expires
- **Session Recovery**: Welcome Back modal for interrupted sessions
- **Accessibility**: Keyboard navigation, screen reader support, and time extensions

-### Interviewer Dashboard

- **Candidate Management**: Sortable table with search functionality
- **Detailed Views**: Comprehensive candidate profiles with Q&A history
- **Scoring System**: Rubric-based evaluation (Accuracy, Completeness, Relevance, Timeliness)
- **Summary Generation**: AI-powered candidate summaries with strengths and improvement areas

-### Technical Features

- **AI Gateway**: Vendor-agnostic AI integration (OpenAI + Mock for testing)
- **Native PDF Parsing**: PDF.js-based text extraction with metadata support
- **Resume Analysis**: Structured section extraction, skill categorization, and quality scoring
- **State Persistence**: Redux Toolkit with session recovery
- **Real-time Updates**: Live timer and progress tracking
- **Fairness Checks**: Bias-free AI evaluation guidelines

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS, shadcn/ui components
- **State Management**: Redux Toolkit, Redux Persist
- **AI Integration**: OpenAI API with mock fallback
- **PDF Processing**: Native PDF.js for text extraction and metadata
- **File Processing**: Enhanced resume parsing with structured analysis
- **Testing**: Playwright (E2E), Vitest (Unit)
- **Database**: Prisma with SQLite (development)

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd sqipe-internship
```

1. Install dependencies:

```bash
npm install
```

1. Set up environment variables:

```bash
cp env.example .env.local
```

Edit `.env.local`:

```env
# AI Configuration
AI_VENDOR=mock  # or 'openai' for production
OPENAI_API_KEY=your_openai_api_key_here

# Database
DATABASE_URL="file:./dev.db"

# Optional: Upload limits
UPLOAD_MAX_MB=5
```

1. Initialize the database:

```bash
npm run db:push
```

1. Start the development server:

```bash
npm run dev
```

`npm run build` - Build for production

`npm run start` - Start production server

`npm run lint` - Run ESLint

`npm run type-check` - Run TypeScript type checking

`npm run test:unit` - Run unit tests

`npm run test:e2e` - Run E2E tests

`npm run e2e:ui` - Run E2E tests with UI

## Deployment

### Vercel (Recommended)

1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard:
   - `AI_VENDOR`: `openai` (for production)
   - `OPENAI_API_KEY`: Your OpenAI API key
   - `DATABASE_URL`: Your production database URL

3. Deploy automatically on push to main branch

### Manual Deployment

1. Build the application:

```bash
npm run build
```

1. Start the production server:

```bash
npm run start
```

### Testing

### Unit Tests

```bash
npm run test:unit
```

### E2E Tests

```bash
npm run test:e2e
```

### Test Coverage

The test suite includes:

- Complete interview flow (6 questions with timers)
- Resume parsing and profile gating
- Session recovery scenarios
- Dashboard functionality
- API endpoint mocking

## API Endpoints

- `POST /api/parse-resume` - Extract text and PII from resume files
- `POST /api/generate-question` - Generate interview questions
- `POST /api/score-answer` - Score candidate answers
- `POST /api/summary` - Generate candidate summary
- `GET /api/candidates` - List all candidates
- `GET /api/candidates/[id]` - Get candidate details
- `POST /api/sessions` - Create interview session
- `POST /api/sessions/[id]/answers` - Submit answer

### Architecture

### AI Gateway

Centralized AI integration with vendor abstraction:

- OpenAI integration for production
- Mock responses for testing
- Schema validation and error handling

### Resume Processing

Intelligent text extraction with confidence scoring:

- PDF parsing with PDF.js
- DOCX parsing with Mammoth.js
- PII extraction with regex patterns
- Confidence scoring and fallback logic

### State Management

Redux Toolkit with persistence:

- Session state with interview progress
- Profile information and resume data
- Timer state and answer tracking
- Automatic session recovery

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues and questions, please open a GitHub issue or contact the development team.

## Branch protection & required checks

To keep the `main` branch stable and ensure high-quality releases, configure the following GitHub Branch Protection rules in your repository settings (Settings → Branches → Branch protection rules):

- Protect branch: `main` (apply to the branch name `main`)
- Require pull request reviews before merging (1 approving review)
- Require status checks to pass before merging — add the workflow job names below as required checks:
   - `build-and-test` (Install, Lint, Typecheck, Unit tests, Build)
   - `e2e` (Playwright E2E) — optional but recommended for main
   - `preview-deploy` (Vercel Preview Deploy) — optional if you want preview deployments to pass before merging
- Require branches to be up to date before merging (enforce up-to-date with base branch)
- Restrict who can push to `main` (optional): limit push access to maintainers or CI only
- Enable signed commits or linear history if your team prefers (optional)

How to wire the checks:

1. Go to your repository Settings → Actions → General and ensure Actions runs are enabled for this repository.

1. In Settings → Branches → Add rule, enter `main` and select the options above.

1. In the "Require status checks to pass before merging" section search for these checks (they appear as job names from the GitHub Actions run):

   - `build-and-test`
   - `e2e`
   - `preview-deploy` (if used)

1. Save the rule.

Notes:

- Because the workflow defines `e2e` as a matrix job (per-browser runs), GitHub will report multiple check names for each matrix variant. If you want to require a single consolidated check, prefer requiring `build-and-test` only and make E2E gating optional, or configure a separate summary check automation.
- If you deploy to Vercel via the Action, the Preview Deployment step (`preview-deploy`) will appear as a check when it runs on PRs; requiring it ensures previews are successfully created before merging.
- Adjust the required checks list to match the job names in `.github/workflows/ci.yml` if you rename jobs later.
