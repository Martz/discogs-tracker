import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Create mock object
const mockConf = {
  store: {},
  get: vi.fn(),
  set: vi.fn()
};

// Mock conf module
vi.mock('conf', () => ({
  default: vi.fn().mockImplementation(() => mockConf)
}));

import { 
  getConfig, 
  setDiscogsCredentials, 
  getDiscogsCredentials, 
  setTrackingConfig, 
  getTrackingConfig, 
  isConfigured 
} from '../../src/utils/config.js';

describe('Config Utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockConf.store = {
      discogs: {
        token: '',
        username: ''
      },
      tracking: {
        checkInterval: 24,
        minPriceChangePercent: 5
      }
    };
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('getConfig', () => {
    it('should return the complete config store', () => {
      mockConf.store = {
        discogs: { token: 'test-token', username: 'test-user' },
        tracking: { checkInterval: 12, minPriceChangePercent: 10 }
      };

      const config = getConfig();
      expect(config).toEqual(mockConf.store);
    });
  });

  describe('Discogs Credentials', () => {
    it('should set Discogs credentials', () => {
      setDiscogsCredentials('new-token', 'new-user');

      expect(mockConf.set).toHaveBeenCalledWith('discogs.token', 'new-token');
      expect(mockConf.set).toHaveBeenCalledWith('discogs.username', 'new-user');
    });

    it('should get Discogs credentials', () => {
      const expectedCredentials = { token: 'test-token', username: 'test-user' };
      mockConf.get.mockReturnValue(expectedCredentials);

      const credentials = getDiscogsCredentials();

      expect(mockConf.get).toHaveBeenCalledWith('discogs');
      expect(credentials).toEqual(expectedCredentials);
    });

    it('should handle empty credentials', () => {
      const emptyCredentials = { token: '', username: '' };
      mockConf.get.mockReturnValue(emptyCredentials);

      const credentials = getDiscogsCredentials();
      expect(credentials).toEqual(emptyCredentials);
    });

    it('should handle missing credentials', () => {
      mockConf.get.mockReturnValue(undefined);

      const credentials = getDiscogsCredentials();
      expect(credentials).toBeUndefined();
    });
  });

  describe('Tracking Configuration', () => {
    it('should set tracking configuration', () => {
      setTrackingConfig(48, 15);

      expect(mockConf.set).toHaveBeenCalledWith('tracking.checkInterval', 48);
      expect(mockConf.set).toHaveBeenCalledWith('tracking.minPriceChangePercent', 15);
    });

    it('should get tracking configuration', () => {
      const expectedConfig = { checkInterval: 36, minPriceChangePercent: 8 };
      mockConf.get.mockReturnValue(expectedConfig);

      const config = getTrackingConfig();

      expect(mockConf.get).toHaveBeenCalledWith('tracking');
      expect(config).toEqual(expectedConfig);
    });

    it('should handle default tracking values', () => {
      const defaultConfig = { checkInterval: 24, minPriceChangePercent: 5 };
      mockConf.get.mockReturnValue(defaultConfig);

      const config = getTrackingConfig();
      expect(config).toEqual(defaultConfig);
    });
  });

  describe('Configuration Validation', () => {
    it('should return true when fully configured', () => {
      mockConf.get.mockReturnValue({ token: 'valid-token', username: 'valid-user' });

      const configured = isConfigured();
      expect(configured).toBe(true);
    });

    it('should return false when token is missing', () => {
      mockConf.get.mockReturnValue({ token: '', username: 'valid-user' });

      const configured = isConfigured();
      expect(configured).toBe(false);
    });

    it('should return false when username is missing', () => {
      mockConf.get.mockReturnValue({ token: 'valid-token', username: '' });

      const configured = isConfigured();
      expect(configured).toBe(false);
    });

    it('should return false when both are missing', () => {
      mockConf.get.mockReturnValue({ token: '', username: '' });

      const configured = isConfigured();
      expect(configured).toBe(false);
    });

    it('should return false when credentials object is missing', () => {
      mockConf.get.mockReturnValue(undefined);

      const configured = isConfigured();
      expect(configured).toBe(false);
    });

    it('should handle null values', () => {
      mockConf.get.mockReturnValue({ token: null, username: null });

      const configured = isConfigured();
      expect(configured).toBe(false);
    });

    it('should handle undefined values', () => {
      mockConf.get.mockReturnValue({ token: undefined, username: undefined });

      const configured = isConfigured();
      expect(configured).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle whitespace-only credentials', () => {
      mockConf.get.mockReturnValue({ token: '   ', username: '   ' });

      // Assuming the isConfigured function checks for truthy values
      const configured = isConfigured();
      expect(configured).toBe(true); // Whitespace is truthy
    });

    it('should handle special characters in credentials', () => {
      const specialCredentials = { 
        token: 'token-with-special-chars!@#$%', 
        username: 'user_name.123' 
      };
      mockConf.get.mockReturnValue(specialCredentials);

      const configured = isConfigured();
      expect(configured).toBe(true);
    });

    it('should handle very long credentials', () => {
      const longCredentials = {
        token: 'a'.repeat(1000),
        username: 'b'.repeat(500)
      };
      mockConf.get.mockReturnValue(longCredentials);

      const configured = isConfigured();
      expect(configured).toBe(true);
    });

    it('should handle numeric values for tracking config', () => {
      setTrackingConfig(0, 0);

      expect(mockConf.set).toHaveBeenCalledWith('tracking.checkInterval', 0);
      expect(mockConf.set).toHaveBeenCalledWith('tracking.minPriceChangePercent', 0);
    });

    it('should handle negative values for tracking config', () => {
      setTrackingConfig(-24, -5);

      expect(mockConf.set).toHaveBeenCalledWith('tracking.checkInterval', -24);
      expect(mockConf.set).toHaveBeenCalledWith('tracking.minPriceChangePercent', -5);
    });

    it('should handle decimal values for tracking config', () => {
      setTrackingConfig(24.5, 7.25);

      expect(mockConf.set).toHaveBeenCalledWith('tracking.checkInterval', 24.5);
      expect(mockConf.set).toHaveBeenCalledWith('tracking.minPriceChangePercent', 7.25);
    });
  });

  describe('Integration Scenarios', () => {
    it('should maintain state across multiple operations', () => {
      // Set credentials
      setDiscogsCredentials('integration-token', 'integration-user');
      
      // Set tracking config
      setTrackingConfig(12, 3);

      // Verify all calls were made
      expect(mockConf.set).toHaveBeenCalledTimes(4);
      expect(mockConf.set).toHaveBeenCalledWith('discogs.token', 'integration-token');
      expect(mockConf.set).toHaveBeenCalledWith('discogs.username', 'integration-user');
      expect(mockConf.set).toHaveBeenCalledWith('tracking.checkInterval', 12);
      expect(mockConf.set).toHaveBeenCalledWith('tracking.minPriceChangePercent', 3);
    });

    it('should handle partial configuration updates', () => {
      // First, set up initial config
      mockConf.get.mockReturnValue({ token: 'old-token', username: 'old-user' });
      
      // Update only one credential
      setDiscogsCredentials('new-token', 'old-user');

      expect(mockConf.set).toHaveBeenCalledWith('discogs.token', 'new-token');
      expect(mockConf.set).toHaveBeenCalledWith('discogs.username', 'old-user');
    });
  });
});