import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { CrossImplementationTestRunner } from './utils/test-runner.js';

describe('Error Handling Cross-Implementation', () => {
  let runner: CrossImplementationTestRunner;

  beforeAll(async () => {
    runner = new CrossImplementationTestRunner();
    await runner.setup();
  }, 60000);

  afterAll(async () => {
    await runner.cleanup();
  });

  describe('Invalid Command Handling', () => {
    it('should handle unknown commands identically', async () => {
      const invalidCommands = [
        ['unknown-command'],
        ['sync', '--invalid-flag'],
        ['config', 'invalid-subcommand'],
        ['value', '--bad-option'],
        ['trends', '--nonexistent']
      ];

      for (const args of invalidCommands) {
        const results = await runner.executeBoth(args);

        // Both should exit with non-zero codes
        expect(results.rust.exitCode).not.toBe(0);
        expect(results.typescript.exitCode).not.toBe(0);

        const rustOutput = (results.rust.stdout + results.rust.stderr).toLowerCase();
        const tsOutput = (results.typescript.stdout + results.typescript.stderr).toLowerCase();

        // Both should indicate the error
        expect(rustOutput).toMatch(/(error|invalid|unknown|unrecognized)/);
        expect(tsOutput).toMatch(/(error|invalid|unknown|unrecognized)/);

        console.log(`Command [${args.join(' ')}]:`);
        console.log(`  Rust exit code: ${results.rust.exitCode}`);
        console.log(`  TypeScript exit code: ${results.typescript.exitCode}`);
      }
    });

    it('should provide helpful error messages', async () => {
      const results = await runner.executeBoth(['nonexistent']);

      // Both should provide help or suggestions
      const rustOutput = results.rust.stdout + results.rust.stderr;
      const tsOutput = results.typescript.stdout + results.typescript.stderr;

      // Both should either show help or suggest valid commands
      expect(rustOutput.length).toBeGreaterThan(10);
      expect(tsOutput.length).toBeGreaterThan(10);

      // Error messages should contain useful information
      expect(rustOutput).toMatch(/(help|usage|command|available)/i);
      expect(tsOutput).toMatch(/(help|usage|command|available)/i);
    });
  });

  describe('File System Error Handling', () => {
    it('should handle missing configuration files', async () => {
      const results = await runner.executeBoth(['config', 'show']);

      // Both should handle missing config gracefully
      expect(results.rust.exitCode).not.toBe(0);
      expect(results.typescript.exitCode).not.toBe(0);

      const rustOutput = (results.rust.stdout + results.rust.stderr).toLowerCase();
      const tsOutput = (results.typescript.stdout + results.typescript.stderr).toLowerCase();

      // Both should indicate config issues
      expect(rustOutput).toMatch(/(config|not found|missing|file)/);
      expect(tsOutput).toMatch(/(config|not found|missing|file)/);
    });

    it('should handle invalid database paths', async () => {
      const testConfig = {
        token: 'test-token',
        username: 'testuser',
        database_path: '/invalid/readonly/path/database.db'
      };

      await runner.createTestConfig(testConfig);

      const results = await runner.executeBoth(['sync', '--dry-run'], {
        timeout: 10000,
        useRealAPI: false
      });

      // Both should handle invalid paths gracefully
      expect(results.rust.exitCode).not.toBe(0);
      expect(results.typescript.exitCode).not.toBe(0);

      const rustOutput = (results.rust.stdout + results.rust.stderr).toLowerCase();
      const tsOutput = (results.typescript.stdout + results.typescript.stderr).toLowerCase();

      // Both should indicate path/permission issues
      expect(rustOutput).toMatch(/(path|database|permission|access|directory)/);
      expect(tsOutput).toMatch(/(path|database|permission|access|directory)/);
    });

    it('should handle corrupted configuration files', async () => {
      // Create a corrupted config file
      const fs = await import('fs/promises');
      const configPath = await runner.createTestConfig({});
      await fs.writeFile(configPath, 'corrupted json content {{{');

      const results = await runner.executeBoth(['config', 'show']);

      // Both should handle corrupted config gracefully
      expect(results.rust.exitCode).not.toBe(0);
      expect(results.typescript.exitCode).not.toBe(0);

      const rustOutput = (results.rust.stdout + results.rust.stderr).toLowerCase();
      const tsOutput = (results.typescript.stdout + results.typescript.stderr).toLowerCase();

      // Both should indicate parsing issues
      expect(rustOutput).toMatch(/(parse|json|invalid|malformed|syntax)/);
      expect(tsOutput).toMatch(/(parse|json|invalid|malformed|syntax)/);
    });
  });

  describe('Network Error Simulation', () => {
    it('should handle connection timeouts consistently', async () => {
      const testConfig = {
        token: 'mock-token',
        username: 'testuser',
        database_path: await runner.createTestDatabase()
      };

      await runner.createTestConfig(testConfig);

      // Both should handle network issues gracefully in dry-run mode
      const results = await runner.executeBoth(['sync', '--dry-run'], {
        timeout: 5000, // Short timeout to simulate timeout issues
        useRealAPI: false
      });

      // Results may vary but both should handle timeouts gracefully
      const rustOutput = (results.rust.stdout + results.rust.stderr).toLowerCase();
      const tsOutput = (results.typescript.stdout + results.typescript.stderr).toLowerCase();

      // If there are network-related errors, both should handle them
      if (rustOutput.includes('timeout') || tsOutput.includes('timeout')) {
        expect(rustOutput).toMatch(/(timeout|connection|network)/);
        expect(tsOutput).toMatch(/(timeout|connection|network)/);
      }
    });
  });

  describe('Input Validation Error Handling', () => {
    it('should validate thread count parameters', async () => {
      const testConfig = {
        token: 'mock-token',
        username: 'testuser',
        database_path: await runner.createTestDatabase()
      };

      await runner.createTestConfig(testConfig);

      const invalidThreadCounts = ['0', '-1', 'abc', '999'];

      for (const threads of invalidThreadCounts) {
        const results = await runner.executeBoth(['sync', '-t', threads, '--dry-run'], {
          timeout: 10000,
          useRealAPI: false
        });

        // Both should validate thread count
        expect(results.rust.exitCode).not.toBe(0);
        expect(results.typescript.exitCode).not.toBe(0);

        const rustOutput = (results.rust.stdout + results.rust.stderr).toLowerCase();
        const tsOutput = (results.typescript.stdout + results.typescript.stderr).toLowerCase();

        // Both should indicate parameter validation issues
        expect(rustOutput).toMatch(/(invalid|thread|parameter|value|range)/);
        expect(tsOutput).toMatch(/(invalid|thread|parameter|value|range)/);

        console.log(`Invalid thread count [${threads}]:`);
        console.log(`  Rust: ${results.rust.exitCode}`);
        console.log(`  TypeScript: ${results.typescript.exitCode}`);
      }
    });

    it('should validate minimum change percentage', async () => {
      const testConfig = {
        token: 'mock-token',
        username: 'testuser',
        database_path: await runner.createTestDatabase()
      };

      await runner.createTestConfig(testConfig);

      const invalidPercentages = ['-10', 'abc', '101', '1000'];

      for (const percentage of invalidPercentages) {
        const results = await runner.executeBoth(['trends', '-m', percentage], {
          timeout: 10000,
          useRealAPI: false
        });

        // Both should validate percentage parameters
        expect(results.rust.exitCode).not.toBe(0);
        expect(results.typescript.exitCode).not.toBe(0);

        const rustOutput = (results.rust.stdout + results.rust.stderr).toLowerCase();
        const tsOutput = (results.typescript.stdout + results.typescript.stderr).toLowerCase();

        // Both should indicate validation issues (or missing database)
        expect(rustOutput).toMatch(/(invalid|percentage|parameter|value|range|database|config)/);
        expect(tsOutput).toMatch(/(invalid|percentage|parameter|value|range|database|config)/);
      }
    });
  });

  describe('Graceful Degradation', () => {
    it('should handle partial service failures', async () => {
      const testConfig = {
        token: 'mock-token',
        username: 'testuser',
        database_path: await runner.createTestDatabase()
      };

      await runner.createTestConfig(testConfig);

      // Both should handle service unavailability gracefully
      const results = await runner.executeBoth(['sync', '--dry-run'], {
        timeout: 15000,
        useRealAPI: false
      });

      // Check how both handle mock API scenarios
      const rustOutput = results.rust.stdout + results.rust.stderr;
      const tsOutput = results.typescript.stdout + results.typescript.stderr;

      // Both should provide meaningful feedback
      expect(rustOutput.length).toBeGreaterThan(0);
      expect(tsOutput.length).toBeGreaterThan(0);

      console.log(`Rust output length: ${rustOutput.length}`);
      console.log(`TypeScript output length: ${tsOutput.length}`);
    });

    it('should handle missing dependencies gracefully', async () => {
      // Test commands that might have missing dependencies
      const results = await runner.executeBoth(['value', '--format', 'json'], {
        timeout: 10000,
        useRealAPI: false
      });

      // Both should handle missing data/config gracefully
      expect(results.rust.exitCode).not.toBe(0);
      expect(results.typescript.exitCode).not.toBe(0);

      const rustOutput = (results.rust.stdout + results.rust.stderr).toLowerCase();
      const tsOutput = (results.typescript.stdout + results.typescript.stderr).toLowerCase();

      // Both should indicate what's missing
      expect(rustOutput).toMatch(/(config|database|missing|not found)/);
      expect(tsOutput).toMatch(/(config|database|missing|not found)/);
    });
  });

  describe('Error Code Consistency', () => {
    it('should use consistent exit codes for similar errors', async () => {
      const errorScenarios = [
        { args: ['nonexistent-command'], description: 'Unknown command' },
        { args: ['config', 'show'], description: 'Missing config' },
        { args: ['sync'], description: 'Missing credentials' },
        { args: ['value'], description: 'Missing database' }
      ];

      for (const scenario of errorScenarios) {
        const results = await runner.executeBoth(scenario.args, {
          timeout: 10000,
          useRealAPI: false
        });

        console.log(`${scenario.description}:`);
        console.log(`  Rust exit code: ${results.rust.exitCode}`);
        console.log(`  TypeScript exit code: ${results.typescript.exitCode}`);

        // Both should exit with non-zero codes
        expect(results.rust.exitCode).not.toBe(0);
        expect(results.typescript.exitCode).not.toBe(0);

        // Exit codes don't need to be identical, but should be consistently non-zero
        expect(results.rust.exitCode).toBeGreaterThan(0);
        expect(results.typescript.exitCode).toBeGreaterThan(0);
      }
    });
  });

  describe('Error Recovery', () => {
    it('should handle subsequent commands after errors', async () => {
      // First, run an invalid command
      const errorResults = await runner.executeBoth(['invalid-command']);

      expect(errorResults.rust.exitCode).not.toBe(0);
      expect(errorResults.typescript.exitCode).not.toBe(0);

      // Then, run a valid command to ensure error recovery
      const validResults = await runner.executeBoth(['--version']);

      expect(validResults.rust.exitCode).toBe(0);
      expect(validResults.typescript.exitCode).toBe(0);

      // Both should recover from previous errors
      expect(validResults.rust.stdout).toMatch(/\d+\.\d+\.\d+/);
      expect(validResults.typescript.stdout).toMatch(/\d+\.\d+\.\d+/);
    });
  });
});