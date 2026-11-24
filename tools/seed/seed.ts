#!/usr/bin/env -S tsx
/**
 * Seed utility for FitPod test data
 * Creates test body measurements in the user's Pod for testing purposes
 * 
 * Usage:
 *   tsx tools/seed/seed.ts --count=10                  # Create 10 normal measurements
 *   tsx tools/seed/seed.ts --count=10 --profile=edge   # Create edge case measurements
 *   tsx tools/seed/seed.ts --clear                     # Clear all test data
 * 
 * Test measurements are stored under fitpod/test/yyyy/mm/<id>.ttl
 */

import type { BodyMeasurement } from '../../apps/web/src/domain/body/entities';
import { loginWithClientCredentials, loadCredentialsFromEnv } from '../auth/solid-auth.js';
import { createPodHttp } from '../../apps/web/src/infrastructure/http/pod-http';
import { createSolidIo } from '../../apps/web/src/data/solid/solid-io';
import { createLogger } from '../../apps/web/src/infrastructure/logging/console-logger';
import { createIdGenerator } from '../../apps/web/src/infrastructure/id-gen/uuid-generator';
import { createBodyRepository } from '../../apps/web/src/data/repositories/body/body-repository';

const FP = 'https://w3id.org/fitpod/ns#';

interface SeedConfig {
  count: number;
  profile: 'normal' | 'edge' | 'mixed';
  clear: boolean;
}

const parseArgs = (args: string[]): SeedConfig => {
  const config: SeedConfig = {
    count: 10,
    profile: 'normal',
    clear: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--count' && args[i + 1] !== undefined) {
      config.count = parseInt(args[i + 1]!, 10);
      i++;
    } else if (arg === '--profile' && args[i + 1] !== undefined) {
      const profile = args[i + 1];
      if (profile === 'normal' || profile === 'edge' || profile === 'mixed') {
        config.profile = profile;
      } else {
        console.error(`Invalid profile: ${profile}. Use: normal, edge, mixed`);
        process.exit(1);
      }
      i++;
    } else if (arg === '--clear') {
      config.clear = true;
    }
  }

  return config;
};

/**
 * Generate a test measurement
 */
const generateMeasurement = (profile: 'normal' | 'edge' | 'mixed', index: number): BodyMeasurement => {
  const now = new Date();
  // Generate dates in the past 12 months
  const date = new Date();
  date.setMonth(now.getMonth() - Math.floor(Math.random() * 12));
  const dateStr = date.toISOString().split('T')[0] ?? new Date().toISOString().slice(0, 10);

  if (profile === 'edge') {
    // Edge case: minimum values
    return {
      id: `test-${index}-${Date.now()}`,
      date: dateStr,
      weightKg: 20,
      heightCm: 50,
      bodyFatPct: 0,
      bodyFatMethod: 'estimate',
      note: `Edge case measurement ${index}`,
      schemaVersion: 1,
    };
  }

  // Normal case
  const weightKg = 50 + Math.floor(Math.random() * 150);
  const heightCm = 150 + Math.floor(Math.random() * 60);

  return {
    id: `test-${index}-${Date.now()}`,
    date: dateStr,
    weightKg,
    heightCm,
    bodyFatPct: profile === 'mixed' && Math.random() > 0.5 ? undefined : Math.floor(Math.random() * 40),
    bodyFatMethod: (['bia', 'caliper', 'dexa', 'estimate'] as const)[Math.floor(Math.random() * 4)],
    note: `Test measurement ${index} for FitPod testing`,
    schemaVersion: 1,
  };
};

/**
 * Clear all test measurements
 */
const clearTestMeasurements = async (repo: any): Promise<void> => {
  console.log('Clearing test measurements...');

  // Get current date
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  // Check last 12 months for test containers
  for (let i = 0; i < 12; i++) {
    const month = currentMonth - i;
    const year = currentYear - Math.floor((i - currentMonth) / 12);
    
    if (year < 2024) continue; // Skip too old months

    const yearStr = String(year);
    const monthStr = String(month + 1).padStart(2, '0');
    const containerUrl = `fitpod/test/${yearStr}/${monthStr}/`;

    try {
      const listResult = await repo['_solidIo'].listContainer(`${repo['_storageRoot']}${containerUrl}`);
      
      if (listResult.ok) {
        for (const url of listResult.value) {
          await repo['_solidIo'].deleteResource(url);
          console.log(`  Deleted: ${url}`);
        }
      }
    } catch (error) {
      // Container might not exist, which is fine
      console.log(`  No test container for ${yearStr}/${monthStr}`);
    }
  }

  console.log('Test measurements cleared');
};

/**
 * Main function
 */
const main = async (): Promise<void> => {
  const args = process.argv.slice(2);
  const config = parseArgs(args);

  console.log('=== FitPod Seed Utility ===');
  console.log(`Config: count=${config.count}, profile=${config.profile}, clear=${config.clear}`);

  // Load credentials and authenticate
  const credentials = loadCredentialsFromEnv();
  console.log(`OIDC Issuer: ${credentials.oidcIssuer}`);
  
  console.log('Logging in...');
  const session = await loginWithClientCredentials(credentials);
  
  const webId = session.info.webId;
  if (!webId) {
    console.error('Authentication failed - no WebID');
    process.exit(1);
  }

  // Create repository
  const logger = createLogger('info');
  const idGenerator = createIdGenerator();
  const podHttp = createPodHttp({
    authedFetch: session.fetch,
    concurrencyLimit: 6,
    timeout: 5000,
    retryEnabled: false, // Disable retry during seeding
  });
  const solidIo = createSolidIo(podHttp);

  const repo = createBodyRepository({
    solidIo,
    storageRoot: '', // Will be discovered
  });
  repo.setWebId(webId);
  await repo.ensureStorageRoot();

  console.log(`Storage Root: ${repo.getStorageRoot()}`);

  if (config.clear) {
    await clearTestMeasurements(repo);
    return;
  }

  // Seed test measurements
  console.log(`\nSeeding ${config.count} test measurements...`);

  for (let i = 0; i < config.count; i++) {
    const profile = config.profile === 'mixed' 
      ? (Math.random() > 0.5 ? 'normal' : 'edge')
      : config.profile;

    const measurement = generateMeasurement(profile, i);
    const result = await repo.add(measurement);

    if (result.ok) {
      console.log(`  [OK] ${i + 1}/${config.count}: ${measurement.id} (${measurement.weightKg}kg, ${measurement.heightCm}cm)`);
    } else {
      console.log(`  [FAIL] ${i + 1}/${config.count}: ${result.error.message}`);
    }
  }

  console.log('\n=== Seeding Complete ===');
  console.log(`Created ${config.count} test measurements`);
  console.log('\nTo clear test data, run:');
  console.log('  tsx tools/seed/seed.ts --clear');
};

main().catch((error) => {
  console.error('Error:', error instanceof Error ? error.message : String(error));
  process.exit(1);
});
