#!/usr/bin/env node

import { prisma } from '../lib/db/client'

async function checkDatabase() {
  try {
    console.log('🔍 Checking database contents...\n')
    
    // Check candidates
    const candidates = await prisma.candidate.findMany({
      include: {
        sessions: {
          include: {
            answers: true
          }
        }
      }
    })
    
    console.log(`📊 Found ${candidates.length} candidates`)
    
    if (candidates.length > 0) {
      console.log('\nCandidate details:')
      candidates.forEach((candidate, index) => {
        console.log(`${index + 1}. ${candidate.name} (${candidate.email})`)
        console.log(`   - Created: ${candidate.createdAt}`)
        console.log(`   - Sessions: ${candidate.sessions.length}`)
        if (candidate.sessions.length > 0) {
          candidate.sessions.forEach((session, sessionIndex) => {
            console.log(`     Session ${sessionIndex + 1}: ${session.answers.length} answers`)
          })
        }
        console.log(`   - Final Score: ${candidate.finalScore || 'Not set'}`)
        console.log()
      })
    } else {
      console.log('❌ No candidates found in database')
    }
    
    // Check interview sessions
    const sessions = await prisma.interviewSession.findMany()
    console.log(`📝 Found ${sessions.length} interview sessions`)
    
    // Check answers
    const answers = await prisma.answer.findMany()
    console.log(`💬 Found ${answers.length} answers`)
    
  } catch (error) {
    console.error('❌ Error checking database:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkDatabase()