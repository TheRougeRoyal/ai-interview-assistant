# Demo Guide

This guide provides examples for testing the AI Interview Assistant API endpoints.

## Prerequisites

1. Start the development server:
   ```bash
   npm run dev
   ```

2. The API will be available at `http://localhost:3000/api`

## API Smoke Tests

### Health Check

Check API status and configuration:

```bash
curl -X GET http://localhost:3000/api/health
```

Expected response:
```json
{
  "ok": true,
  "vendor": "mock",
  "model": "gpt-4o-mini",
  "timestamp": "2025-09-27T10:00:00.000Z"
}
```

### Generate Question

Generate an interview question (difficulty derived by index):

```bash
curl -X POST http://localhost:3000/api/generate-question \
  -H "Content-Type: application/json" \
  -d '{
    "questionIndex": 1,
    "role": "Frontend Developer",
    "resumeContext": "React developer with 3 years experience building e-commerce applications"
  }'
```

Expected partial response:
```json
{
  "prompt": "Describe your approach ...",
  "difficulty": "easy",
  "targetDurationMs": 20000
}
```

### Score Answer

Evaluate an interview answer with AI rubric scoring:

```bash
curl -X POST http://localhost:3000/api/score-answer \
  -H "Content-Type: application/json" \
  -d '{
    "questionIndex": 0,
    "question": "What is your experience with React hooks?",
    "answer": "I have extensive experience with React hooks including useState, useEffect, and custom hooks...",
    "difficulty": "easy",
    "durationMs": 60000,
    "timeTakenMs": 45000
  }'
```
## Persistence Smoke (New)

```bash
# Create candidate
curl -X POST http://localhost:3000/api/candidates -H "Content-Type: application/json" -d '{"name":"Jane Doe","email":"jane@example.com"}'

# Create session (supply 6 plan items)
curl -X POST http://localhost:3000/api/sessions -H "Content-Type: application/json" -d '{"candidateId":"<candidateId>","plan":[{"index":0,"difficulty":"easy","targetDurationMs":20000},{"index":1,"difficulty":"easy","targetDurationMs":20000},{"index":2,"difficulty":"medium","targetDurationMs":60000},{"index":3,"difficulty":"medium","targetDurationMs":60000},{"index":4,"difficulty":"hard","targetDurationMs":120000},{"index":5,"difficulty":"hard","targetDurationMs":120000}]}'

# Upsert answer
curl -X POST http://localhost:3000/api/sessions/<sessionId>/answers -H "Content-Type: application/json" -d '{"questionIndex":0,"difficulty":"easy","question":"Explain event loop","durationMs":20000}'

# Finalize candidate
curl -X PATCH http://localhost:3000/api/candidates/<candidateId> -H "Content-Type: application/json" -d '{"finalScore":88,"summary":"Strong performance","strengths":["Clarity"],"gap":"Depth"}'

# List candidates
curl http://localhost:3000/api/candidates
```

Expected response:
```json
{
  "accuracy": 85,
  "completeness": 80,
  "relevance": 90,
  "timeliness": 95,
  "total": 87,
  "rationale": "Good understanding of React hooks with practical experience mentioned."
}
```

### Generate Summary

Create a summary from multiple rubric scores:

```bash
curl -X POST http://localhost:3000/api/summary \
  -H "Content-Type: application/json" \
  -d '{
    "rubrics": [
      {
        "accuracy": 85,
        "completeness": 80,
        "relevance": 90,
        "timeliness": 95,
        "total": 87,
        "rationale": "Good technical knowledge demonstrated"
      },
      {
        "accuracy": 78,
        "completeness": 85,
        "relevance": 82,
        "timeliness": 90,
        "total": 83,
        "rationale": "Solid understanding with room for improvement"
      }
    ]
  }'
```

Expected response:
```json
{
  "finalScore": 85,
  "summary": "Candidate shows strong technical foundation with good problem-solving approach and clear communication skills.",
  "strengths": ["Technical knowledge", "Clear communication", "Problem-solving"],
  "gap": "Could benefit from more specific examples and deeper technical details"
}
```

## Error Examples

### Validation Error (422)

```bash
curl -X POST http://localhost:3000/api/generate-question \
  -H "Content-Type: application/json" \
  -d '{
    "difficulty": "invalid",
    "role": "Dev"
  }'
```

Response:
```json
{
  "error": {
    "code": "SCHEMA_VALIDATION_FAILED",
    "message": "Invalid enum value. Expected 'easy' | 'medium' | 'hard', received 'invalid'"
  }
}
```

### Rate Limit Error (429)

Make more than 10 requests per minute to any endpoint:

```json
{
  "error": {
    "code": "RATE_LIMIT",
    "message": "Rate limit exceeded. Maximum 10 requests per minute per route."
  }
}
```

## Testing

Run the unit tests to verify API functionality:

```bash
npm run test:unit
```

Check TypeScript compilation:

```bash
npm run typecheck
```

Run linting:

```bash
npm run lint
```