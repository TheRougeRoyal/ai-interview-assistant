#!/usr/bin/env node

import { prisma } from '../lib/db/client'

async function checkUsers() {
  try {
    console.log('👥 Checking users in database...\n')
    
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        role: true,
        name: true,
        phone: true,
        createdAt: true,
        updatedAt: true,
      }
    })
    
    console.log(`📊 Found ${users.length} users`)
    
    if (users.length > 0) {
      console.log('\nUser details:')
      users.forEach((user, index) => {
        console.log(`${index + 1}. ${user.name} (${user.email})`)
        console.log(`   - Role: ${user.role}`)
        console.log(`   - Phone: ${user.phone || 'Not set'}`)
        console.log(`   - Created: ${user.createdAt}`)
        console.log()
      })
    } else {
      console.log('❌ No users found in database')
    }
    
  } catch (error) {
    console.error('❌ Error checking users:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the script
checkUsers()