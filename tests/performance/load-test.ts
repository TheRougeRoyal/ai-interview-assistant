/**
 * Load Testing Script
 * Simulates concurrent users and measures system performance
 */

import { performance } from 'perf_hooks';

interface LoadTestConfig {
  concurrentUsers: number;
  requestsPerUser: number;
  rampUpTime: number; // ms
  baseUrl: string;
}

interface LoadTestResult {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  requestsPerSecond: number;
  duration: number;
  errors: Array<{ message: string; count: number }>;
}

/**
 * Simulate a single user session
 */
async function simulateUser(
  userId: number,
  config: LoadTestConfig
): Promise<{ successes: number; failures: number; durations: number[]; errors: string[] }> {
  const durations: number[] = [];
  const errors: string[] = [];
  let successes = 0;
  let failures = 0;

  for (let i = 0; i < config.requestsPerUser; i++) {
    const start = performance.now();

    try {
      // Simulate API request
      const response = await fetch(`${config.baseUrl}/api/candidates?page=${i + 1}&limit=20`);

      const end = performance.now();
      durations.push(end - start);

      if (response.ok) {
        successes++;
      } else {
        failures++;
        errors.push(`HTTP ${response.status}`);
      }
    } catch (error) {
      const end = performance.now();
      durations.push(end - start);
      failures++;
      errors.push(error instanceof Error ? error.message : 'Unknown error');
    }

    // Small delay between requests
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  return { successes, failures, durations, errors };
}

/**
 * Run load test
 */
export async function runLoadTest(config: LoadTestConfig): Promise<LoadTestResult> {
  console.log(`Starting load test with ${config.concurrentUsers} concurrent users...`);
  console.log(`Each user will make ${config.requestsPerUser} requests`);
  console.log(`Total requests: ${config.concurrentUsers * config.requestsPerUser}`);

  const testStart = performance.now();
  const userPromises: Promise<any>[] = [];

  // Ramp up users
  const delayBetweenUsers = config.rampUpTime / config.concurrentUsers;

  for (let i = 0; i < config.concurrentUsers; i++) {
    userPromises.push(simulateUser(i, config));

    if (i < config.concurrentUsers - 1) {
      await new Promise((resolve) => setTimeout(resolve, delayBetweenUsers));
    }
  }

  // Wait for all users to complete
  const results = await Promise.all(userPromises);
  const testEnd = performance.now();

  // Aggregate results
  let totalSuccesses = 0;
  let totalFailures = 0;
  const allDurations: number[] = [];
  const errorCounts = new Map<string, number>();

  for (const result of results) {
    totalSuccesses += result.successes;
    totalFailures += result.failures;
    allDurations.push(...result.durations);

    for (const error of result.errors) {
      errorCounts.set(error, (errorCounts.get(error) || 0) + 1);
    }
  }

  const duration = testEnd - testStart;
  const averageResponseTime =
    allDurations.reduce((a, b) => a + b, 0) / allDurations.length;
  const minResponseTime = Math.min(...allDurations);
  const maxResponseTime = Math.max(...allDurations);

  const result: LoadTestResult = {
    totalRequests: totalSuccesses + totalFailures,
    successfulRequests: totalSuccesses,
    failedRequests: totalFailures,
    averageResponseTime,
    minResponseTime,
    maxResponseTime,
    requestsPerSecond: (totalSuccesses + totalFailures) / (duration / 1000),
    duration,
    errors: Array.from(errorCounts.entries()).map(([message, count]) => ({
      message,
      count,
    })),
  };

  return result;
}

/**
 * Print load test results
 */
export function printLoadTestResults(result: LoadTestResult): void {
  console.log('\n=== Load Test Results ===');
  console.log(`Total Duration: ${(result.duration / 1000).toFixed(2)}s`);
  console.log(`Total Requests: ${result.totalRequests}`);
  console.log(`Successful: ${result.successfulRequests} (${((result.successfulRequests / result.totalRequests) * 100).toFixed(2)}%)`);
  console.log(`Failed: ${result.failedRequests} (${((result.failedRequests / result.totalRequests) * 100).toFixed(2)}%)`);
  console.log(`\nResponse Times:`);
  console.log(`  Average: ${result.averageResponseTime.toFixed(2)}ms`);
  console.log(`  Min: ${result.minResponseTime.toFixed(2)}ms`);
  console.log(`  Max: ${result.maxResponseTime.toFixed(2)}ms`);
  console.log(`\nThroughput: ${result.requestsPerSecond.toFixed(2)} requests/second`);

  if (result.errors.length > 0) {
    console.log(`\nErrors:`);
    result.errors.forEach(({ message, count }) => {
      console.log(`  ${message}: ${count}`);
    });
  }
  console.log('========================\n');
}

/**
 * Run predefined load test scenarios
 */
export async function runLoadTestScenarios(baseUrl: string): Promise<void> {
  // Scenario 1: Light load
  console.log('\n--- Scenario 1: Light Load ---');
  const lightLoad = await runLoadTest({
    concurrentUsers: 5,
    requestsPerUser: 10,
    rampUpTime: 1000,
    baseUrl,
  });
  printLoadTestResults(lightLoad);

  // Scenario 2: Medium load
  console.log('\n--- Scenario 2: Medium Load ---');
  const mediumLoad = await runLoadTest({
    concurrentUsers: 20,
    requestsPerUser: 20,
    rampUpTime: 5000,
    baseUrl,
  });
  printLoadTestResults(mediumLoad);

  // Scenario 3: Heavy load
  console.log('\n--- Scenario 3: Heavy Load ---');
  const heavyLoad = await runLoadTest({
    concurrentUsers: 50,
    requestsPerUser: 30,
    rampUpTime: 10000,
    baseUrl,
  });
  printLoadTestResults(heavyLoad);

  // Scenario 4: Spike test
  console.log('\n--- Scenario 4: Spike Test ---');
  const spikeTest = await runLoadTest({
    concurrentUsers: 100,
    requestsPerUser: 5,
    rampUpTime: 1000, // Quick ramp up
    baseUrl,
  });
  printLoadTestResults(spikeTest);
}

// Run if executed directly
if (require.main === module) {
  const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
  runLoadTestScenarios(baseUrl).catch(console.error);
}
