# DeepSeek AI Integration

## Overview

The AI Interview Assistant now supports **DeepSeek** as the primary AI provider. DeepSeek offers competitive pricing and strong performance for interview assessment tasks.

## Features

✅ **Question Generation**: Creates technical interview questions tailored to role and difficulty
✅ **Answer Scoring**: Evaluates candidate responses with detailed rubrics
✅ **Interview Summary**: Provides comprehensive performance analysis
✅ **Resume Analysis**: Extracts skills, experience, and generates insights

## Configuration

### 1. Set Environment Variables

Add to `.env.local`:

```bash
AI_VENDOR=deepseek
DEEPSEEK_API_KEY=sk-e533c6e11df44981874cffdd7e9f66be
AI_MODEL=deepseek-chat
```

### 2. Available Models

- **deepseek-chat**: General purpose chat model (recommended)
- **deepseek-coder**: Optimized for code-related tasks

### 3. API Endpoint

```
https://api.deepseek.com/v1/chat/completions
```

## Usage Examples

### Generate Interview Question

```typescript
import { ask } from '@/lib/ai/enhanced-gateway'

const question = await ask('generate_question', {
  difficulty: 'medium',
  role: 'Full Stack Developer',
  resumeContext: 'Experienced with React, Node.js, and PostgreSQL'
})

console.log(question.prompt)
// Output: "How would you optimize a React application experiencing slow list rendering?"
```

### Score Candidate Answer

```typescript
const rubric = await ask('score', {
  question: 'Explain the difference between SQL and NoSQL databases',
  answer: 'SQL databases are relational and use structured query language...',
  durationMs: 300000, // 5 minutes allowed
  timeTakenMs: 180000  // 3 minutes taken
})

console.log(rubric)
// Output: {
//   accuracy: 85,
//   completeness: 80,
//   relevance: 90,
//   timeliness: 70,
//   total: 82,
//   rationale: 'Strong understanding with good examples...'
// }
```

### Generate Interview Summary

```typescript
const summary = await ask('summary', {
  rubrics: [
    { accuracy: 85, completeness: 80, relevance: 90, timeliness: 70, total: 82, rationale: '...' },
    { accuracy: 75, completeness: 85, relevance: 80, timeliness: 80, total: 79, rationale: '...' },
    { accuracy: 90, completeness: 90, relevance: 85, timeliness: 75, total: 86, rationale: '...' }
  ]
})

console.log(summary)
// Output: {
//   finalScore: 82,
//   summary: 'Candidate demonstrated strong technical knowledge...',
//   strengths: ['accuracy', 'relevance'],
//   gap: 'timeliness — practice concise answers under time pressure'
// }
```

### Analyze Resume

```typescript
const analysis = await ask('analyze_resume', {
  resumeText: `John Doe
    Software Engineer with 5 years of experience...
    Skills: JavaScript, React, Node.js, PostgreSQL, Docker, AWS
    Experience: Senior Developer at Tech Corp (3 years)...`
})

console.log(analysis)
// Output: {
//   skills: {
//     technical: ['JavaScript', 'React', 'Node.js', 'PostgreSQL'],
//     soft: ['Leadership', 'Problem Solving', 'Communication'],
//     languages: ['English'],
//     frameworks: ['React', 'Node.js'],
//     tools: ['Docker', 'AWS', 'Git'],
//     certifications: [],
//     domains: ['Web Development', 'Cloud Computing']
//   },
//   experience_years: 5,
//   seniority_level: 'mid',
//   summary: 'Experienced full-stack developer with strong JavaScript ecosystem knowledge...',
//   strengths: ['Full-stack development', 'Cloud architecture', 'Team collaboration'],
//   quality_score: 85
// }
```

## Resilience Features

All DeepSeek API calls are protected by:

1. **Circuit Breaker**: Prevents cascading failures
2. **Retry Logic**: Handles transient failures with exponential backoff
3. **Fallback**: Gracefully degrades to mock responses if needed
4. **Caching**: Stores results to improve performance
5. **Validation**: Ensures request/response integrity

## Error Handling

### Common Errors

```typescript
try {
  const result = await ask('generate_question', payload)
} catch (error) {
  if (error.code === 'DEEPSEEK_ERROR') {
    // API error (invalid key, rate limit, etc.)
    console.error('DeepSeek API error:', error.message)
  } else if (error.code === 'SCHEMA_VALIDATION_FAILED') {
    // Response didn't match expected schema
    console.error('Invalid AI response:', error.message)
  } else if (error.code === 'SERVICE_UNAVAILABLE') {
    // Circuit breaker is open
    console.error('AI service temporarily unavailable:', error.message)
  }
}
```

### Automatic Fallback

If DeepSeek is unavailable, the system automatically falls back to:
1. **Cached results** (if available)
2. **Mock responses** (deterministic, rule-based)
3. **Degraded mode** (simplified responses)

## Performance

### Typical Response Times

- Question Generation: 1-3 seconds
- Answer Scoring: 2-4 seconds
- Interview Summary: 2-3 seconds
- Resume Analysis: 3-5 seconds

### Caching Benefits

Cached responses return in **<10ms**, improving:
- User experience
- API cost efficiency
- Service reliability

## Cost Optimization

### Tips to Reduce API Costs

1. **Enable Caching**: Reuses results for identical requests
2. **Use Mock Mode**: For development and testing
3. **Batch Operations**: Group similar requests when possible
4. **Set Appropriate Timeouts**: Prevent long-running requests

### Token Usage

DeepSeek charges based on tokens:
- **Input tokens**: ~200-500 per request
- **Output tokens**: ~100-300 per response
- **Average cost**: Very competitive compared to OpenAI

## Migration from OpenAI

Simply update your environment variables:

```bash
# Before (OpenAI)
AI_VENDOR=openai
OPENAI_API_KEY=sk-...

# After (DeepSeek)
AI_VENDOR=deepseek
DEEPSEEK_API_KEY=sk-e533c6e11df44981874cffdd7e9f66be
```

No code changes required! The API is identical.

## Testing

### Test with Mock Mode

```bash
AI_VENDOR=mock
```

### Test with Real API

```bash
AI_VENDOR=deepseek
DEEPSEEK_API_KEY=sk-e533c6e11df44981874cffdd7e9f66be
```

### Monitor API Calls

Check the health endpoint:

```bash
curl http://localhost:3000/api/health/ai
```

## Troubleshooting

### Issue: "Missing DEEPSEEK_API_KEY"

**Solution**: Ensure `.env.local` contains:
```bash
DEEPSEEK_API_KEY=sk-e533c6e11df44981874cffdd7e9f66be
```

### Issue: "DEEPSEEK_ERROR: HTTP 401"

**Solution**: Invalid API key. Verify your key is correct.

### Issue: "DEEPSEEK_ERROR: HTTP 429"

**Solution**: Rate limited. Retry logic will handle this automatically, or reduce request frequency.

### Issue: Circuit breaker is OPEN

**Solution**: DeepSeek API is experiencing issues. The system will:
1. Return cached results if available
2. Use fallback responses
3. Automatically retry after 60 seconds

## Support

For issues specific to:
- **DeepSeek API**: Contact DeepSeek support
- **Integration code**: Check logs at `/api/health/ai`
- **Circuit breaker**: Monitor `/api/health/ai` endpoint

## Benefits of DeepSeek

✅ **Cost-effective**: Lower pricing than competitors
✅ **Fast responses**: Optimized for low latency
✅ **JSON mode**: Native support for structured outputs
✅ **Reliable**: Built-in resilience mechanisms
✅ **Compatible**: Drop-in replacement for OpenAI
