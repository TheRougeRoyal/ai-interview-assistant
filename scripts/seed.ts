#!/usr/bin/env tsx
/**
 * Database Seeding CLI
 * 
 * Usage:
 *   npm run seed              # Seeds development environment
 *   npm run seed:dev          # Same as above
 *   npm run seed:staging      # Seeds staging environment
 *   npm run seed:production   # Seeds production (warning only)
 *   npm run seed:clear        # Clears all data
 *   npm run seed:random 50    # Seeds 50 random candidates
 * 
 * Or directly:
 *   npx tsx scripts/seed.ts [environment]
 *   npx tsx scripts/seed.ts random [count]
 *   npx tsx scripts/seed.ts clear
 */

import { PrismaClient } from '@prisma/client';
import { seedDatabase, clearDatabase, seedRandomCandidates } from '@/lib/db/seeding';

const prisma = new PrismaClient();

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'development';
  
  console.log('🌱 Database Seeding Tool\n');
  
  try {
    if (command === 'clear') {
      console.log('⚠️  Clearing all database data...\n');
      const confirm = process.env.FORCE_CLEAR === 'true';
      
      if (!confirm) {
        console.error('❌ Clearing database requires FORCE_CLEAR=true environment variable');
        console.log('\nExample: FORCE_CLEAR=true npx tsx scripts/seed.ts clear\n');
        process.exit(1);
      }
      
      await clearDatabase(prisma);
      console.log('\n✅ Database cleared successfully');
      
    } else if (command === 'random') {
      const count = parseInt(args[1] || '10', 10);
      
      if (isNaN(count) || count < 1) {
        console.error('❌ Invalid count. Usage: npx tsx scripts/seed.ts random [count]');
        process.exit(1);
      }
      
      console.log(`🎲 Seeding ${count} random candidates...\n`);
      await seedRandomCandidates(prisma, count);
      console.log('\n✅ Random candidates created successfully');
      
    } else {
      // Seed specific environment
      const environment = command as 'development' | 'staging' | 'production';
      
      if (!['development', 'staging', 'production'].includes(environment)) {
        console.error('❌ Invalid environment. Use: development, staging, production, clear, or random');
        process.exit(1);
      }
      
      console.log(`🌱 Seeding ${environment} environment...\n`);
      await seedDatabase(prisma, environment);
      console.log(`\n✅ ${environment} environment seeded successfully`);
    }
    
  } catch (error) {
    console.error('\n❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
