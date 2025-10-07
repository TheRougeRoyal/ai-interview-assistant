#!/usr/bin/env node

/**
 * Test script for AI resume processing
 * Usage: npm run test-ai-resume
 */

import { ask, getCurrentVendor, isVendorAvailable } from '../lib/ai/gateway'

const sampleResume = `
John Smith
Software Engineer
john.smith@email.com | (555) 123-4567

EXPERIENCE
Senior Software Engineer at TechCorp (2020-2024)
- Developed scalable web applications using React, Node.js, and PostgreSQL
- Led a team of 5 developers on multiple projects
- Implemented CI/CD pipelines using Docker and Jenkins
- Improved application performance by 40%

Mid-Level Developer at StartupXYZ (2018-2020)
- Built RESTful APIs using Python and Django
- Worked with AWS services including EC2, S3, and RDS
- Collaborated with cross-functional teams using Agile methodologies

EDUCATION
Bachelor of Science in Computer Science
State University (2014-2018)

SKILLS
Programming: JavaScript, Python, Java, TypeScript
Frameworks: React, Vue.js, Django, Flask, Express.js
Databases: PostgreSQL, MongoDB, Redis
Cloud: AWS, Docker, Kubernetes
Tools: Git, Jenkins, Jira, VS Code

CERTIFICATIONS
AWS Certified Solutions Architect
`

async function main() {
  console.log('🧪 AI Resume Processing Test')
  console.log('============================')
  
  const vendor = getCurrentVendor()
  const available = isVendorAvailable(vendor)
  
  console.log(`AI Vendor: ${vendor}`)
  console.log(`Available: ${available}`)
  console.log()

  if (!available) {
    console.log('❌ AI vendor not available. Check your environment variables.')
    console.log('For OpenAI: Set OPENAI_API_KEY')
    console.log('For Mock: Set AI_VENDOR=mock')
    return
  }

  try {
    console.log('🔍 Analyzing sample resume...')
    console.log()
    
    const result = await ask('analyze_resume', { resumeText: sampleResume })
    
    console.log('✅ Analysis completed!')
    console.log()
    console.log('📊 Results:')
    console.log('===========')
    console.log(`Experience: ${result.experience_years} years`)
    console.log(`Seniority: ${result.seniority_level}`)
    console.log(`Quality Score: ${result.quality_score}/100`)
    console.log()
    
    console.log('💪 Strengths:')
    result.strengths.forEach((strength: string, i: number) => {
      console.log(`${i + 1}. ${strength}`)
    })
    console.log()
    
    console.log('🎯 Professional Summary:')
    console.log(result.summary)
    console.log()
    
    console.log('🛠️ Skills by Category:')
    Object.entries(result.skills).forEach(([category, skills]: [string, any]) => {
      if (skills && skills.length > 0) {
        console.log(`  ${category}: ${skills.join(', ')}`)
      }
    })
    console.log()
    
    console.log('✅ Test completed successfully!')
    
  } catch (error) {
    console.error('❌ Test failed:', error)
    if (error instanceof Error) {
      console.error('Error details:', error.message)
    }
  }
}

main().catch(console.error)