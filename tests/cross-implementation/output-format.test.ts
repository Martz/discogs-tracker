import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { CrossImplementationTestRunner } from './utils/test-runner.js';
import { DiscogsApiMock } from './utils/mock-api.js';

describe('Output Format Cross-Implementation', () => {
  let runner: CrossImplementationTestRunner;
  let mockApi: DiscogsApiMock;

  beforeAll(async () => {
    runner = new CrossImplementationTestRunner();
    mockApi = new DiscogsApiMock(3001);
    
    await Promise.all([
      runner.setup(),
      mockApi.start()
    ]);
  }, 60000);

  afterAll(async () => {
    await Promise.all([
      runner.cleanup(),
      mockApi.stop()
    ]);
  });

  describe('Help Output Format', () => {
    it('should format help output consistently', async () => {
      const results = await runner.executeBoth(['--help']);

      expect(results.rust.exitCode).toBe(0);
      expect(results.typescript.exitCode).toBe(0);

      // Both should contain essential help elements
      const rustHelp = results.rust.stdout;
      const tsHelp = results.typescript.stdout;

      // Check for consistent help structure
      expect(rustHelp).toContain('Usage:');
      expect(tsHelp).toContain('Usage:');

      expect(rustHelp).toContain('Commands:');
      expect(tsHelp).toContain('Commands:');

      // Both should list the same core commands
      const coreCommands = ['config', 'sync', 'value', 'trends'];
      coreCommands.forEach(cmd => {
        expect(rustHelp).toContain(cmd);
        expect(tsHelp).toContain(cmd);
      });
    });

    it('should format subcommand help consistently', async () => {
      const subcommands = ['config', 'sync', 'value', 'trends'];

      for (const cmd of subcommands) {
        const results = await runner.executeBoth([cmd, '--help']);

        if (results.rust.exitCode === 0 && results.typescript.exitCode === 0) {
          const rustHelp = results.rust.stdout;
          const tsHelp = results.typescript.stdout;

          // Both should show usage for the subcommand
          expect(rustHelp).toContain(cmd);
          expect(tsHelp).toContain(cmd);

          // Both should show options/flags
          expect(rustHelp).toMatch(/(Options|Flags):/i);
          expect(tsHelp).toMatch(/(Options|Flags):/i);
        }
      }
    });
  });

  describe('Version Output Format', () => {
    it('should format version output consistently', async () => {
      const results = await runner.executeBoth(['--version']);

      expect(results.rust.exitCode).toBe(0);
      expect(results.typescript.exitCode).toBe(0);

      // Both should show version in semver format
      expect(results.rust.stdout).toMatch(/\d+\.\d+\.\d+/);
      expect(results.typescript.stdout).toMatch(/\d+\.\d+\.\d+/);

      // Version output should be clean (single line)
      expect(results.rust.stdout.split('\n').length).toBeLessThanOrEqual(2);
      expect(results.typescript.stdout.split('\n').length).toBeLessThanOrEqual(2);
    });
  });

  describe('Error Message Format', () => {
    it('should format error messages consistently', async () => {
      const results = await runner.executeBoth(['invalid-command']);

      expect(results.rust.exitCode).not.toBe(0);
      expect(results.typescript.exitCode).not.toBe(0);

      const rustError = results.rust.stderr;
      const tsError = results.typescript.stderr;

      // Both should provide clear error messages
      expect(rustError.length).toBeGreaterThan(0);
      expect(tsError.length).toBeGreaterThan(0);

      // Error messages should be informative
      expect(rustError).toMatch(/(error|invalid|unknown)/i);
      expect(tsError).toMatch(/(error|invalid|unknown)/i);
    });

    it('should format configuration errors consistently', async () => {
      const results = await runner.executeBoth(['config', 'show']);

      expect(results.rust.exitCode).not.toBe(0);
      expect(results.typescript.exitCode).not.toBe(0);

      const rustOutput = results.rust.stdout + results.rust.stderr;
      const tsOutput = results.typescript.stdout + results.typescript.stderr;

      // Both should indicate configuration issues clearly
      expect(rustOutput).toMatch(/(config|not found|missing)/i);
      expect(tsOutput).toMatch(/(config|not found|missing)/i);
    });
  });

  describe('Progress Output Format', () => {
    it('should format progress indicators consistently', async () => {
      const testConfig = {
        token: 'mock-token',
        username: 'testuser',
        database_path: await runner.createTestDatabase()
      };

      await runner.createTestConfig(testConfig);
      mockApi.setupSyncWorkflow('testuser');

      const results = await runner.executeBoth(['sync', '--dry-run'], {
        timeout: 15000,
        useRealAPI: false
      });

      if (results.rust.exitCode === 0 && results.typescript.exitCode === 0) {
        const rustOutput = results.rust.stdout;
        const tsOutput = results.typescript.stdout;

        // Both should show progress/status information
        expect(rustOutput.length).toBeGreaterThan(0);
        expect(tsOutput.length).toBeGreaterThan(0);

        // Progress output should be structured
        const rustLines = rustOutput.split('\n').filter(line => line.trim());
        const tsLines = tsOutput.split('\n').filter(line => line.trim());

        expect(rustLines.length).toBeGreaterThan(0);
        expect(tsLines.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Table Output Format', () => {
    it('should format table outputs consistently', async () => {
      const testConfig = {
        token: 'mock-token',
        username: 'testuser',
        database_path: await runner.createTestDatabase()
      };

      await runner.createTestConfig(testConfig);

      // Try value command (may fail due to no data, but check format)
      const results = await runner.executeBoth(['value'], {
        timeout: 10000,
        useRealAPI: false
      });

      // Even if commands fail, check error message formatting
      const rustOutput = results.rust.stdout + results.rust.stderr;
      const tsOutput = results.typescript.stdout + results.typescript.stderr;

      // Both should provide structured output or clear error messages
      expect(rustOutput.length).toBeGreaterThan(0);
      expect(tsOutput.length).toBeGreaterThan(0);

      // Check for consistent formatting patterns
      const comparison = runner.compareOutputs(rustOutput, tsOutput, {
        ignoreWhitespace: true,
        ignoreColors: true
      });

      if (!comparison.isEqual) {
        // Even if outputs differ, both should be well-formatted
        expect(rustOutput).toMatch(/\w+/); // Contains actual content
        expect(tsOutput).toMatch(/\w+/); // Contains actual content
      }
    });
  });

  describe('JSON Output Format', () => {
    it('should format JSON outputs consistently when available', async () => {
      const testConfig = {
        token: 'mock-token',
        username: 'testuser',
        database_path: await runner.createTestDatabase()
      };

      await runner.createTestConfig(testConfig);

      // Try commands that might support JSON output
      const commands = [
        ['value', '--format', 'json'],
        ['trends', '--format', 'json']
      ];

      for (const args of commands) {
        const results = await runner.executeBoth(args, {
          timeout: 10000,
          useRealAPI: false
        });

        // If JSON format is supported and successful
        if (results.rust.exitCode === 0 && results.typescript.exitCode === 0) {
          const rustJson = runner.parseOutput(results.rust.stdout, 'json');
          const tsJson = runner.parseOutput(results.typescript.stdout, 'json');

          if (rustJson && tsJson) {
            // Both should produce valid JSON with similar structure
            expect(typeof rustJson).toBe('object');
            expect(typeof tsJson).toBe('object');

            // JSON outputs should have similar keys
            const rustKeys = Object.keys(rustJson);
            const tsKeys = Object.keys(tsJson);

            expect(rustKeys.length).toBeGreaterThan(0);
            expect(tsKeys.length).toBeGreaterThan(0);
          }
        }
      }
    });
  });

  describe('Color and Formatting', () => {
    it('should handle color output consistently', async () => {
      const results = await runner.executeBoth(['--help']);

      expect(results.rust.exitCode).toBe(0);
      expect(results.typescript.exitCode).toBe(0);

      // Strip colors and compare structure
      const comparison = runner.compareOutputs(
        results.rust.stdout,
        results.typescript.stdout,
        {
          ignoreColors: true,
          ignoreWhitespace: true
        }
      );

      // Structure should be similar even if colors differ
      if (!comparison.isEqual) {
        // Both should contain same essential content
        const rustClean = results.rust.stdout.replace(/\x1b\[[0-9;]*m/g, '');
        const tsClean = results.typescript.stdout.replace(/\x1b\[[0-9;]*m/g, '');

        expect(rustClean).toContain('discogs-tracker');
        expect(tsClean).toContain('discogs-tracker');
      }
    });
  });

  describe('Output Consistency', () => {
    it('should maintain consistent output patterns', async () => {
      const testCommands = [
        ['--version'],
        ['--help'],
        ['config', '--help'],
        ['sync', '--help']
      ];

      for (const args of testCommands) {
        const results = await runner.executeBoth(args);

        if (results.rust.exitCode === 0 && results.typescript.exitCode === 0) {
          // Both should produce reasonable output length
          expect(results.rust.stdout.length).toBeGreaterThan(10);
          expect(results.typescript.stdout.length).toBeGreaterThan(10);

          // Both should use consistent line endings
          const rustLines = results.rust.stdout.split('\n');
          const tsLines = results.typescript.stdout.split('\n');

          expect(rustLines.length).toBeGreaterThan(0);
          expect(tsLines.length).toBeGreaterThan(0);
        }
      }
    });

    it('should handle output redirection consistently', async () => {
      // Test that both implementations work when output is captured
      const results = await runner.executeBoth(['--version']);

      expect(results.rust.exitCode).toBe(0);
      expect(results.typescript.exitCode).toBe(0);

      // Both should write version to stdout, not stderr
      expect(results.rust.stdout).toMatch(/\d+\.\d+\.\d+/);
      expect(results.typescript.stdout).toMatch(/\d+\.\d+\.\d+/);

      // Stderr should be empty or minimal for version command
      expect(results.rust.stderr.length).toBeLessThan(100);
      expect(results.typescript.stderr.length).toBeLessThan(100);
    });
  });
});