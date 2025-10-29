/**
 * Database Migration Utilities
 * Provides utilities for running and managing database migrations
 */

import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

export interface MigrationInfo {
  name: string;
  appliedAt: Date | null;
  status: 'pending' | 'applied' | 'failed';
}

/**
 * Get all migrations from the migrations directory
 */
export function getMigrations(): string[] {
  const migrationsDir = path.join(process.cwd(), 'prisma', 'migrations');
  
  if (!fs.existsSync(migrationsDir)) {
    return [];
  }
  
  return fs.readdirSync(migrationsDir)
    .filter(file => fs.statSync(path.join(migrationsDir, file)).isDirectory())
    .sort();
}

/**
 * Run pending migrations
 */
export async function runMigrations(prisma: PrismaClient): Promise<void> {
  console.log('Running database migrations...');
  
  try {
    execSync('npx prisma migrate deploy', {
      stdio: 'inherit',
      env: { ...process.env },
    });
    
    console.log('✅ Migrations completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

/**
 * Create a new migration
 */
export function createMigration(name: string): void {
  console.log(`Creating migration: ${name}...`);
  
  try {
    execSync(`npx prisma migrate dev --name ${name}`, {
      stdio: 'inherit',
      env: { ...process.env },
    });
    
    console.log('✅ Migration created successfully');
  } catch (error) {
    console.error('❌ Failed to create migration:', error);
    throw error;
  }
}

/**
 * Reset database (WARNING: This will delete all data)
 */
export async function resetDatabase(): Promise<void> {
  console.log('⚠️  Resetting database (this will delete all data)...');
  
  try {
    execSync('npx prisma migrate reset --force', {
      stdio: 'inherit',
      env: { ...process.env },
    });
    
    console.log('✅ Database reset successfully');
  } catch (error) {
    console.error('❌ Database reset failed:', error);
    throw error;
  }
}

/**
 * Rollback last migration (manual process)
 */
export async function rollbackLastMigration(prisma: PrismaClient): Promise<void> {
  console.log('⚠️  Rolling back last migration...');
  
  const migrations = getMigrations();
  if (migrations.length === 0) {
    console.log('No migrations to rollback');
    return;
  }
  
  const lastMigration = migrations[migrations.length - 1];
  console.log(`Last migration: ${lastMigration}`);
  console.log('Note: Prisma does not support automatic rollback.');
  console.log('You need to:');
  console.log('1. Manually create a new migration that reverses the changes');
  console.log('2. Or restore from a database backup');
  console.log('3. Or use `npx prisma migrate resolve --rolled-back <migration_name>` if needed');
}

/**
 * Check migration status
 */
export function checkMigrationStatus(): void {
  console.log('Checking migration status...');
  
  try {
    execSync('npx prisma migrate status', {
      stdio: 'inherit',
      env: { ...process.env },
    });
  } catch (error) {
    console.error('❌ Failed to check migration status:', error);
    throw error;
  }
}

/**
 * Generate Prisma Client
 */
export function generatePrismaClient(): void {
  console.log('Generating Prisma Client...');
  
  try {
    execSync('npx prisma generate', {
      stdio: 'inherit',
      env: { ...process.env },
    });
    
    console.log('✅ Prisma Client generated successfully');
  } catch (error) {
    console.error('❌ Failed to generate Prisma Client:', error);
    throw error;
  }
}

/**
 * Validate schema
 */
export function validateSchema(): void {
  console.log('Validating Prisma schema...');
  
  try {
    execSync('npx prisma validate', {
      stdio: 'inherit',
      env: { ...process.env },
    });
    
    console.log('✅ Schema is valid');
  } catch (error) {
    console.error('❌ Schema validation failed:', error);
    throw error;
  }
}

/**
 * Format schema
 */
export function formatSchema(): void {
  console.log('Formatting Prisma schema...');
  
  try {
    execSync('npx prisma format', {
      stdio: 'inherit',
      env: { ...process.env },
    });
    
    console.log('✅ Schema formatted successfully');
  } catch (error) {
    console.error('❌ Failed to format schema:', error);
    throw error;
  }
}

/**
 * Create a database backup (PostgreSQL)
 */
export function createDatabaseBackup(outputPath?: string): void {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    throw new Error('DATABASE_URL not set');
  }
  
  // Only works for PostgreSQL
  if (!dbUrl.startsWith('postgresql://') && !dbUrl.startsWith('postgres://')) {
    console.log('Database backups are only supported for PostgreSQL');
    return;
  }
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFile = outputPath || `backup-${timestamp}.sql`;
  
  console.log(`Creating database backup: ${backupFile}...`);
  
  try {
    execSync(`pg_dump ${dbUrl} > ${backupFile}`, {
      stdio: 'inherit',
    });
    
    console.log(`✅ Backup created: ${backupFile}`);
  } catch (error) {
    console.error('❌ Backup failed:', error);
    throw error;
  }
}

/**
 * Restore from backup (PostgreSQL)
 */
export function restoreFromBackup(backupPath: string): void {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    throw new Error('DATABASE_URL not set');
  }
  
  if (!fs.existsSync(backupPath)) {
    throw new Error(`Backup file not found: ${backupPath}`);
  }
  
  console.log(`⚠️  Restoring from backup: ${backupPath}...`);
  
  try {
    execSync(`psql ${dbUrl} < ${backupPath}`, {
      stdio: 'inherit',
    });
    
    console.log('✅ Database restored successfully');
  } catch (error) {
    console.error('❌ Restore failed:', error);
    throw error;
  }
}
