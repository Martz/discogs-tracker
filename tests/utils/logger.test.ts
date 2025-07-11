import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setDebugMode, isDebugEnabled, debug, debugApi, debugDb, debugWorker, debugTiming } from '../../src/utils/logger.js';

describe('Debug Logger', () => {
  let consoleErrorSpy: any;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    setDebugMode(false); // Reset to disabled
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe('Debug Mode Control', () => {
    it('should start with debug mode disabled', () => {
      expect(isDebugEnabled()).toBe(false);
    });

    it('should enable debug mode when set to true', () => {
      setDebugMode(true);
      expect(isDebugEnabled()).toBe(true);
    });

    it('should disable debug mode when set to false', () => {
      setDebugMode(true);
      setDebugMode(false);
      expect(isDebugEnabled()).toBe(false);
    });
  });

  describe('Debug Logging', () => {
    it('should not log when debug mode is disabled', () => {
      setDebugMode(false);
      debug('test message');
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it('should log when debug mode is enabled', () => {
      setDebugMode(true);
      debug('test message');
      expect(consoleErrorSpy).toHaveBeenCalled();
      const loggedMessage = consoleErrorSpy.mock.calls[0][0];
      expect(loggedMessage).toContain('DEBUG');
      expect(loggedMessage).toContain('test message');
    });

    it('should log with data when provided', () => {
      setDebugMode(true);
      const testData = { key: 'value' };
      debug('test message', testData);
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.any(String), testData);
    });

    it('should include timestamp in debug logs', () => {
      setDebugMode(true);
      debug('test message');
      const loggedMessage = consoleErrorSpy.mock.calls[0][0];
      // Should include an ISO timestamp
      expect(loggedMessage).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/);
    });
  });

  describe('API Debug Logging', () => {
    it('should not log API calls when debug mode is disabled', () => {
      setDebugMode(false);
      debugApi('GET', 'https://api.example.com/test');
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it('should log API calls when debug mode is enabled', () => {
      setDebugMode(true);
      debugApi('GET', 'https://api.example.com/test');
      expect(consoleErrorSpy).toHaveBeenCalled();
      const loggedMessage = consoleErrorSpy.mock.calls[0][0];
      expect(loggedMessage).toContain('API');
      expect(loggedMessage).toContain('GET');
    });

    it('should log API responses when provided', () => {
      setDebugMode(true);
      debugApi('GET', 'https://api.example.com/test', { status: 200 });
      expect(consoleErrorSpy).toHaveBeenCalledTimes(2);
      
      const firstCall = consoleErrorSpy.mock.calls[0][0];
      const secondCall = consoleErrorSpy.mock.calls[1][0];
      
      expect(firstCall).toContain('API');
      expect(secondCall).toContain('status: 200');
    });
  });

  describe('Database Debug Logging', () => {
    it('should not log database operations when debug mode is disabled', () => {
      setDebugMode(false);
      debugDb('INSERT operation');
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it('should log database operations when debug mode is enabled', () => {
      setDebugMode(true);
      debugDb('INSERT operation');
      expect(consoleErrorSpy).toHaveBeenCalled();
      const loggedMessage = consoleErrorSpy.mock.calls[0][0];
      expect(loggedMessage).toContain('DB');
      expect(loggedMessage).toContain('INSERT operation');
    });

    it('should log database operations with details', () => {
      setDebugMode(true);
      debugDb('INSERT operation', 'into releases table');
      expect(consoleErrorSpy).toHaveBeenCalled();
      const loggedMessage = consoleErrorSpy.mock.calls[0][0];
      expect(loggedMessage).toContain('INSERT operation');
      expect(loggedMessage).toContain('into releases table');
    });
  });

  describe('Worker Debug Logging', () => {
    it('should not log worker operations when debug mode is disabled', () => {
      setDebugMode(false);
      debugWorker('Task completed');
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it('should log worker operations when debug mode is enabled', () => {
      setDebugMode(true);
      debugWorker('Task completed');
      expect(consoleErrorSpy).toHaveBeenCalled();
      const loggedMessage = consoleErrorSpy.mock.calls[0][0];
      expect(loggedMessage).toContain('WORKER');
      expect(loggedMessage).toContain('Task completed');
    });

    it('should log worker operations with worker ID', () => {
      setDebugMode(true);
      debugWorker('Task completed', '123');
      expect(consoleErrorSpy).toHaveBeenCalled();
      const loggedMessage = consoleErrorSpy.mock.calls[0][0];
      expect(loggedMessage).toContain('WORKER-123');
      expect(loggedMessage).toContain('Task completed');
    });
  });

  describe('Timing Debug Logging', () => {
    it('should not log timing when debug mode is disabled', () => {
      setDebugMode(false);
      const startTime = Date.now() - 100;
      debugTiming('test operation', startTime);
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it('should log timing when debug mode is enabled', () => {
      setDebugMode(true);
      const startTime = Date.now() - 100;
      debugTiming('test operation', startTime);
      expect(consoleErrorSpy).toHaveBeenCalled();
      const loggedMessage = consoleErrorSpy.mock.calls[0][0];
      expect(loggedMessage).toContain('TIMING');
      expect(loggedMessage).toContain('test operation');
      expect(loggedMessage).toContain('ms');
    });

    it('should calculate duration correctly', () => {
      setDebugMode(true);
      const startTime = Date.now() - 150;
      debugTiming('test operation', startTime);
      expect(consoleErrorSpy).toHaveBeenCalled();
      const loggedMessage = consoleErrorSpy.mock.calls[0][0];
      // Check that it includes a reasonable duration
      const durationMatch = loggedMessage.match(/(\d+)ms/);
      expect(durationMatch).toBeTruthy();
      if (durationMatch) {
        const duration = parseInt(durationMatch[1]);
        expect(duration).toBeGreaterThanOrEqual(140);
        expect(duration).toBeLessThanOrEqual(170);
      }
    });
  });
});