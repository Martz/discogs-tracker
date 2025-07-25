import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { CrossImplementationTestRunner } from './utils/test-runner.js';

describe('CLI Commands Cross-Implementation', () => {
  let runner: CrossImplementationTestRunner;

  beforeAll(async () => {
    runner = new CrossImplementationTestRunner();
    await runner.setup();
  }, 60000); // Longer timeout for builds

  afterAll(async () => {
    await runner.cleanup();
  });

  describe('Help Commands', () => {
    it('should show identical help output', async () => {
      const results = await runner.executeBoth(['--help']);

      expect(results.rust.exitCode).toBe(0);
      expect(results.typescript.exitCode).toBe(0);

      // Both should contain the same basic help structure
      expect(results.rust.stdout).toContain('discogs-tracker');
      expect(results.typescript.stdout).toContain('discogs-tracker');
      
      expect(results.rust.stdout).toContain('config');
      expect(results.typescript.stdout).toContain('config');
      
      expect(results.rust.stdout).toContain('sync');
      expect(results.typescript.stdout).toContain('sync');
      
      expect(results.rust.stdout).toContain('value');
      expect(results.typescript.stdout).toContain('value');
      
      expect(results.rust.stdout).toContain('trends');
      expect(results.typescript.stdout).toContain('trends');
    });

    it('should show identical subcommand help', async () => {
      const subcommands = ['config', 'sync', 'value', 'trends'];

      for (const cmd of subcommands) {
        const results = await runner.executeBoth([cmd, '--help']);

        expect(results.rust.exitCode).toBe(0);
        expect(results.typescript.exitCode).toBe(0);

        // Both should show help for the subcommand
        expect(results.rust.stdout).toContain(cmd);
        expect(results.typescript.stdout).toContain(cmd);
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid commands identically', async () => {
      const results = await runner.executeBoth(['invalid-command']);

      // Both should exit with non-zero codes
      expect(results.rust.exitCode).not.toBe(0);
      expect(results.typescript.exitCode).not.toBe(0);

      // Both should indicate the command is invalid
      const rustError = results.rust.stderr.toLowerCase();
      const tsError = results.typescript.stderr.toLowerCase();
      
      expect(rustError).toMatch(/(invalid|unknown|unrecognized)/);
      expect(tsError).toMatch(/(invalid|unknown|unrecognized)/);
    });

    it('should handle missing arguments identically', async () => {
      // Test sync without configuration
      const results = await runner.executeBoth(['sync']);

      // Both should exit with error
      expect(results.rust.exitCode).not.toBe(0);
      expect(results.typescript.exitCode).not.toBe(0);

      // Both should indicate configuration issue
      const rustOutput = (results.rust.stdout + results.rust.stderr).toLowerCase();
      const tsOutput = (results.typescript.stdout + results.typescript.stderr).toLowerCase();
      
      expect(rustOutput).toMatch(/(config|credential|token)/);
      expect(tsOutput).toMatch(/(config|credential|token)/);
    });
  });

  describe('Version Information', () => {
    it('should show version information', async () => {
      const results = await runner.executeBoth(['--version']);

      expect(results.rust.exitCode).toBe(0);
      expect(results.typescript.exitCode).toBe(0);

      // Both should show version numbers
      expect(results.rust.stdout).toMatch(/\d+\.\d+\.\d+/);
      expect(results.typescript.stdout).toMatch(/\d+\.\d+\.\d+/);
    });
  });

  describe('Configuration Commands', () => {
    it('should handle config show without config file', async () => {
      // Use fresh temp directories for each test
      const results = await runner.executeBoth(['config', 'show']);

      // Both should handle missing config gracefully
      expect(results.rust.exitCode).not.toBe(0);
      expect(results.typescript.exitCode).not.toBe(0);

      const rustOutput = (results.rust.stdout + results.rust.stderr).toLowerCase();
      const tsOutput = (results.typescript.stdout + results.typescript.stderr).toLowerCase();
      
      expect(rustOutput).toMatch(/(config|not found|missing)/);
      expect(tsOutput).toMatch(/(config|not found|missing)/);
    });
  });

  describe('Value Commands', () => {
    it('should handle value command without database', async () => {
      const results = await runner.executeBoth(['value']);

      // Both should handle missing database gracefully
      expect(results.rust.exitCode).not.toBe(0);
      expect(results.typescript.exitCode).not.toBe(0);

      const rustOutput = (results.rust.stdout + results.rust.stderr).toLowerCase();
      const tsOutput = (results.typescript.stdout + results.typescript.stderr).toLowerCase();
      
      expect(rustOutput).toMatch(/(database|not found|missing|config)/);
      expect(tsOutput).toMatch(/(database|not found|missing|config)/);
    });
  });

  describe('Trends Commands', () => {
    it('should handle trends command without database', async () => {
      const results = await runner.executeBoth(['trends']);

      // Both should handle missing database gracefully  
      expect(results.rust.exitCode).not.toBe(0);
      expect(results.typescript.exitCode).not.toBe(0);

      const rustOutput = (results.rust.stdout + results.rust.stderr).toLowerCase();
      const tsOutput = (results.typescript.stdout + results.typescript.stderr).toLowerCase();
      
      expect(rustOutput).toMatch(/(database|not found|missing|config)/);
      expect(tsOutput).toMatch(/(database|not found|missing|config)/);
    });

    it('should handle trends command with minimum change parameter', async () => {
      const results = await runner.executeBoth(['trends', '-m', '10']);

      // Both should handle missing database gracefully even with parameters
      expect(results.rust.exitCode).not.toBe(0);
      expect(results.typescript.exitCode).not.toBe(0);

      const rustOutput = (results.rust.stdout + results.rust.stderr).toLowerCase();
      const tsOutput = (results.typescript.stdout + results.typescript.stderr).toLowerCase();
      
      expect(rustOutput).toMatch(/(database|not found|missing|config)/);
      expect(tsOutput).toMatch(/(database|not found|missing|config)/);
    });
  });
});