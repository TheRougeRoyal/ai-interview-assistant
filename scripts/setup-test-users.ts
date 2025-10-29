#!/usr/bin/env node

import { prisma } from '../lib/db/client'
import { createUser } from '../lib/db/repositories/authRepo'

async function setupTestUsers() {
  try {
    console.log('🧹 Clearing existing users...\n')
    
    // Clear all existing sessions first (foreign key constraint)
    const deletedSessions = await prisma.userSession.deleteMany({})
    console.log(`   Deleted ${deletedSessions.count} user sessions`)
    
    // Clear all existing users
    const deletedUsers = await prisma.user.deleteMany({})
    console.log(`   Deleted ${deletedUsers.count} users`)
    
    // Clear candidates (might be linked to users)
    const deletedCandidates = await prisma.candidate.deleteMany({})
    console.log(`   Deleted ${deletedCandidates.count} candidates`)
    
    console.log('\n👥 Creating test users...\n')
    
    // Create test interviewer
    const interviewer = await createUser({
      email: 'interviewer@test.com',
      // Use an 8+ char password to satisfy API validation
      password: 'test1234',
      role: 'interviewer',
      name: 'Test Interviewer',
      phone: '+1-555-0001'
    })
    
    console.log('✅ Created interviewer:')
    console.log(`   Email: interviewer@test.com`)
    console.log(`   Password: test123`)
    console.log(`   Role: ${interviewer.role}`)
    console.log(`   Name: ${interviewer.name}`)
    console.log()
    
    // Create test interviewee
    const interviewee = await createUser({
      email: 'interviewee@test.com',
      // Use an 8+ char password to satisfy API validation
      password: 'test1234',
      role: 'interviewee',
      name: 'Test Interviewee',
      phone: '+1-555-0002'
    })
    
    console.log('✅ Created interviewee:')
    console.log(`   Email: interviewee@test.com`)
    console.log(`   Password: test123`)
    console.log(`   Role: ${interviewee.role}`)
    console.log(`   Name: ${interviewee.name}`)
    console.log()
    
    console.log('🎉 Test users setup complete!')
    console.log('\n📋 Login Credentials:')
    console.log('='.repeat(40))
    console.log('INTERVIEWER:')
    console.log('  Email: interviewer@test.com')
    console.log('  Password: test1234')
    console.log()
    console.log('INTERVIEWEE:')
    console.log('  Email: interviewee@test.com')
    console.log('  Password: test1234')
    console.log('='.repeat(40))
    
  } catch (error) {
    console.error('❌ Error setting up test users:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the script
setupTestUsers()