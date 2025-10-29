#!/usr/bin/env node

import { prisma } from '../lib/db/client'

async function createTestCandidates() {
  try {
    console.log('🧪 Creating test candidates for interviewer dashboard...\n')
    
    // Sample candidates data
    const candidatesData = [
      {
        name: 'Alice Johnson',
        email: 'alice.johnson@example.com',
        phone: '+1-555-0101',
        resumeText: `Alice Johnson
Software Engineer | 5 years experience

EXPERIENCE:
- Senior Software Engineer at TechCorp (2021-2024)
- Frontend Developer at StartupXYZ (2019-2021)
- Junior Developer at WebSolutions (2018-2019)

SKILLS:
- JavaScript, TypeScript, React, Node.js
- Python, Django, PostgreSQL
- AWS, Docker, Kubernetes
- Agile methodologies

EDUCATION:
- Bachelor of Computer Science, MIT (2018)

Built scalable web applications serving 100k+ users. Led a team of 4 developers in migrating legacy systems to modern React architecture.`,
        finalScore: 85,
        summary: 'Strong full-stack developer with excellent React and Node.js skills',
        strengthsJson: JSON.stringify(['React expertise', 'Team leadership', 'System architecture']),
        gap: 'Could improve DevOps knowledge'
      },
      {
        name: 'Bob Chen',
        email: 'bob.chen@example.com',
        phone: '+1-555-0102',
        resumeText: `Bob Chen
Senior Backend Engineer | 7 years experience

EXPERIENCE:
- Lead Backend Engineer at DataFlow Inc (2020-2024)
- Backend Developer at CloudTech (2017-2020)

SKILLS:
- Java, Spring Boot, Microservices
- PostgreSQL, MongoDB, Redis
- Kafka, RabbitMQ, Docker
- System design and architecture

EDUCATION:
- Master of Computer Science, Stanford (2017)
- Bachelor of Software Engineering, UC Berkeley (2015)

Architected and implemented microservices handling 1M+ daily transactions. Expert in distributed systems and database optimization.`,
        finalScore: 92,
        summary: 'Exceptional backend engineer with strong system design skills',
        strengthsJson: JSON.stringify(['Microservices architecture', 'Database optimization', 'High-scale systems']),
        gap: 'Limited frontend experience'
      },
      {
        name: 'Carol Davis',
        email: 'carol.davis@example.com',
        phone: '+1-555-0103', 
        resumeText: `Carol Davis
Full Stack Developer | 3 years experience

EXPERIENCE:
- Full Stack Developer at InnovateApp (2021-2024)
- Frontend Developer Intern at WebCorp (2020-2021)

SKILLS:
- HTML, CSS, JavaScript, Vue.js
- PHP, Laravel, MySQL
- Git, Agile, REST APIs

EDUCATION:  
- Bachelor of Information Technology, University of Texas (2020)

Developed and maintained e-commerce platforms with payment integrations. Strong focus on user experience and responsive design.`,
        finalScore: 76,
        summary: 'Solid full-stack developer with good e-commerce experience',
        strengthsJson: JSON.stringify(['E-commerce platforms', 'Payment systems', 'Responsive design']),
        gap: 'Needs more experience with modern frameworks'
      },
      {
        name: 'David Wilson',
        email: 'david.wilson@example.com',
        phone: '+1-555-0104',
        resumeText: `David Wilson
DevOps Engineer | 4 years experience

EXPERIENCE:
- DevOps Engineer at CloudScale (2021-2024)
- Systems Administrator at TechSupport Inc (2019-2021)

SKILLS:
- AWS, Azure, Docker, Kubernetes
- Terraform, Ansible, Jenkins
- Python, Bash scripting
- Monitoring: Prometheus, Grafana

EDUCATION:
- Bachelor of Computer Engineering, Georgia Tech (2019)

Reduced deployment time by 80% through CI/CD automation. Managed infrastructure for applications serving 500k+ users with 99.9% uptime.`,
        finalScore: 88,
        summary: 'Strong DevOps engineer with excellent automation skills',
        strengthsJson: JSON.stringify(['CI/CD automation', 'Infrastructure as Code', 'Cloud platforms']),
        gap: 'Could expand development skills'
      },
      {
        name: 'Eva Martinez',
        email: 'eva.martinez@example.com',
        phone: '+1-555-0105',
        resumeText: `Eva Martinez
Frontend Developer | 2 years experience

EXPERIENCE:
- Frontend Developer at DesignPro (2022-2024)
- UI/UX Developer Intern at CreativeStudio (2021-2022)

SKILLS:
- React, Angular, TypeScript
- CSS3, Sass, Tailwind CSS
- Figma, Adobe Creative Suite
- Responsive design, accessibility

EDUCATION:
- Bachelor of Design Technology, Art Institute (2021)

Created award-winning user interfaces with focus on accessibility and performance. Collaborated with design teams to implement pixel-perfect designs.`,
        finalScore: 72,
        summary: 'Creative frontend developer with strong design skills',
        strengthsJson: JSON.stringify(['UI/UX design', 'Accessibility', 'Modern CSS']),
        gap: 'Limited backend experience, newer to the field'
      }
    ]

    for (const candidateData of candidatesData) {
      const candidate = await prisma.candidate.create({
        data: {
          name: candidateData.name,
          email: candidateData.email,
          phone: candidateData.phone,
          resumeText: candidateData.resumeText,
          finalScore: candidateData.finalScore,
          summary: candidateData.summary,
          strengthsJson: candidateData.strengthsJson,
          gap: candidateData.gap,
          // AI analysis data
          skillsJson: JSON.stringify({
            technical: candidateData.resumeText.match(/- ([^,\n]+)/g)?.map(s => s.replace('- ', '').trim()).slice(0, 8) || [],
            frameworks: candidateData.resumeText.includes('React') ? ['React'] : candidateData.resumeText.includes('Angular') ? ['Angular'] : [],
            languages: candidateData.resumeText.includes('JavaScript') ? ['JavaScript'] : candidateData.resumeText.includes('Java') ? ['Java'] : ['Python']
          }),
          experienceYears: parseInt(candidateData.resumeText.match(/(\d+) years? experience/)?.[1] || '2'),
          seniorityLevel: candidateData.resumeText.includes('Senior') || candidateData.resumeText.includes('Lead') ? 'senior' : 
                          candidateData.resumeText.includes('Junior') ? 'entry' : 'mid',
          qualityScore: Math.floor(candidateData.finalScore * 0.9), // Slightly lower than final score
          aiSummary: candidateData.summary,
          aiStrengthsJson: candidateData.strengthsJson
        }
      });

      // Create a mock interview session for each candidate
      const session = await prisma.interviewSession.create({
        data: {
          candidateId: candidate.id,
          stage: 'completed',
          currentIndex: 5,
          planJson: JSON.stringify([
            { id: '1', question: 'Tell me about yourself and your background.', answered: true },
            { id: '2', question: 'What are your strongest technical skills?', answered: true },
            { id: '3', question: 'Describe a challenging project you worked on.', answered: true },
            { id: '4', question: 'How do you handle working in a team environment?', answered: true },
            { id: '5', question: 'Where do you see yourself in 5 years?', answered: true }
          ])
        }
      });

      // Create sample answers for the interview
      const answers = [
        `I'm ${candidateData.name}, a passionate developer with ${candidateData.resumeText.match(/(\d+) years? experience/)?.[1] || '3'} years of experience. I love solving complex problems and building scalable solutions.`,
        `My strongest skills include the technologies I work with daily. I'm particularly good at system design and writing clean, maintainable code.`,
        `One challenging project was migrating a legacy system to a modern architecture. I had to ensure zero downtime while improving performance by 40%.`,
        `I believe in collaborative development. I enjoy code reviews, pair programming, and mentoring junior developers. Communication is key to successful teamwork.`,
        `I see myself growing into a technical leadership role, mentoring teams and architecting solutions that solve real business problems at scale.`
      ];

      for (let i = 0; i < 5; i++) {
        await prisma.answer.create({
          data: {
            sessionId: session.id,
            questionIndex: i,
            question: JSON.parse(session.planJson)[i].question,
            answerText: answers[i],
            difficulty: 'medium',
            durationMs: 120000, // 2 minutes
            timeTakenMs: 90000 + Math.floor(Math.random() * 30000), // 90-120 seconds
            rubricJson: JSON.stringify({
              technical_depth: Math.floor(candidateData.finalScore/20),
              communication: Math.floor((candidateData.finalScore + 5)/20),
              problem_solving: Math.floor((candidateData.finalScore - 2)/20),
              cultural_fit: Math.floor((candidateData.finalScore + 3)/20)
            }),
            submittedAt: new Date()
          }
        });
      }

      console.log(`✅ Created candidate: ${candidateData.name} (Score: ${candidateData.finalScore})`);
    }

    console.log('\n🎉 Test candidates created successfully!');
    console.log('\n📊 Summary:');
    console.log(`- Created ${candidatesData.length} candidates`);
    console.log(`- Each has a completed interview session`);
    console.log(`- Scores range from 72 to 92`);
    console.log(`- Ready for interviewer dashboard testing`);

  } catch (error) {
    console.error('❌ Error creating test candidates:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
createTestCandidates()