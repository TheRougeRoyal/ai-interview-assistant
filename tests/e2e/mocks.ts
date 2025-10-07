import { Page } from '@playwright/test'

const E = 20000, M = 60000, H = 120000

const mockQuestions = [
  { prompt: 'What is the difference between let and var in JavaScript?', difficulty: 'easy' },
  { prompt: 'Explain the concept of closures in JavaScript.', difficulty: 'easy' },
  { prompt: 'How would you implement a debounce function?', difficulty: 'medium' },
  { prompt: 'What are the different ways to handle asynchronous operations in JavaScript?', difficulty: 'medium' },
  { prompt: 'Implement a function to find the longest common subsequence between two strings.', difficulty: 'hard' },
  { prompt: 'Design a system for handling millions of concurrent users.', difficulty: 'hard' }
]

const mockRubrics = [
  { accuracy: 85, completeness: 80, relevance: 90, timeliness: 75, rationale: 'Good understanding of basic concepts', total: 83 },
  { accuracy: 80, completeness: 85, relevance: 85, timeliness: 80, rationale: 'Solid explanation with minor gaps', total: 82 },
  { accuracy: 75, completeness: 70, relevance: 80, timeliness: 70, rationale: 'Shows understanding but needs more detail', total: 74 },
  { accuracy: 90, completeness: 85, relevance: 90, timeliness: 85, rationale: 'Excellent technical knowledge', total: 88 },
  { accuracy: 70, completeness: 65, relevance: 75, timeliness: 60, rationale: 'Basic understanding, needs improvement', total: 68 },
  { accuracy: 85, completeness: 80, relevance: 85, timeliness: 80, rationale: 'Good system design thinking', total: 83 }
]

export async function mockAllNetwork(page: Page) {
  await page.route('**/api/health', async route => {
    await route.fulfill({ status: 200, json: { ok: true, vendor: 'mock', model: 'test' } })
  })

  await page.route('**/api/parse-resume', async route => {
    await route.fulfill({
      status: 200,
      json: {
        fields: { name: 'Test User', email: 'test@example.com', phone: '+1234567890' },
        confidence: { name: 0.98, email: 0.99, phone: 0.95 },
        overallConfidence: 97,
        extractionMethod: 'heuristic',
        resumeMeta: { filename: 'sample.pdf', size: 1000, mime: 'application/pdf' },
        resumeText: 'Test User\nSoftware Engineer\nEmail: test@example.com\nPhone: +1234567890\n\nExperience: 5 years in full-stack development'
      }
    })
  })

  await page.route('**/api/generate-question', async route => {
    const body = route.request().method() === 'POST' ? await route.request().postDataJSON() : {}
    const i = Number(body?.questionIndex ?? 0)
    const question = mockQuestions[i] || mockQuestions[0]
    const targetDurationMs = question.difficulty === 'easy' ? E : question.difficulty === 'medium' ? M : H
    
    await route.fulfill({
      status: 200,
      json: { 
        prompt: question.prompt, 
        difficulty: question.difficulty, 
        targetDurationMs 
      }
    })
  })

  await page.route('**/api/score-answer', async route => {
    const body = route.request().method() === 'POST' ? await route.request().postDataJSON() : {}
    const questionIndex = Number(body?.questionIndex ?? 0)
    const rubric = mockRubrics[questionIndex] || mockRubrics[0]
    
    await route.fulfill({
      status: 200,
      json: { 
        ...rubric,
        questionIndex 
      }
    })
  })

  await page.route('**/api/summary', async route => {
    await route.fulfill({
      status: 200,
      json: { 
        finalScore: 80, 
        summary: 'Strong technical candidate with excellent problem-solving skills. Shows good understanding of core concepts with room for growth in advanced topics.', 
        strengths: ['Problem Solving', 'Technical Knowledge'], 
        gap: 'Advanced Algorithms' 
      }
    })
  })

  await page.route('**/api/candidates', async route => {
    await route.fulfill({
      status: 200,
      json: {
        candidates: [
          {
            id: '1',
            name: 'Test User',
            email: 'test@example.com',
            phone: '+1234567890',
            finalScore: 80,
            status: 'completed',
            updatedAt: new Date().toISOString()
          }
        ]
      }
    })
  })

  await page.route('**/api/candidates/*', async route => {
    const url = route.request().url()
    const candidateId = url.split('/').pop()
    
    await route.fulfill({
      status: 200,
      json: {
        id: candidateId,
        name: 'Test User',
        email: 'test@example.com',
        phone: '+1234567890',
        finalScore: 80,
        summary: 'Strong technical candidate with excellent problem-solving skills.',
        strengths: ['Problem Solving', 'Technical Knowledge'],
        gap: 'Advanced Algorithms',
        updatedAt: new Date().toISOString(),
        sessions: [{
          id: 'session-1',
          answers: mockRubrics.map((rubric, index) => ({
            questionIndex: index,
            difficulty: mockQuestions[index].difficulty,
            question: mockQuestions[index].prompt,
            answerText: `Answer ${index + 1}`,
            durationMs: mockQuestions[index].difficulty === 'easy' ? E : mockQuestions[index].difficulty === 'medium' ? M : H,
            timeTakenMs: (mockQuestions[index].difficulty === 'easy' ? E : mockQuestions[index].difficulty === 'medium' ? M : H) - 5000,
            rubric
          }))
        }]
      }
    })
  })

  await page.route('**/api/sessions', async route => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 201,
        json: { id: 'session-1', candidateId: '1' }
      })
    } else {
      await route.fulfill({
        status: 200,
        json: { sessions: [] }
      })
    }
  })

  await page.route('**/api/sessions/*/answers', async route => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 201,
        json: { success: true }
      })
    } else {
      await route.fulfill({
        status: 200,
        json: { answers: [] }
      })
    }
  })
}
