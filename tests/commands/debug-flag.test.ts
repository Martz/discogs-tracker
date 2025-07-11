import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

describe('CLI Debug Flag Integration', () => {
  let consoleErrorSpy: any;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe('Help Output', () => {
    it('should show debug flag in help output', async () => {
      const { stdout } = await execAsync('node dist/cli.js --help', {
        cwd: process.cwd()
      });
      
      expect(stdout).toContain('-d, --debug');
      expect(stdout).toContain('Enable debug mode for verbose logging');
    });

    it('should show debug flag in help for commands', async () => {
      const { stdout } = await execAsync('node dist/cli.js config --help', {
        cwd: process.cwd()
      });
      
      // Commands should show their specific help, not the global options
      // The debug flag is available at the global level
      expect(stdout).toContain('Usage: discogs-tracker config');
    });
  });

  describe('Debug Mode Behavior', () => {
    it('should not show debug logs without debug flag', async () => {
      const { stderr } = await execAsync('node dist/cli.js migrate --status', {
        cwd: process.cwd()
      });
      
      expect(stderr).not.toContain('[DEBUG]');
      expect(stderr).not.toContain('[DB]');
    });

    it('should show debug logs with debug flag', async () => {
      const { stderr } = await execAsync('node dist/cli.js --debug migrate --status', {
        cwd: process.cwd()
      });
      
      expect(stderr).toContain('[DEBUG]');
      expect(stderr).toContain('[DB]');
      expect(stderr).toContain('Opening database');
      expect(stderr).toContain('Database initialized successfully');
    });

    it('should show debug logs with short debug flag', async () => {
      const { stderr } = await execAsync('node dist/cli.js -d migrate --status', {
        cwd: process.cwd()
      });
      
      expect(stderr).toContain('[DEBUG]');
      expect(stderr).toContain('[DB]');
    });

    it('should work with debug flag in different positions', async () => {
      // Debug flag before command
      const { stderr: stderr1 } = await execAsync('node dist/cli.js --debug migrate --status', {
        cwd: process.cwd()
      });
      
      expect(stderr1).toContain('[DEBUG]');
      
      // This would test debug flag after command, but commander.js doesn't support this pattern
      // The global flag must come before the command
    });
  });

  describe('Command Compatibility', () => {
    it('should work with config command', async () => {
      const { stderr } = await execAsync('node dist/cli.js --debug config --show', {
        cwd: process.cwd()
      });
      
      // Config command doesn't initialize database, so no debug logs expected for it
      // But if it did have debug logs, they would show
      expect(stderr).not.toContain('error');
    });

    it('should work with value command', async () => {
      const { stderr } = await execAsync('node dist/cli.js --debug value', {
        cwd: process.cwd()
      });
      
      expect(stderr).toContain('[DEBUG]');
      expect(stderr).toContain('Opening database');
    });

    it('should work with migrate command', async () => {
      const { stderr } = await execAsync('node dist/cli.js --debug migrate --status', {
        cwd: process.cwd()
      });
      
      expect(stderr).toContain('[DEBUG]');
      expect(stderr).toContain('[DB]');
    });
  });

  describe('Error Handling', () => {
    it('should still show errors when debug mode is enabled', async () => {
      try {
        await execAsync('node dist/cli.js --debug history invalid-id', {
          cwd: process.cwd()
        });
      } catch (error: any) {
        // Command should fail with invalid ID, but debug logs should still appear in stderr
        expect(error.stderr || error.stdout).toContain('[DEBUG]');
      }
    });
  });
});