#!/usr/bin/env node

/**
 * Script to batch process existing candidate resumes with AI analysis
 * Usage: npm run process-resumes [--dry-run] [--limit=N]
 */

import { prisma } from '../lib/db/client'
import { aiResumeProcessor } from '../lib/services/ai-resume-processor'
import { toCandidateDTO } from '../lib/db/dto'

interface ProcessingStats {
  total: number
  processed: number
  skipped: number
  failed: number
  errors: Array<{ candidateId: string; error: string }>
}

async function main() {
  const args = process.argv.slice(2)
  const isDryRun = args.includes('--dry-run')
  const limitArg = args.find(arg => arg.startsWith('--limit='))
  const limit = limitArg ? parseInt(limitArg.split('=')[1]) : undefined

  console.log('🔍 AI Resume Processing Script')
  console.log('============================')
  if (isDryRun) console.log('🏃 DRY RUN MODE - No changes will be made')
  if (limit) console.log(`📊 Processing limit: ${limit} candidates`)
  console.log()

  try {
    // Find candidates with resume text but no AI analysis
    const candidates = await prisma.candidate.findMany({
      where: {
        resumeText: { not: null }
      },
      select: {
        id: true,
        name: true,
        email: true,
        resumeText: true,
        createdAt: true
      },
      take: limit,
      orderBy: { createdAt: 'desc' }
    })

    const stats: ProcessingStats = {
      total: candidates.length,
      processed: 0,
      skipped: 0,
      failed: 0,
      errors: []
    }

    console.log(`Found ${candidates.length} candidates to process`)
    console.log()

    if (candidates.length === 0) {
      console.log('✅ No candidates need resume processing')
      return
    }

    for (let i = 0; i < candidates.length; i++) {
      const candidate = candidates[i]
      const progress = `[${i + 1}/${candidates.length}]`
      
      console.log(`${progress} Processing: ${candidate.name} (${candidate.email})`)
      
      if (!candidate.resumeText) {
        console.log(`  ⏭️  Skipped - No resume text`)
        stats.skipped++
        continue
      }

      if (candidate.resumeText.length < 50) {
        console.log(`  ⏭️  Skipped - Resume too short (${candidate.resumeText.length} chars)`)
        stats.skipped++
        continue
      }

      if (isDryRun) {
        console.log(`  🏃 Would process resume (${candidate.resumeText.length} chars)`)
        stats.processed++
        continue
      }

      try {
        const result = await aiResumeProcessor.processResumeText(candidate.id, candidate.resumeText)
        
        if (result.success && result.analysis) {
          console.log(`  ✅ Processed successfully`)
          console.log(`     - Skills: ${Object.values(result.analysis.skills).flat().length} total`)
          console.log(`     - Experience: ${result.analysis.experienceYears} years (${result.analysis.seniorityLevel})`)
          console.log(`     - Quality: ${result.analysis.qualityScore}/100`)
          stats.processed++
        } else {
          console.log(`  ❌ Failed: ${result.error}`)
          stats.failed++
          stats.errors.push({ candidateId: candidate.id, error: result.error || 'Unknown error' })
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error'
        console.log(`  ❌ Failed: ${errorMsg}`)
        stats.failed++
        stats.errors.push({ candidateId: candidate.id, error: errorMsg })
      }

      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 1000))
      console.log()
    }

    // Print final stats
    console.log('📊 Processing Summary')
    console.log('===================')
    console.log(`Total candidates: ${stats.total}`)
    console.log(`✅ Processed: ${stats.processed}`)
    console.log(`⏭️  Skipped: ${stats.skipped}`)
    console.log(`❌ Failed: ${stats.failed}`)
    
    if (stats.errors.length > 0) {
      console.log()
      console.log('❌ Errors:')
      stats.errors.forEach(({ candidateId, error }) => {
        console.log(`  - ${candidateId}: ${error}`)
      })
    }

    console.log()
    if (isDryRun) {
      console.log('🏃 DRY RUN completed - run without --dry-run to process resumes')
    } else {
      console.log('✅ Processing completed!')
    }

  } catch (error) {
    console.error('💥 Script failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the script
main().catch(console.error)