/**
 * Test Database Utilities
 * Provides utilities for setting up and managing test databases
 */

import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

// Create unique database path for each test worker
const getTestDbPath = () => {
  const workerId = process.env.VITEST_WORKER_ID || 'main';
  return path.join(process.cwd(), 'prisma', `test-${workerId}.db`);
};

/**
 * Create a test database instance
 */
export function createTestDatabase(): PrismaClient {
  const testDbPath = getTestDbPath();
  const databaseUrl = `file:${testDbPath}`;
  
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
  });

  return prisma;
}

/**
 * Setup test database (run migrations)
 */
export async function setupTestDatabase(): Promise<void> {
  const testDbPath = getTestDbPath();
  
  // Remove existing test database
  if (fs.existsSync(testDbPath)) {
    fs.unlinkSync(testDbPath);
  }

  // Set test database URL
  const databaseUrl = `file:${testDbPath}`;
  process.env.DATABASE_URL = databaseUrl;

  // Use db push for test database (faster than migrations)
  try {
    execSync('npx prisma db push --skip-generate', {
      stdio: 'pipe',
      env: { ...process.env, DATABASE_URL: databaseUrl },
    });
  } catch (error) {
    console.error('Failed to setup test database:', error);
    throw error;
  }
}

/**
 * Clean test database (remove all data)
 */
export async function cleanTestDatabase(prisma: PrismaClient): Promise<void> {
  // Delete in reverse order of dependencies
  // Wrap in try-catch to handle missing tables gracefully
  try {
    await prisma.score.deleteMany();
  } catch (e) {
    // Table might not exist yet
  }
  
  try {
    await prisma.answer.deleteMany();
  } catch (e) {
    // Table might not exist yet
  }
  
  try {
    await prisma.interviewSession.deleteMany();
  } catch (e) {
    // Table might not exist yet
  }
  
  try {
    await prisma.candidate.deleteMany();
  } catch (e) {
    // Table might not exist yet
  }
  
  try {
    await prisma.processingJob.deleteMany();
  } catch (e) {
    // Table might not exist yet
  }
  
  try {
    await prisma.auditLog.deleteMany();
  } catch (e) {
    // Table might not exist yet
  }
  
  try {
    await prisma.userSession.deleteMany();
  } catch (e) {
    // Table might not exist yet
  }
  
  try {
    await prisma.user.deleteMany();
  } catch (e) {
    // Table might not exist yet
  }
}

/**
 * Teardown test database (disconnect and remove file)
 */
export async function teardownTestDatabase(prisma: PrismaClient): Promise<void> {
  const testDbPath = getTestDbPath();
  
  await prisma.$disconnect();

  if (fs.existsSync(testDbPath)) {
    fs.unlinkSync(testDbPath);
  }
}

/**
 * Reset test database (clean and disconnect)
 */
export async function resetTestDatabase(prisma: PrismaClient): Promise<void> {
  await cleanTestDatabase(prisma);
}

/**
 * Test database context for vitest
 */
export async function createTestContext() {
  // Setup test database first
  await setupTestDatabase();
  
  const prisma = createTestDatabase();
  
  return {
    prisma,
    async cleanup() {
      await cleanTestDatabase(prisma);
    },
    async close() {
      await teardownTestDatabase(prisma);
    },
  };
}
