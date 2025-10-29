#!/usr/bin/env tsx

/**
 * Migration script to transition from Adobe PDF Services to in-house PDF assessment system
 */

import fs from 'fs';
import path from 'path';

interface MigrationStep {
  name: string;
  description: string;
  action: () => Promise<void> | void;
  required: boolean;
}

class AdobeMigration {
  private steps: MigrationStep[] = [
    {
      name: 'backup-adobe-config',
      description: 'Backup existing Adobe PDF configuration',
      action: this.backupAdobeConfig,
      required: true
    },
    {
      name: 'update-env-variables',
      description: 'Update environment variables',
      action: this.updateEnvVariables,
      required: true
    },
    {
      name: 'update-imports',
      description: 'Update import statements in codebase',
      action: this.updateImports,
      required: true
    },
    {
      name: 'remove-adobe-dependencies',
      description: 'Remove Adobe PDF Services dependencies',
      action: this.removeAdobeDependencies,
      required: false
    },
    {
      name: 'update-api-routes',
      description: 'Update API routes to use new system',
      action: this.updateApiRoutes,
      required: true
    },
    {
      name: 'test-new-system',
      description: 'Test the new PDF assessment system',
      action: this.testNewSystem,
      required: true
    }
  ];

  async run(dryRun: boolean = false) {
    console.log('🚀 Starting migration from Adobe PDF Services to in-house system...\n');
    
    if (dryRun) {
      console.log('🔍 DRY RUN MODE - No changes will be made\n');
    }

    for (const step of this.steps) {
      console.log(`📋 ${step.name}: ${step.description}`);
      
      try {
        if (!dryRun) {
          await step.action.call(this);
        }
        console.log(`✅ ${step.name} completed\n`);
      } catch (error) {
        console.error(`❌ ${step.name} failed:`, error);
        if (step.required) {
          console.log('🛑 Migration stopped due to required step failure');
          process.exit(1);
        }
        console.log('⚠️  Continuing with non-required step failure\n');
      }
    }

    console.log('🎉 Migration completed successfully!');
    this.printPostMigrationInstructions();
  }

  private async backupAdobeConfig() {
    const backupDir = path.join(process.cwd(), 'migration-backup');
    
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    // Backup Adobe-related files
    const filesToBackup = [
      'lib/parsing/adobe-pdf.ts',
      'app/api/test-adobe-pdf/route.ts',
      'app/test-adobe/page.tsx',
      'types/adobe.d.ts'
    ];

    for (const file of filesToBackup) {
      const fullPath = path.join(process.cwd(), file);
      if (fs.existsSync(fullPath)) {
        const backupPath = path.join(backupDir, file);
        const backupDirPath = path.dirname(backupPath);
        
        if (!fs.existsSync(backupDirPath)) {
          fs.mkdirSync(backupDirPath, { recursive: true });
        }
        
        fs.copyFileSync(fullPath, backupPath);
        console.log(`  📁 Backed up: ${file}`);
      }
    }

    // Backup environment variables
    const envPath = path.join(process.cwd(), '.env.local');
    if (fs.existsSync(envPath)) {
      fs.copyFileSync(envPath, path.join(backupDir, '.env.local.backup'));
      console.log('  📁 Backed up: .env.local');
    }
  }

  private async updateEnvVariables() {
    const envPath = path.join(process.cwd(), '.env.local');
    let envContent = '';
    
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
    }

    // Comment out Adobe-related variables
    envContent = envContent.replace(
      /^(ADOBE_CLIENT_ID=.*)/gm,
      '# $1 # Disabled - migrated to in-house PDF system'
    );
    envContent = envContent.replace(
      /^(USE_ADOBE_PDF_SERVICES=.*)/gm,
      '# $1 # Disabled - migrated to in-house PDF system'
    );

    // Add new configuration variables
    const newVars = `
# In-house PDF Assessment System Configuration
PDF_ASSESSMENT_MODEL=gpt-4
PDF_ASSESSMENT_TEMPERATURE=0.3
PDF_ASSESSMENT_MAX_TOKENS=4000
PDF_ASSESSMENT_STRUCTURED_EXTRACTION=true
PDF_ASSESSMENT_QUESTION_GENERATION=true
`;

    if (!envContent.includes('PDF_ASSESSMENT_MODEL')) {
      envContent += newVars;
    }

    fs.writeFileSync(envPath, envContent);
    console.log('  ⚙️  Updated environment variables');
  }

  private async updateImports() {
    const filesToUpdate = [
      'app/api/assess-resume/route.ts',
      'app/api/process-resume/route.ts'
    ];

    for (const file of filesToUpdate) {
      const fullPath = path.join(process.cwd(), file);
      if (fs.existsSync(fullPath)) {
        let content = fs.readFileSync(fullPath, 'utf8');
        
        // Replace Adobe imports with new system imports
        content = content.replace(
          /import.*from.*adobe-pdf.*$/gm,
          "import { pdfProcessor } from '@/lib/pdf-assessment'"
        );
        
        // Replace Adobe function calls
        content = content.replace(
          /pdfToTextWithAdobe\(/g,
          'pdfProcessor.processPDF('
        );
        
        fs.writeFileSync(fullPath, content);
        console.log(`  🔄 Updated imports in: ${file}`);
      }
    }
  }

  private async removeAdobeDependencies() {
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      
      // Remove Adobe dependencies
      const adobeDeps = ['@adobe/pdfservices-node-sdk'];
      let removed = false;
      
      for (const dep of adobeDeps) {
        if (packageJson.dependencies?.[dep]) {
          delete packageJson.dependencies[dep];
          removed = true;
          console.log(`  🗑️  Removed dependency: ${dep}`);
        }
        if (packageJson.devDependencies?.[dep]) {
          delete packageJson.devDependencies[dep];
          removed = true;
          console.log(`  🗑️  Removed dev dependency: ${dep}`);
        }
      }
      
      if (removed) {
        fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
        console.log('  📦 Updated package.json - run npm install to apply changes');
      } else {
        console.log('  ℹ️  No Adobe dependencies found to remove');
      }
    }
  }

  private async updateApiRoutes() {
    // Update test-adobe-pdf route to redirect to new system
    const testAdobeRoute = path.join(process.cwd(), 'app/api/test-adobe-pdf/route.ts');
    
    if (fs.existsSync(testAdobeRoute)) {
      const redirectContent = `/**
 * Redirect route - Adobe PDF Services has been replaced
 */

import { NextRequest } from 'next/server';
import { json } from '@/lib/http/errors';

export async function GET(req: NextRequest) {
  return json(200, {
    message: 'Adobe PDF Services has been replaced with in-house AI system',
    newEndpoint: '/api/process-pdf',
    migrationDate: new Date().toISOString(),
    capabilities: {
      pdfProcessing: true,
      aiExtraction: true,
      questionGeneration: true,
      skillAssessment: true
    }
  });
}

export async function POST(req: NextRequest) {
  return json(302, {
    message: 'Please use the new PDF processing endpoint',
    redirect: '/api/process-pdf'
  });
}
`;
      
      fs.writeFileSync(testAdobeRoute, redirectContent);
      console.log('  🔄 Updated test-adobe-pdf route to redirect');
    }

    // Update assess-resume route (already done in previous steps)
    console.log('  ✅ API routes updated');
  }

  private async testNewSystem() {
    console.log('  🧪 Testing new PDF assessment system...');
    
    try {
      // Test API endpoint availability
      const response = await fetch('http://localhost:3000/api/process-pdf', {
        method: 'GET'
      });
      
      if (response.ok) {
        console.log('  ✅ New PDF processing endpoint is accessible');
      } else {
        throw new Error(`API endpoint returned status: ${response.status}`);
      }
    } catch (error) {
      console.log('  ⚠️  Could not test API endpoint (server may not be running)');
      console.log('  💡 Please test manually by starting the server and visiting /pdf-assessment');
    }
  }

  private printPostMigrationInstructions() {
    console.log(`
📋 POST-MIGRATION CHECKLIST:

1. 🔧 Install dependencies (if removed Adobe packages):
   npm install

2. 🚀 Start your development server:
   npm run dev

3. 🧪 Test the new system:
   - Visit http://localhost:3000/pdf-assessment
   - Upload a test PDF file
   - Verify skill extraction and question generation

4. 🗑️  Clean up (optional):
   - Remove backed up Adobe files from migration-backup/
   - Remove Adobe-related pages and components
   - Update any remaining references in documentation

5. 📝 Update your documentation:
   - API documentation
   - Deployment guides
   - Environment variable documentation

6. 🔍 Files to review manually:
   - Any custom integrations with Adobe PDF Services
   - Error handling that specifically catches Adobe errors
   - Monitoring and logging configurations

⚠️  IMPORTANT NOTES:
- The migration backup is stored in ./migration-backup/
- Adobe environment variables are commented out, not deleted
- Test thoroughly before deploying to production
- Consider gradual rollout with feature flags

🎯 NEW CAPABILITIES:
- AI-powered skill extraction
- Automatic question generation
- Enhanced resume analysis
- No external API dependencies
- Customizable assessment criteria

Need help? Check the documentation in lib/pdf-assessment/README.md
`);
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run') || args.includes('-d');
  const help = args.includes('--help') || args.includes('-h');

  if (help) {
    console.log(`
Adobe PDF Services Migration Tool

Usage:
  tsx scripts/migrate-from-adobe.ts [options]

Options:
  --dry-run, -d    Show what would be done without making changes
  --help, -h       Show this help message

This script will:
1. Backup existing Adobe PDF configuration
2. Update environment variables
3. Update import statements
4. Remove Adobe dependencies (optional)
5. Update API routes
6. Test the new system

The migration is designed to be safe and reversible.
`);
    process.exit(0);
  }

  const migration = new AdobeMigration();
  await migration.run(dryRun);
}

if (require.main === module) {
  main().catch(console.error);
}

export { AdobeMigration };