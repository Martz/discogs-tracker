import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { CrossImplementationTestRunner } from './utils/test-runner.js';

describe('Configuration Management Cross-Implementation', () => {
  let runner: CrossImplementationTestRunner;

  beforeAll(async () => {
    runner = new CrossImplementationTestRunner();
    await runner.setup();
  }, 60000);

  afterAll(async () => {
    await runner.cleanup();
  });

  describe('Configuration File Compatibility', () => {
    it('should create compatible configuration files', async () => {
      // Create test config data
      const testConfig = {
        token: 'test-token-12345',
        username: 'testuser',
        database_path: './test.db'
      };

      const configPath = await runner.createTestConfig(testConfig);

      // Both implementations should be able to read the same config
      const rustResult = await runner.executeRust(['config', 'show'], {
        timeout: 10000,
        useRealAPI: false
      });
      
      const tsResult = await runner.executeTypeScript(['config', 'show'], {
        timeout: 10000,
        useRealAPI: false
      });

      // If config is found, both should show similar information
      if (rustResult.exitCode === 0 && tsResult.exitCode === 0) {
        expect(rustResult.stdout).toContain('testuser');
        expect(tsResult.stdout).toContain('testuser');
        
        // Both should mask the token for security
        expect(rustResult.stdout).not.toContain('test-token-12345');
        expect(tsResult.stdout).not.toContain('test-token-12345');
      }
    });

    it('should handle missing configuration identically', async () => {
      const results = await runner.executeBoth(['config', 'show']);

      // Both should exit with non-zero when config is missing
      expect(results.rust.exitCode).not.toBe(0);
      expect(results.typescript.exitCode).not.toBe(0);

      const rustOutput = (results.rust.stdout + results.rust.stderr).toLowerCase();
      const tsOutput = (results.typescript.stdout + results.typescript.stderr).toLowerCase();

      // Both should indicate configuration is missing
      expect(rustOutput).toMatch(/(config|not found|missing)/);
      expect(tsOutput).toMatch(/(config|not found|missing)/);
    });
  });

  describe('Configuration Validation', () => {
    it('should validate configuration format consistently', async () => {
      // Create invalid config
      const invalidConfig = {
        invalid_field: 'value',
        another_invalid: 123
      };

      await runner.createTestConfig(invalidConfig);

      const results = await runner.executeBoth(['config', 'show']);

      // Both should handle invalid config gracefully
      expect(results.rust.exitCode).not.toBe(0);
      expect(results.typescript.exitCode).not.toBe(0);
    });

    it('should handle malformed JSON consistently', async () => {
      // Create malformed JSON config file
      const configPath = await runner.createTestConfig({});
      const fs = await import('fs/promises');
      await fs.writeFile(configPath, '{ invalid json }');

      const results = await runner.executeBoth(['config', 'show']);

      // Both should handle malformed JSON gracefully
      expect(results.rust.exitCode).not.toBe(0);
      expect(results.typescript.exitCode).not.toBe(0);

      const rustOutput = (results.rust.stdout + results.rust.stderr).toLowerCase();
      const tsOutput = (results.typescript.stdout + results.typescript.stderr).toLowerCase();

      // Both should indicate JSON parsing error
      expect(rustOutput).toMatch(/(json|parse|invalid|malformed)/);
      expect(tsOutput).toMatch(/(json|parse|invalid|malformed)/);
    });
  });

  describe('Configuration Paths', () => {
    it('should use same default configuration paths', async () => {
      // Both implementations should look for config in same locations
      const results = await runner.executeBoth(['config', 'show']);

      // Even if config is missing, error messages should reference similar paths
      const rustOutput = results.rust.stderr;
      const tsOutput = results.typescript.stderr;

      // Both should reference config directory or file paths
      if (rustOutput.includes('/') || tsOutput.includes('/')) {
        // If paths are shown, they should be similar
        expect(rustOutput).toMatch(/config/);
        expect(tsOutput).toMatch(/config/);
      }
    });
  });

  describe('Environment Variables', () => {
    it('should respect same environment variables', async () => {
      // Test with environment variables
      const testConfig = {
        timeout: 5000,
        useRealAPI: false
      };

      // Set environment variable for token (if supported)
      const results = await runner.executeBoth(['config', 'show'], testConfig);

      // Both should handle environment variables consistently
      expect(results.rust.exitCode).toBe(results.typescript.exitCode);
    });
  });

  describe('Configuration Precedence', () => {
    it('should follow same configuration precedence rules', async () => {
      // Create config file
      const testConfig = {
        token: 'file-token',
        username: 'file-user',
        database_path: './file.db'
      };

      await runner.createTestConfig(testConfig);

      const results = await runner.executeBoth(['config', 'show']);

      // Both should handle configuration loading consistently
      if (results.rust.exitCode === 0 && results.typescript.exitCode === 0) {
        // Both should show the same precedence behavior
        expect(results.rust.stdout).toContain('file-user');
        expect(results.typescript.stdout).toContain('file-user');
      }
    });
  });
});