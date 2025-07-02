import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DiscogsService } from '../../src/services/discogs.js';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('DiscogsService', () => {
  let service: DiscogsService;
  const mockToken = 'test-token';
  const mockUsername = 'test-user';

  beforeEach(() => {
    service = new DiscogsService(mockToken, mockUsername);
    mockFetch.mockClear();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('API Request Handling', () => {
    it('should make requests with correct headers', async () => {
      const mockResponse = {
        ok: true,
        json: () => Promise.resolve({ test: 'data' })
      };
      mockFetch.mockResolvedValue(mockResponse);

      // Use any method that calls makeRequest
      await service.getFolders();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/users/test-user/collection/folders'),
        expect.objectContaining({
          headers: {
            'Authorization': 'Discogs token=test-token',
            'User-Agent': 'DiscogsCollectionTracker/1.0'
          }
        })
      );
    });

    it('should handle API errors', async () => {
      const mockResponse = {
        ok: false,
        statusText: 'Not Found'
      };
      mockFetch.mockResolvedValue(mockResponse);

      await expect(service.getFolders()).rejects.toThrow('Discogs API error: Not Found');
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      await expect(service.getFolders()).rejects.toThrow('Network error');
    });
  });

  describe('Folders', () => {
    it('should fetch user folders', async () => {
      const mockFolders = {
        folders: [
          { id: 0, name: 'All', count: 100 },
          { id: 1, name: 'Favourites', count: 25 }
        ]
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockFolders)
      });

      const folders = await service.getFolders();

      expect(folders).toEqual(mockFolders.folders);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.discogs.com/users/test-user/collection/folders',
        expect.any(Object)
      );
    });
  });

  describe('Collection', () => {
    it('should fetch collection from main folder', async () => {
      const mockCollection = {
        pagination: { page: 1, pages: 1, per_page: 100, items: 2 },
        releases: [
          {
            id: 123456,
            instance_id: 1001,
            folder_id: 0,
            rating: 5,
            basic_information: {
              id: 123456,
              title: 'Test Album',
              artists: [{ name: 'Test Artist', id: 789 }],
              year: 2023,
              formats: [{ name: 'Vinyl' }],
              thumb: 'https://example.com/thumb.jpg'
            },
            date_added: '2023-01-01T00:00:00Z'
          }
        ]
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockCollection)
      });

      const collection = await service.getCollection();

      expect(collection).toEqual(mockCollection.releases);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/users/test-user/collection/folders/0/releases'),
        expect.any(Object)
      );
    });

    it('should handle paginated collection', async () => {
      const mockPage1 = {
        pagination: { page: 1, pages: 2, per_page: 100, items: 150 },
        releases: [{ id: 1, basic_information: { title: 'Album 1' } }]
      };

      const mockPage2 = {
        pagination: { page: 2, pages: 2, per_page: 100, items: 150 },
        releases: [{ id: 2, basic_information: { title: 'Album 2' } }]
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockPage1)
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockPage2)
        });

      const collection = await service.getCollection();

      expect(collection).toHaveLength(2);
      expect(collection[0].id).toBe(1);
      expect(collection[1].id).toBe(2);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should fetch collection by specific folder', async () => {
      const mockCollection = {
        pagination: { page: 1, pages: 1, per_page: 100, items: 1 },
        releases: [{ id: 123, basic_information: { title: 'Favourite Album' } }]
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockCollection)
      });

      const collection = await service.getCollectionByFolder(1);

      expect(collection).toEqual(mockCollection.releases);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/users/test-user/collection/folders/1/releases'),
        expect.any(Object)
      );
    });
  });

  describe('Wantlist', () => {
    it('should fetch user wantlist', async () => {
      const mockWantlist = {
        pagination: { page: 1, pages: 1, per_page: 100, items: 1 },
        wants: [
          {
            id: 456789,
            rating: 0,
            notes: 'Must have!',
            basic_information: {
              id: 456789,
              title: 'Wanted Album',
              artists: [{ name: 'Wanted Artist' }],
              year: 2023,
              formats: [{ name: 'Vinyl' }]
            },
            date_added: '2023-01-01T00:00:00Z'
          }
        ]
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockWantlist)
      });

      const wantlist = await service.getWantlist();

      expect(wantlist).toEqual(mockWantlist.wants);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/users/test-user/wants'),
        expect.any(Object)
      );
    });

    it('should handle paginated wantlist', async () => {
      const mockPage1 = {
        pagination: { page: 1, pages: 2, per_page: 100, items: 150 },
        wants: [{ id: 1, basic_information: { title: 'Want 1' } }]
      };

      const mockPage2 = {
        pagination: { page: 2, pages: 2, per_page: 100, items: 150 },
        wants: [{ id: 2, basic_information: { title: 'Want 2' } }]
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockPage1)
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockPage2)
        });

      const wantlist = await service.getWantlist();

      expect(wantlist).toHaveLength(2);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('Marketplace Stats', () => {
    it('should fetch marketplace stats with wants count', async () => {
      const mockStatsResponse = {
        lowest_price: { value: 25.99, currency: 'GBP' },
        num_for_sale: 5,
        blocked_from_sale: false
      };

      const mockReleaseResponse = {
        community: { want: 142, have: 89 }
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockStatsResponse)
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockReleaseResponse)
        });

      const stats = await service.getMarketplaceStats(123456);

      expect(stats).toEqual({
        price: 25.99,
        currency: 'GBP',
        condition: 'Various',
        listingCount: 5,
        wantsCount: 142
      });

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(mockFetch).toHaveBeenNthCalledWith(1,
        'https://api.discogs.com/marketplace/stats/123456',
        expect.any(Object)
      );
      expect(mockFetch).toHaveBeenNthCalledWith(2,
        'https://api.discogs.com/releases/123456',
        expect.any(Object)
      );
    });

    it('should handle missing marketplace data', async () => {
      const mockResponse = {
        num_for_sale: 0,
        blocked_from_sale: true
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const stats = await service.getMarketplaceStats(123456);

      expect(stats).toBeNull();
    });

    it('should handle wants count fetch failure gracefully', async () => {
      const mockStatsResponse = {
        lowest_price: { value: 25.99, currency: 'GBP' },
        num_for_sale: 5,
        blocked_from_sale: false
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockStatsResponse)
        })
        .mockResolvedValueOnce({
          ok: false,
          statusText: 'Not Found'
        });

      const stats = await service.getMarketplaceStats(123456);

      expect(stats).toEqual({
        price: 25.99,
        currency: 'GBP',
        condition: 'Various',
        listingCount: 5,
        wantsCount: 0 // Should default to 0 when wants fetch fails
      });
    });

    it('should handle marketplace stats API error', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        statusText: 'Too Many Requests'
      });

      const stats = await service.getMarketplaceStats(123456);

      expect(stats).toBeNull();
    });
  });

  describe('Legacy Methods', () => {
    it('should provide backwards compatible getLowestMarketplacePrice', async () => {
      const mockStatsResponse = {
        lowest_price: { value: 25.99, currency: 'GBP' },
        num_for_sale: 5,
        blocked_from_sale: false
      };

      const mockReleaseResponse = {
        community: { want: 142, have: 89 }
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockStatsResponse)
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockReleaseResponse)
        });

      const price = await service.getLowestMarketplacePrice(123456);

      expect(price).toEqual({
        price: 25.99,
        currency: 'GBP',
        condition: 'Various',
        listingCount: 5
      });
    });

    it('should return null when getMarketplaceStats returns null', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ num_for_sale: 0 })
      });

      const price = await service.getLowestMarketplacePrice(123456);

      expect(price).toBeNull();
    });
  });

  describe('Rate Limiting', () => {
    it('should include delays between paginated requests', async () => {
      const mockPage1 = {
        pagination: { page: 1, pages: 2, per_page: 100, items: 150 },
        releases: [{ id: 1 }]
      };

      const mockPage2 = {
        pagination: { page: 2, pages: 2, per_page: 100, items: 150 },
        releases: [{ id: 2 }]
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockPage1)
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockPage2)
        });

      const startTime = Date.now();
      await service.getCollection();
      const endTime = Date.now();

      // Should have taken at least 1 second due to delay
      expect(endTime - startTime).toBeGreaterThanOrEqual(900); // Allow some tolerance
    });
  });
});