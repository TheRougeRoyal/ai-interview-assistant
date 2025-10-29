# AI Interview Assistant - Copilot Instructions

## Project Overview
This is a Next.js-based AI Interview Assistant with dual-tab interface:
- **Interviewee Tab**: Resume upload, profile collection, timed Q&A sessions
- **Interviewer Tab**: Dashboard for viewing candidates, scoring, and summaries

## Tech Stack
- **Framework**: Next.js 15+ with App Router + TypeScript
- **UI**: Tailwind CSS + shadcn/ui components
- **State Management**: Redux Toolkit + redux-persist (IndexedDB via localForage)
- **AI Integration**: Server routes as gateway (OpenAI by default, mock mode available)
- **File Parsing**: Client-first (pdfjs/mammoth) → server heuristics → optional LLM fallback
- **Testing**: Vitest/Jest (unit) + Playwright (E2E)
- **Deployment**: Vercel

## Architecture Principles
1. **AI Gateway Pattern**: Single entry point `lib/ai/gateway.ts` for all AI calls
2. **Native PDF Parsing**: PDF.js-based extraction with metadata support, no external services
3. **State Persistence**: Redux with migrations support, recoverable sessions
4. **Time Management**: Derived countdown timers from timestamps, auto-submit on timeout
5. **Accessibility**: Keyboard-first navigation, extended time options, color contrast
6. **Fairness**: Content-only rubrics, no demographic inputs, transparent scoring

## Key Features to Implement
- [x] Native PDF parsing with PDF.js (metadata + text extraction)
- [ ] Session recovery on reload with "Welcome Back" modal
- [ ] Dual-tab navigation (interviewee/interviewer)
- [ ] Candidate ranking and detailed scoring
- [ ] Auto-submit on timer expiration
- [ ] Profile gating (name/email/phone required)

## File Organization Guidelines
- Keep files small and well-named for Cursor/Copilot friendliness
- Use explicit TypeScript interfaces
- Clear TODOs for each component
- Separate concerns: UI components, state logic, AI integration, parsing

## Environment Variables
- `AI_VENDOR`: 'openai' | 'mock'
- `OPENAI_API_KEY`: Server-only API key
- `AI_MODEL`: Model name (e.g., 'gpt-4o-mini')
- `MOCK_MODE`: 'true' | 'false' for testing

## Coding Standards
- TypeScript strict mode
- ESLint + Prettier
- Tailwind for styling
- shadcn/ui components
- Redux Toolkit for state
- Server actions for API routes

## Testing Strategy
- Unit tests for timers, reducers, parsing logic
- E2E tests for complete user flows (A1-A6 acceptance criteria)
- Mock mode for deterministic AI responses in tests

## Progress Checklist
- [x] Project scaffolded
- [x] Folder structure created
- [x] Dependencies installed
- [x] Basic routing setup
- [x] State management configured
- [x] UI components built (shadcn/ui)
- [x] Development server running
- [x] Native PDF parsing implemented
- [ ] AI gateway implemented
- [ ] Resume upload component
- [ ] Interview flow components
- [ ] Timer implementation
- [ ] Dashboard components
- [ ] Testing framework configured
- [ ] CI/CD pipeline setup