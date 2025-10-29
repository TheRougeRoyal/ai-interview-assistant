/**
 * Test script to verify DeepSeek AI integration
 * Run with: npx tsx scripts/test-deepseek.ts
 */

import { ask } from '../lib/ai/enhanced-gateway'

async function testDeepSeek() {
  console.log('🧪 Testing DeepSeek AI Integration\n')
  console.log('=' .repeat(60))

  try {
    // Test 1: Generate Question
    console.log('\n📝 Test 1: Generate Interview Question')
    console.log('-'.repeat(60))
    const question = await ask('generate_question', {
      difficulty: 'medium',
      role: 'Full Stack Developer',
      resumeContext: 'Experienced with React, Node.js, and PostgreSQL'
    })
    console.log('✅ Question generated:')
    console.log(`   "${question.prompt}"`)

    // Test 2: Score Answer
    console.log('\n📊 Test 2: Score Candidate Answer')
    console.log('-'.repeat(60))
    const rubric = await ask('score', {
      question: 'Explain the difference between SQL and NoSQL databases.',
      answer: 'SQL databases are relational and use structured query language with predefined schemas. NoSQL databases are non-relational, more flexible, and can handle unstructured data. SQL is better for complex queries and transactions, while NoSQL excels at scalability and handling large volumes of diverse data.',
      durationMs: 300000, // 5 minutes
      timeTakenMs: 120000  // 2 minutes
    })
    console.log('✅ Answer scored:')
    console.log(`   Accuracy: ${rubric.accuracy}/100`)
    console.log(`   Completeness: ${rubric.completeness}/100`)
    console.log(`   Relevance: ${rubric.relevance}/100`)
    console.log(`   Timeliness: ${rubric.timeliness}/100`)
    console.log(`   Total Score: ${rubric.total}/100`)
    console.log(`   Rationale: "${rubric.rationale}"`)

    // Test 3: Generate Summary
    console.log('\n📋 Test 3: Generate Interview Summary')
    console.log('-'.repeat(60))
    const summary = await ask('summary', {
      rubrics: [
        {
          accuracy: 85,
          completeness: 80,
          relevance: 90,
          timeliness: 70,
          total: 82,
          rationale: 'Strong technical understanding with good examples'
        },
        {
          accuracy: 75,
          completeness: 85,
          relevance: 80,
          timeliness: 80,
          total: 79,
          rationale: 'Good explanation, could be more concise'
        },
        {
          accuracy: 90,
          completeness: 90,
          relevance: 85,
          timeliness: 75,
          total: 86,
          rationale: 'Excellent answer with clear structure'
        }
      ]
    })
    console.log('✅ Summary generated:')
    console.log(`   Final Score: ${summary.finalScore}/100`)
    console.log(`   Summary: "${summary.summary}"`)
    console.log(`   Strengths: ${summary.strengths.join(', ')}`)
    console.log(`   Gap: "${summary.gap}"`)

    // Test 4: Analyze Resume
    console.log('\n📄 Test 4: Analyze Resume')
    console.log('-'.repeat(60))
    const analysis = await ask('analyze_resume', {
      resumeText: `John Doe
Senior Software Engineer

Experience:
- 6 years in full-stack development
- Lead Developer at Tech Corp (2020-2024)
- Software Engineer at StartupXYZ (2018-2020)

Skills:
- Languages: JavaScript, TypeScript, Python, SQL
- Frontend: React, Next.js, Vue.js
- Backend: Node.js, Express, Django
- Databases: PostgreSQL, MongoDB, Redis
- Cloud: AWS, Docker, Kubernetes
- Tools: Git, CI/CD, Agile methodologies

Education:
- B.S. Computer Science, State University (2018)

Certifications:
- AWS Certified Solutions Architect
- Certified Kubernetes Administrator`
    })
    console.log('✅ Resume analyzed:')
    console.log(`   Experience: ${analysis.experience_years} years`)
    console.log(`   Seniority: ${analysis.seniority_level}`)
    console.log(`   Quality Score: ${analysis.quality_score}/100`)
    console.log(`   Technical Skills: ${analysis.skills.technical.slice(0, 5).join(', ')}...`)
    console.log(`   Frameworks: ${analysis.skills.frameworks.slice(0, 3).join(', ')}`)
    console.log(`   Tools: ${analysis.skills.tools.slice(0, 3).join(', ')}`)
    console.log(`   Summary: "${analysis.summary}"`)
    console.log(`   Strengths: ${analysis.strengths.slice(0, 3).join(', ')}`)

    console.log('\n' + '='.repeat(60))
    console.log('✅ All DeepSeek AI tests passed successfully!')
    console.log('='.repeat(60))
    
  } catch (error: any) {
    console.error('\n❌ Test failed:', error)
    console.error('Error details:', error.message || error)
    if (error.code) {
      console.error('Error code:', error.code)
    }
    process.exit(1)
  }
}

// Run tests
testDeepSeek()
  .then(() => {
    console.log('\n✅ Test script completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Test script failed:', error)
    process.exit(1)
  })
