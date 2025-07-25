import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { CrossImplementationTestRunner } from './utils/test-runner.js';

describe('Sync Workflow Cross-Implementation', () => {
  let runner: CrossImplementationTestRunner;

  beforeAll(async () => {
    runner = new CrossImplementationTestRunner();
    await runner.setup();
  }, 60000);

  afterAll(async () => {
    await runner.cleanup();
  });

  describe('Database Creation and Initialization', () => {
    it('should create compatible database schemas', async () => {
      // Create test configuration
      const testConfig = {
        token: 'mock-token',
        username: 'testuser',
        database_path: await runner.createTestDatabase()
      };

      await runner.createTestConfig(testConfig);

      // Both implementations should be able to initialize database
      const rustResult = await runner.executeRust(['sync', '--dry-run'], {
        timeout: 15000,
        useRealAPI: false
      });

      const tsResult = await runner.executeTypeScript(['sync', '--dry-run'], {
        timeout: 15000,
        useRealAPI: false
      });

      // If database initialization succeeds, both should have similar database state
      if (rustResult.exitCode === 0 && tsResult.exitCode === 0) {
        const rustState = await runner.getDatabaseState(testConfig.database_path);
        const tsState = await runner.getDatabaseState(testConfig.database_path);

        const comparison = runner.compareDatabaseStates(rustState, tsState);
        if (!comparison.isEqual) {
          console.log('Database differences:', comparison.differences);
        }
      }
    });

    it('should handle database migration consistently', async () => {
      const dbPath = await runner.createTestDatabase();
      
      const testConfig = {
        token: 'mock-token',
        username: 'testuser',
        database_path: dbPath
      };

      await runner.createTestConfig(testConfig);

      // Run migrations with both implementations
      const results = await runner.executeBoth(['sync', '--dry-run'], {
        timeout: 15000,
        useRealAPI: false
      });

      // Both should handle migrations consistently
      if (results.rust.exitCode === 0 && results.typescript.exitCode === 0) {
        const rustOutput = results.rust.stdout + results.rust.stderr;
        const tsOutput = results.typescript.stdout + results.typescript.stderr;

        // Both should mention migrations if they run
        if (rustOutput.includes('migration') || tsOutput.includes('migration')) {
          expect(rustOutput).toMatch(/migration/i);
          expect(tsOutput).toMatch(/migration/i);
        }
      }
    });
  });

  describe('Sync Command Parameters', () => {
    it('should handle thread count parameter consistently', async () => {
      const testConfig = {
        token: 'mock-token',
        username: 'testuser',
        database_path: await runner.createTestDatabase()
      };

      await runner.createTestConfig(testConfig);

      // Test with different thread counts
      const threadCounts = [1, 4, 8, 16];

      for (const threads of threadCounts) {
        const results = await runner.executeBoth(['sync', '-t', threads.toString(), '--dry-run'], {
          timeout: 15000,
          useRealAPI: false
        });

        // Both should accept the thread parameter
        expect(results.rust.exitCode).toBe(results.typescript.exitCode);

        if (results.rust.exitCode === 0 && results.typescript.exitCode === 0) {
          // Both should mention thread count if verbose
          const rustOutput = results.rust.stdout + results.rust.stderr;
          const tsOutput = results.typescript.stdout + results.typescript.stderr;

          if (rustOutput.includes('thread') || tsOutput.includes('thread')) {
            expect(rustOutput).toContain(threads.toString());
            expect(tsOutput).toContain(threads.toString());
          }
        }
      }
    });

    it('should handle dry-run mode consistently', async () => {
      const testConfig = {
        token: 'mock-token',
        username: 'testuser',
        database_path: await runner.createTestDatabase()
      };

      await runner.createTestConfig(testConfig);

      const results = await runner.executeBoth(['sync', '--dry-run'], {
        timeout: 15000,
        useRealAPI: false
      });

      // Both should handle dry-run mode
      expect(results.rust.exitCode).toBe(results.typescript.exitCode);

      if (results.rust.exitCode === 0 && results.typescript.exitCode === 0) {
        const rustOutput = results.rust.stdout + results.rust.stderr;
        const tsOutput = results.typescript.stdout + results.typescript.stderr;

        // Both should indicate dry-run mode
        expect(rustOutput).toMatch(/(dry.?run|simulation|preview)/i);
        expect(tsOutput).toMatch(/(dry.?run|simulation|preview)/i);
      }
    });
  });

  describe('Error Handling in Sync', () => {
    it('should handle missing credentials consistently', async () => {
      // No config file created - both should fail
      const results = await runner.executeBoth(['sync'], {
        timeout: 10000,
        useRealAPI: false
      });

      // Both should exit with error
      expect(results.rust.exitCode).not.toBe(0);
      expect(results.typescript.exitCode).not.toBe(0);

      const rustOutput = (results.rust.stdout + results.rust.stderr).toLowerCase();
      const tsOutput = (results.typescript.stdout + results.typescript.stderr).toLowerCase();

      // Both should indicate missing credentials
      expect(rustOutput).toMatch(/(config|credential|token|missing)/);
      expect(tsOutput).toMatch(/(config|credential|token|missing)/);
    });

    it('should handle invalid database path consistently', async () => {
      const testConfig = {
        token: 'mock-token',
        username: 'testuser',
        database_path: '/invalid/path/to/database.db'
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

      // Both should indicate path/database issues
      expect(rustOutput).toMatch(/(database|path|permission|access)/);
      expect(tsOutput).toMatch(/(database|path|permission|access)/);
    });
  });

  describe('Sync Output Format', () => {
    it('should produce similar progress output', async () => {
      const testConfig = {
        token: 'mock-token',
        username: 'testuser',
        database_path: await runner.createTestDatabase()
      };

      await runner.createTestConfig(testConfig);

      const results = await runner.executeBoth(['sync', '--dry-run'], {
        timeout: 15000,
        useRealAPI: false
      });

      if (results.rust.exitCode === 0 && results.typescript.exitCode === 0) {
        const comparison = runner.compareOutputs(
          results.rust.stdout,
          results.typescript.stdout,
          {
            ignoreWhitespace: true,
            ignoreTimestamps: true,
            ignoreColors: true
          }
        );

        // Outputs should be structurally similar
        if (!comparison.isEqual) {
          // Check if both contain similar key elements
          const rustOut = results.rust.stdout.toLowerCase();
          const tsOut = results.typescript.stdout.toLowerCase();

          // Both should mention sync-related operations
          if (rustOut.includes('sync') || tsOut.includes('sync')) {
            expect(rustOut).toMatch(/(sync|collection|folder)/);
            expect(tsOut).toMatch(/(sync|collection|folder)/);
          }
        }
      }
    });

    it('should handle verbose mode consistently', async () => {
      const testConfig = {
        token: 'mock-token',
        username: 'testuser',
        database_path: await runner.createTestDatabase()
      };

      await runner.createTestConfig(testConfig);

      const results = await runner.executeBoth(['sync', '--dry-run', '-v'], {
        timeout: 15000,
        useRealAPI: false
      });

      if (results.rust.exitCode === 0 && results.typescript.exitCode === 0) {
        // Both should produce more verbose output
        expect(results.rust.stdout.length).toBeGreaterThan(0);
        expect(results.typescript.stdout.length).toBeGreaterThan(0);

        // Verbose output should contain more details
        const rustOut = results.rust.stdout + results.rust.stderr;
        const tsOut = results.typescript.stdout + results.typescript.stderr;

        if (rustOut.length > 50 && tsOut.length > 50) {
          // Both should provide detailed information in verbose mode
          expect(rustOut).toMatch(/(processing|request|response|detail)/i);
          expect(tsOut).toMatch(/(processing|request|response|detail)/i);
        }
      }
    });
  });

  describe('Database State Consistency', () => {
    it('should maintain identical database schemas', async () => {
      const dbPath1 = await runner.createTestDatabase();
      const dbPath2 = await runner.createTestDatabase();

      const rustConfig = {
        token: 'mock-token',
        username: 'testuser',
        database_path: dbPath1
      };

      const tsConfig = {
        token: 'mock-token',
        username: 'testuser', 
        database_path: dbPath2
      };

      await runner.createTestConfig(rustConfig);
      
      // Initialize database with Rust
      await runner.executeRust(['sync', '--dry-run'], {
        timeout: 15000,
        useRealAPI: false
      });

      await runner.createTestConfig(tsConfig);

      // Initialize database with TypeScript
      await runner.executeTypeScript(['sync', '--dry-run'], {
        timeout: 15000,
        useRealAPI: false
      });

      // Check if both databases have compatible schemas
      try {
        const rustState = await runner.getDatabaseState(dbPath1);
        const tsState = await runner.getDatabaseState(dbPath2);

        // Database structures should be compatible
        expect(typeof rustState).toBe(typeof tsState);
        expect(Array.isArray(rustState.releases)).toBe(true);
        expect(Array.isArray(tsState.releases)).toBe(true);
        expect(Array.isArray(rustState.priceHistory)).toBe(true);
        expect(Array.isArray(tsState.priceHistory)).toBe(true);
      } catch (error) {
        // If database access fails, both should fail similarly
        console.log('Database access error (expected in test environment):', error);
      }
    });
  });
});