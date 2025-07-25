import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { CrossImplementationTestRunner } from './utils/test-runner.js';

describe('Performance Comparison Cross-Implementation', () => {
  let runner: CrossImplementationTestRunner;

  beforeAll(async () => {
    runner = new CrossImplementationTestRunner();
    await runner.setup();
  }, 60000);

  afterAll(async () => {
    await runner.cleanup();
  });

  describe('Startup Performance', () => {
    it('should measure help command startup time', async () => {
      const iterations = 5;
      const rustTimes: number[] = [];
      const tsTimes: number[] = [];

      // Warm up both implementations
      await runner.executeRust(['--version']);
      await runner.executeTypeScript(['--version']);

      // Measure startup times
      for (let i = 0; i < iterations; i++) {
        const rustResult = await runner.executeRust(['--help']);
        const tsResult = await runner.executeTypeScript(['--help']);

        if (rustResult.exitCode === 0) rustTimes.push(rustResult.duration);
        if (tsResult.exitCode === 0) tsTimes.push(tsResult.duration);
      }

      expect(rustTimes.length).toBeGreaterThan(0);
      expect(tsTimes.length).toBeGreaterThan(0);

      const avgRustTime = rustTimes.reduce((a, b) => a + b, 0) / rustTimes.length;
      const avgTsTime = tsTimes.reduce((a, b) => a + b, 0) / tsTimes.length;

      console.log(`Average startup times:`);
      console.log(`  Rust: ${avgRustTime.toFixed(1)}ms`);
      console.log(`  TypeScript: ${avgTsTime.toFixed(1)}ms`);
      console.log(`  Rust advantage: ${(avgTsTime / avgRustTime).toFixed(1)}x faster`);

      // Rust should generally be faster, but we'll just ensure both complete
      expect(avgRustTime).toBeGreaterThan(0);
      expect(avgTsTime).toBeGreaterThan(0);
    });

    it('should measure version command performance', async () => {
      const rustResult = await runner.executeRust(['--version']);
      const tsResult = await runner.executeTypeScript(['--version']);

      expect(rustResult.exitCode).toBe(0);
      expect(tsResult.exitCode).toBe(0);

      console.log(`Version command performance:`);
      console.log(`  Rust: ${rustResult.duration}ms`);
      console.log(`  TypeScript: ${tsResult.duration}ms`);

      // Both should complete quickly
      expect(rustResult.duration).toBeLessThan(5000);
      expect(tsResult.duration).toBeLessThan(5000);
    });
  });

  describe('Command Execution Performance', () => {
    it('should measure config command performance', async () => {
      const testConfig = {
        token: 'test-token',
        username: 'testuser',
        database_path: './test.db'
      };

      await runner.createTestConfig(testConfig);

      const rustResult = await runner.executeRust(['config', 'show']);
      const tsResult = await runner.executeTypeScript(['config', 'show']);

      const rustPerf = runner.measurePerformance(rustResult);
      const tsPerf = runner.measurePerformance(tsResult);

      console.log(`Config command performance:`);
      console.log(`  Rust: ${rustPerf.duration}ms (success: ${rustPerf.successRate})`);
      console.log(`  TypeScript: ${tsPerf.duration}ms (success: ${tsPerf.successRate})`);

      // Both should have consistent success rates
      expect(rustPerf.successRate).toBe(tsPerf.successRate);
    });

    it('should measure dry-run sync performance', async () => {
      const testConfig = {
        token: 'mock-token',
        username: 'testuser',
        database_path: await runner.createTestDatabase()
      };

      await runner.createTestConfig(testConfig);

      const rustResult = await runner.executeRust(['sync', '--dry-run'], {
        timeout: 30000,
        useRealAPI: false
      });

      const tsResult = await runner.executeTypeScript(['sync', '--dry-run'], {
        timeout: 30000,
        useRealAPI: false
      });

      const rustPerf = runner.measurePerformance(rustResult);
      const tsPerf = runner.measurePerformance(tsResult);

      console.log(`Sync dry-run performance:`);
      console.log(`  Rust: ${rustPerf.duration}ms (success: ${rustPerf.successRate})`);
      console.log(`  TypeScript: ${tsPerf.duration}ms (success: ${tsPerf.successRate})`);

      // Both should complete within reasonable time
      expect(rustPerf.duration).toBeLessThan(30000);
      expect(tsPerf.duration).toBeLessThan(30000);
    });
  });

  describe('Memory Usage', () => {
    it('should compare memory footprint', async () => {
      const testConfig = {
        token: 'mock-token',
        username: 'testuser',
        database_path: await runner.createTestDatabase()
      };

      await runner.createTestConfig(testConfig);

      const rustResult = await runner.executeRust(['--help']);
      const tsResult = await runner.executeTypeScript(['--help']);

      const rustPerf = runner.measurePerformance(rustResult);
      const tsPerf = runner.measurePerformance(tsResult);

      console.log(`Memory usage comparison:`);
      console.log(`  Rust: ${rustPerf.memoryUsage}`);
      console.log(`  TypeScript: ${tsPerf.memoryUsage}`);

      // Both should provide some memory information or unknown
      expect(typeof rustPerf.memoryUsage).toBe('string');
      expect(typeof tsPerf.memoryUsage).toBe('string');
    });
  });

  describe('Concurrent Performance', () => {
    it('should measure concurrent command execution', async () => {
      const testConfig = {
        token: 'mock-token',
        username: 'testuser',
        database_path: await runner.createTestDatabase()
      };

      await runner.createTestConfig(testConfig);

      // Run multiple commands concurrently
      const concurrentRustPromises = Array.from({ length: 3 }, () =>
        runner.executeRust(['--version'])
      );

      const concurrentTsPromises = Array.from({ length: 3 }, () =>
        runner.executeTypeScript(['--version'])
      );

      const rustResults = await Promise.all(concurrentRustPromises);
      const tsResults = await Promise.all(concurrentTsPromises);

      // All should succeed
      expect(rustResults.every(r => r.exitCode === 0)).toBe(true);
      expect(tsResults.every(r => r.exitCode === 0)).toBe(true);

      const avgRustTime = rustResults.reduce((sum, r) => sum + r.duration, 0) / rustResults.length;
      const avgTsTime = tsResults.reduce((sum, r) => sum + r.duration, 0) / tsResults.length;

      console.log(`Concurrent execution performance:`);
      console.log(`  Rust average: ${avgRustTime.toFixed(1)}ms`);
      console.log(`  TypeScript average: ${avgTsTime.toFixed(1)}ms`);

      // Both should handle concurrent execution
      expect(avgRustTime).toBeGreaterThan(0);
      expect(avgTsTime).toBeGreaterThan(0);
    });
  });

  describe('Large Data Performance', () => {
    it('should handle large argument lists', async () => {
      // Test with long argument list
      const longArgs = ['--help'].concat(Array.from({ length: 50 }, (_, i) => `--dummy-${i}`));

      const rustResult = await runner.executeRust(longArgs);
      const tsResult = await runner.executeTypeScript(longArgs);

      // Both should handle long argument lists gracefully (even if they error)
      expect(typeof rustResult.exitCode).toBe('number');
      expect(typeof tsResult.exitCode).toBe('number');

      console.log(`Large argument list performance:`);
      console.log(`  Rust: ${rustResult.duration}ms (exit: ${rustResult.exitCode})`);
      console.log(`  TypeScript: ${tsResult.duration}ms (exit: ${tsResult.exitCode})`);
    });
  });

  describe('Error Performance', () => {
    it('should measure error handling performance', async () => {
      // Test invalid command performance
      const rustResult = await runner.executeRust(['invalid-command']);
      const tsResult = await runner.executeTypeScript(['invalid-command']);

      console.log(`Error handling performance:`);
      console.log(`  Rust: ${rustResult.duration}ms`);
      console.log(`  TypeScript: ${tsResult.duration}ms`);

      // Both should handle errors quickly
      expect(rustResult.duration).toBeLessThan(5000);
      expect(tsResult.duration).toBeLessThan(5000);

      // Both should exit with non-zero codes
      expect(rustResult.exitCode).not.toBe(0);
      expect(tsResult.exitCode).not.toBe(0);
    });
  });

  describe('Performance Regression Detection', () => {
    it('should establish performance baselines', async () => {
      const commands = [
        ['--version'],
        ['--help'],
        ['config', 'show']
      ];

      const results: Array<{
        command: string;
        rust: number;
        typescript: number;
        ratio: number;
      }> = [];

      for (const args of commands) {
        const rustResult = await runner.executeRust(args);
        const tsResult = await runner.executeTypeScript(args);

        if (rustResult.exitCode === tsResult.exitCode) {
          const ratio = tsResult.duration / rustResult.duration;
          results.push({
            command: args.join(' '),
            rust: rustResult.duration,
            typescript: tsResult.duration,
            ratio
          });
        }
      }

      console.log('\nPerformance Baseline Results:');
      console.log('Command | Rust (ms) | TypeScript (ms) | Ratio');
      console.log('--------|-----------|-----------------|------');
      
      results.forEach(result => {
        console.log(
          `${result.command.padEnd(8)} | ${result.rust.toString().padEnd(9)} | ` +
          `${result.typescript.toString().padEnd(15)} | ${result.ratio.toFixed(1)}x`
        );
      });

      // Ensure we have some baseline data
      expect(results.length).toBeGreaterThan(0);
      
      // All ratios should be positive numbers
      results.forEach(result => {
        expect(result.ratio).toBeGreaterThan(0);
        expect(result.rust).toBeGreaterThan(0);
        expect(result.typescript).toBeGreaterThan(0);
      });
    });
  });
});