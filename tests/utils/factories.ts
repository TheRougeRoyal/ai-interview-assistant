/**
 * Test Data Factories
 * Factory functions for generating realistic test data
 */

import type { PrismaClient, User, Candidate, InterviewSession, Answer, Score } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { random } from './helpers';

const sampleNames = ['John Doe', 'Jane Smith', 'Bob Johnson', 'Alice Williams', 'Charlie Brown'];
const sampleSkills = ['JavaScript', 'TypeScript', 'React', 'Node.js', 'Python', 'Java'];
const sampleTopics = ['Introduction', 'Technical Skills', 'Problem Solving', 'System Design'];

/**
 * User factory
 */
export async function createTestUser(
  prisma: PrismaClient,
  overrides?: Partial<User>
): Promise<User> {
  const hashedPassword = await bcrypt.hash('password123', 10);

  return prisma.user.create({
    data: {
      email: random.email(),
      password: hashedPassword,
      role: 'interviewee',
      name: random.arrayElement(sampleNames),
      phone: `+1${random.number(2000000000, 9999999999)}`,
      ...overrides,
    },
  });
}

/**
 * Interviewer factory
 */
export async function createTestInterviewer(
  prisma: PrismaClient,
  overrides?: Partial<User>
): Promise<User> {
  return createTestUser(prisma, { role: 'interviewer', ...overrides });
}

/**
 * Candidate factory
 */
export async function createTestCandidate(
  prisma: PrismaClient,
  overrides?: Partial<Omit<Candidate, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<Candidate> {
  const name = random.arrayElement(sampleNames);
  const email = random.email();

  return prisma.candidate.create({
    data: {
      name,
      email,
      phone: `+1${random.number(2000000000, 9999999999)}`,
      resumeText: 'Sample resume text for testing purposes. This candidate has extensive experience in software development.',
      finalScore: random.number(0, 100),
      summary: 'Experienced software engineer with strong technical skills.',
      strengthsJson: JSON.stringify([
        'Strong problem-solving skills',
        'Good communication',
        'Team player',
      ]),
      gap: 'Could improve documentation skills',
      skillsJson: JSON.stringify({
        technical: random.arrayElement([sampleSkills.slice(0, 3), sampleSkills.slice(2, 5)]),
        soft: ['Communication', 'Leadership'],
      }),
      experienceYears: random.number(0, 20),
      seniorityLevel: random.arrayElement(['entry', 'mid', 'senior', 'lead']),
      qualityScore: random.number(0, 100),
      aiSummary: 'Well-qualified candidate with relevant experience.',
      aiStrengthsJson: JSON.stringify([
        'Technical proficiency',
        'Problem-solving ability',
      ]),
      ...overrides,
    },
  });
}

/**
 * Interview session factory
 */
export async function createTestSession(
  prisma: PrismaClient,
  candidateId: string,
  overrides?: Partial<Omit<InterviewSession, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<InterviewSession> {
  const plan = [
    { difficulty: 'easy', topic: random.arrayElement(sampleTopics) },
    { difficulty: 'medium', topic: random.arrayElement(sampleTopics) },
    { difficulty: 'hard', topic: random.arrayElement(sampleTopics) },
  ];

  return prisma.interviewSession.create({
    data: {
      candidateId,
      stage: 'in_progress',
      currentIndex: 0,
      planJson: JSON.stringify(plan),
      ...overrides,
    },
  });
}

/**
 * Answer factory
 */
export async function createTestAnswer(
  prisma: PrismaClient,
  sessionId: string,
  questionIndex: number,
  overrides?: Partial<Omit<Answer, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<Answer> {
  const rubric = {
    accuracy: random.number(0, 25),
    completeness: random.number(0, 25),
    relevance: random.number(0, 25),
    timeliness: random.number(0, 25),
    total: 0,
  };
  rubric.total = rubric.accuracy + rubric.completeness + rubric.relevance + rubric.timeliness;

  return prisma.answer.create({
    data: {
      sessionId,
      questionIndex,
      difficulty: random.arrayElement(['easy', 'medium', 'hard']),
      question: `What is your experience with ${random.arrayElement(sampleSkills)}?`,
      answerText: 'I have several years of experience working with this technology in various projects.',
      durationMs: random.number(60000, 300000),
      timeTakenMs: random.number(30000, 290000),
      rubricJson: JSON.stringify(rubric),
      submittedAt: new Date(Date.now() - random.number(0, 7 * 24 * 60 * 60 * 1000)),
      ...overrides,
    },
  });
}

/**
 * Score factory
 */
export async function createTestScore(
  prisma: PrismaClient,
  answerId: string,
  reviewerId: string,
  overrides?: Partial<Omit<Score, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<Score> {
  return prisma.score.create({
    data: {
      answerId,
      reviewerId,
      score: random.number(0, 100),
      feedback: 'Good answer with clear explanation and relevant examples.',
      ...overrides,
    },
  });
}

/**
 * Processing job factory
 */
export async function createTestProcessingJob(
  prisma: PrismaClient,
  overrides?: Partial<any>
): Promise<any> {
  return prisma.processingJob.create({
    data: {
      fileId: random.uuid(),
      fileName: `resume-${random.string()}.pdf`,
      fileSize: random.number(1000, 10000000),
      format: random.arrayElement(['pdf', 'docx', 'txt']),
      status: 'pending',
      progress: 0,
      priority: 'normal',
      ...overrides,
    },
  });
}

/**
 * Audit log factory
 */
export async function createTestAuditLog(
  prisma: PrismaClient,
  overrides?: Partial<any>
): Promise<any> {
  return prisma.auditLog.create({
    data: {
      userId: random.uuid(),
      userEmail: random.email(),
      userName: random.arrayElement(sampleNames),
      action: random.arrayElement([
        'user.login',
        'user.logout',
        'candidate.create',
        'candidate.update',
        'answer.submit',
      ]),
      resource: random.arrayElement(['user', 'candidate', 'answer', 'session']),
      resourceId: random.uuid(),
      method: random.arrayElement(['GET', 'POST', 'PUT', 'DELETE']),
      path: `/api/${random.string()}`,
      ipAddress: `192.168.${random.number(0, 255)}.${random.number(0, 255)}`,
      userAgent: 'Mozilla/5.0 (Test Browser)',
      status: 'success',
      statusCode: 200,
      timestamp: new Date(Date.now() - random.number(0, 30 * 24 * 60 * 60 * 1000)),
      ...overrides,
    },
  });
}

/**
 * Create a complete test candidate with session and answers
 */
export async function createCompleteTestCandidate(
  prisma: PrismaClient,
  options?: {
    answersCount?: number;
    withScores?: boolean;
  }
): Promise<{
  candidate: Candidate;
  session: InterviewSession;
  answers: Answer[];
  scores?: Score[];
}> {
  const { answersCount = 3, withScores = false } = options || {};

  const candidate = await createTestCandidate(prisma);
  const session = await createTestSession(prisma, candidate.id);

  const answers: Answer[] = [];
  for (let i = 0; i < answersCount; i++) {
    const answer = await createTestAnswer(prisma, session.id, i);
    answers.push(answer);
  }

  let scores: Score[] | undefined;
  if (withScores) {
    const interviewer = await createTestInterviewer(prisma);
    scores = [];
    for (const answer of answers) {
      const score = await createTestScore(prisma, answer.id, interviewer.id);
      scores.push(score);
    }
  }

  return { candidate, session, answers, scores };
}

/**
 * Seed database with sample data
 */
export async function seedTestDatabase(
  prisma: PrismaClient,
  options?: {
    usersCount?: number;
    candidatesCount?: number;
    interviewersCount?: number;
  }
): Promise<void> {
  const { usersCount = 5, candidatesCount = 10, interviewersCount = 3 } = options || {};

  // Create interviewers
  const interviewers: User[] = [];
  for (let i = 0; i < interviewersCount; i++) {
    const interviewer = await createTestInterviewer(prisma);
    interviewers.push(interviewer);
  }

  // Create regular users
  for (let i = 0; i < usersCount; i++) {
    await createTestUser(prisma);
  }

  // Create candidates with sessions and answers
  for (let i = 0; i < candidatesCount; i++) {
    await createCompleteTestCandidate(prisma, {
      answersCount: random.number(1, 6),
      withScores: random.boolean(),
    });
  }
}
