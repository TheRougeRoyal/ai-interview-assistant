/**
 * Database Seeding Utilities
 * Provides utilities for seeding database with test/demo data
 */

import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

export type Environment = 'development' | 'staging' | 'production';

/**
 * Seed database based on environment
 */
export async function seedDatabase(
  prisma: PrismaClient,
  env: Environment = 'development'
): Promise<void> {
  console.log(`Seeding database for ${env} environment...`);
  
  switch (env) {
    case 'development':
      await seedDevelopment(prisma);
      break;
    case 'staging':
      await seedStaging(prisma);
      break;
    case 'production':
      await seedProduction(prisma);
      break;
  }
  
  console.log('✅ Database seeded successfully');
}

/**
 * Seed development environment with test data
 */
async function seedDevelopment(prisma: PrismaClient): Promise<void> {
  console.log('Creating development seed data...');
  
  // Create test users
  const hashedPassword = await hash('password123', 10);
  
  const interviewer = await prisma.user.upsert({
    where: { email: 'interviewer@test.com' },
    update: {},
    create: {
      email: 'interviewer@test.com',
      password: hashedPassword,
      name: 'Test Interviewer',
      role: 'interviewer',
    },
  });
  
  const interviewee = await prisma.user.upsert({
    where: { email: 'interviewee@test.com' },
    update: {},
    create: {
      email: 'interviewee@test.com',
      password: hashedPassword,
      name: 'Test Interviewee',
      role: 'interviewee',
    },
  });
  
  console.log('Created test users:', { interviewer: interviewer.email, interviewee: interviewee.email });
  
  // Create sample candidates
  const candidates = await Promise.all([
    prisma.candidate.upsert({
      where: { email: 'john.doe@example.com' },
      update: {},
      create: {
        name: 'John Doe',
        email: 'john.doe@example.com',
        phone: '+1234567890',
        resumeFile: 'samples/john-doe-resume.pdf',
        resumeMime: 'application/pdf',
        resumeSize: 150000,
        resumeText: 'Senior full-stack developer with 8+ years of experience in React, Node.js, and cloud technologies.',
        seniorityLevel: 'senior',
        experienceYears: 8,
        finalScore: 85,
        userId: interviewee.id,
      },
    }),
    prisma.candidate.upsert({
      where: { email: 'jane.smith@example.com' },
      update: {},
      create: {
        name: 'Jane Smith',
        email: 'jane.smith@example.com',
        phone: '+1234567891',
        resumeFile: 'samples/jane-smith-resume.pdf',
        resumeMime: 'application/pdf',
        resumeSize: 120000,
        resumeText: 'Mid-level frontend developer specializing in React and TypeScript.',
        seniorityLevel: 'mid',
        experienceYears: 5,
        finalScore: 78,
      },
    }),
    prisma.candidate.upsert({
      where: { email: 'bob.johnson@example.com' },
      update: {},
      create: {
        name: 'Bob Johnson',
        email: 'bob.johnson@example.com',
        phone: '+1234567892',
        resumeFile: 'samples/bob-johnson-resume.pdf',
        resumeMime: 'application/pdf',
        resumeSize: 100000,
        resumeText: 'Entry-level backend developer with Node.js and database experience.',
        seniorityLevel: 'entry',
        experienceYears: 2,
        finalScore: 65,
      },
    }),
  ]);
  
  console.log(`Created ${candidates.length} sample candidates`);
  
  // Create interview sessions for first candidate
  const session = await prisma.interviewSession.create({
    data: {
      candidateId: candidates[0].id,
      stage: 'completed',
      currentIndex: 6,
      planJson: JSON.stringify([
        { difficulty: 'easy', count: 2 },
        { difficulty: 'medium', count: 2 },
        { difficulty: 'hard', count: 2 },
      ]),
    },
  });
  
  console.log('Created sample interview session');
  
  // Create sample answers
  const answers = await Promise.all([
    prisma.answer.create({
      data: {
        sessionId: session.id,
        questionIndex: 0,
        question: 'Tell me about your experience with React.',
        answerText: 'I have 5 years of experience working with React, including building complex SPAs and using hooks extensively.',
        difficulty: 'easy',
        durationMs: 120000,
        timeTakenMs: 110000,
        submittedAt: new Date(),
      },
    }),
    prisma.answer.create({
      data: {
        sessionId: session.id,
        questionIndex: 1,
        question: 'Explain the difference between useMemo and useCallback.',
        answerText: 'useMemo memoizes values while useCallback memoizes functions. Both help optimize performance.',
        difficulty: 'medium',
        durationMs: 120000,
        timeTakenMs: 95000,
        submittedAt: new Date(),
      },
    }),
    prisma.answer.create({
      data: {
        sessionId: session.id,
        questionIndex: 2,
        question: 'How would you implement authentication in a Next.js app?',
        answerText: 'I would use NextAuth.js with JWT tokens, storing session data securely and implementing proper CSRF protection.',
        difficulty: 'hard',
        durationMs: 120000,
        timeTakenMs: 118000,
        submittedAt: new Date(),
      },
    }),
  ]);
  
  console.log(`Created ${answers.length} sample answers`);
  
  // Create sample scores
  await Promise.all(
    answers.map((answer, index) =>
      prisma.score.create({
        data: {
          answerId: answer.id,
          reviewerId: interviewer.id,
          score: 80 + index * 5,
          feedback: `Good answer with solid understanding. Score: ${80 + index * 5}/100`,
        },
      })
    )
  );  console.log('Created sample scores');
}

/**
 * Seed staging environment with realistic test data
 */
async function seedStaging(prisma: PrismaClient): Promise<void> {
  console.log('Creating staging seed data...');
  
  // Create admin users for staging
  const hashedPassword = await hash('staging-password-2024', 10);
  
  await prisma.user.upsert({
    where: { email: 'admin@staging.example.com' },
    update: {},
    create: {
      email: 'admin@staging.example.com',
      password: hashedPassword,
      name: 'Staging Admin',
      role: 'interviewer',
    },
  });
  
  console.log('Created staging admin user');
}

/**
 * Seed production environment (minimal or no seeding)
 */
async function seedProduction(prisma: PrismaClient): Promise<void> {
  console.log('Production environment - no automatic seeding');
  console.log('⚠️  Production data should be added manually or through migration scripts');
}

/**
 * Clear all data from database (for testing)
 */
export async function clearDatabase(prisma: PrismaClient): Promise<void> {
  console.log('⚠️  Clearing all data from database...');
  
  // Delete in reverse order of dependencies
  await prisma.score.deleteMany();
  await prisma.answer.deleteMany();
  await prisma.interviewSession.deleteMany();
  await prisma.candidate.deleteMany();
  await prisma.processingJob.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.userSession.deleteMany();
  await prisma.user.deleteMany();
  
  console.log('✅ Database cleared');
}

/**
 * Seed specific number of random candidates
 */
export async function seedRandomCandidates(
  prisma: PrismaClient,
  count: number = 50
): Promise<void> {
  console.log(`Generating ${count} random candidates...`);
  
  const seniorityLevels = ['junior', 'mid', 'senior', 'lead', 'principal'] as const;
  const firstNames = ['John', 'Jane', 'Bob', 'Alice', 'Charlie', 'Diana', 'Eve', 'Frank'];
  const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis'];
  
  for (let i = 0; i < count; i++) {
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}.${i}@example.com`;
    
    await prisma.candidate.create({
      data: {
        name: `${firstName} ${lastName}`,
        email,
        phone: `+1${Math.floor(Math.random() * 10000000000).toString().padStart(10, '0')}`,
        resumeFile: `samples/${email}.pdf`,
        resumeMime: 'application/pdf',
        resumeSize: Math.floor(Math.random() * 200000) + 50000,
        resumeText: `${seniorityLevels[Math.floor(Math.random() * seniorityLevels.length)]} developer with experience in various technologies.`,
        seniorityLevel: seniorityLevels[Math.floor(Math.random() * seniorityLevels.length)],
        experienceYears: Math.floor(Math.random() * 15) + 1,
        finalScore: Math.floor(Math.random() * 40) + 60, // 60-100
      },
    });
  }
  
  console.log(`✅ Created ${count} random candidates`);
}
