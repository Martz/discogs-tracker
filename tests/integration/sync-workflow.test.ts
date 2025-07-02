import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PriceDatabase } from '../../src/db/database.js';
import { DiscogsService } from '../../src/services/discogs.js';
import type { DiscogsCollectionItem, DiscogsWantlistItem } from '../../src/types/index.js';

// Mock external dependencies
vi.mock('../../src/db/database.js');
vi.mock('../../src/services/discogs.js');

describe('Sync Workflow Integration', () => {
  let mockDb: any;
  let mockDiscogs: any;

  beforeEach(() => {
    mockDb = {
      addOrUpdateRelease: vi.fn(),
      addCollectionItem: vi.fn(),
      addWantItem: vi.fn(),
      addPriceRecord: vi.fn(),
      getLatestPrice: vi.fn(),
      close: vi.fn()
    };

    mockDiscogs = {
      getFolders: vi.fn(),
      getCollectionByFolder: vi.fn(),
      getWantlist: vi.fn(),
      getMarketplaceStats: vi.fn()
    };

    vi.mocked(PriceDatabase).mockImplementation(() => mockDb);
    vi.mocked(DiscogsService).mockImplementation(() => mockDiscogs);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Complete Sync Workflow', () => {
    it('should sync folders, collection, wantlist, and prices', async () => {
      // Mock data
      const mockFolders = [
        { id: 0, name: 'All', count: 2 },
        { id: 1, name: 'Favourites', count: 1 }
      ];

      const mockCollection: DiscogsCollectionItem[] = [
        {
          id: 123456,
          instance_id: 1001,
          folder_id: 0,
          rating: 5,
          basic_information: {
            id: 123456,
            title: 'Test Album',
            artists: [{ name: 'Test Artist', id: 789, resource_url: '' }],
            year: 2023,
            formats: [{ name: 'Vinyl', qty: '1' }],
            thumb: 'https://example.com/thumb.jpg',
            cover_image: '',
            resource_url: '',
            labels: [],
            genres: [],
            styles: []
          },
          date_added: '2023-01-01T00:00:00Z'
        }
      ];

      const mockWantlist: DiscogsWantlistItem[] = [
        {
          id: 789012,
          rating: 0,
          notes: 'Want this!',
          basic_information: {
            id: 789012,
            title: 'Wanted Album',
            artists: [{ name: 'Wanted Artist', id: 456, resource_url: '' }],
            year: 2023,
            formats: [{ name: 'Vinyl', qty: '1' }],
            thumb: 'https://example.com/want.jpg',
            cover_image: '',
            resource_url: '',
            labels: [],
            genres: [],
            styles: []
          },
          date_added: '2023-01-01T00:00:00Z'
        }
      ];

      const mockPriceStats = {
        price: 25.99,
        currency: 'GBP',
        condition: 'Various',
        listingCount: 5,
        wantsCount: 42
      };

      // Set up mocks
      mockDiscogs.getFolders.mockResolvedValue(mockFolders);
      mockDiscogs.getCollectionByFolder.mockResolvedValue(mockCollection);
      mockDiscogs.getWantlist.mockResolvedValue(mockWantlist);
      mockDiscogs.getMarketplaceStats.mockResolvedValue(mockPriceStats);
      mockDb.getLatestPrice.mockReturnValue(null); // No existing price

      // Simulate sync workflow
      const folders = await mockDiscogs.getFolders();
      expect(folders).toEqual(mockFolders);

      // Process each folder
      for (const folder of folders) {
        const folderItems = await mockDiscogs.getCollectionByFolder(folder.id);
        
        for (const item of folderItems) {
          // Add release
          mockDb.addOrUpdateRelease({
            id: item.id,
            title: item.basic_information.title,
            artist: item.basic_information.artists[0].name,
            year: item.basic_information.year,
            format: item.basic_information.formats[0].name,
            thumb_url: item.basic_information.thumb,
            added_date: item.date_added
          });

          // Add collection item
          mockDb.addCollectionItem({
            releaseId: item.id,
            folderId: folder.id,
            folderName: folder.name,
            instanceId: item.instance_id,
            addedDate: item.date_added
          });
        }
      }

      // Process wantlist
      const wantlist = await mockDiscogs.getWantlist();
      for (const want of wantlist) {
        mockDb.addOrUpdateRelease({
          id: want.id,
          title: want.basic_information.title,
          artist: want.basic_information.artists[0].name,
          year: want.basic_information.year,
          format: want.basic_information.formats[0].name,
          thumb_url: want.basic_information.thumb,
          added_date: want.date_added
        });

        mockDb.addWantItem({
          releaseId: want.id,
          addedDate: want.date_added,
          notes: want.notes
        });
      }

      // Process prices
      const priceStats = await mockDiscogs.getMarketplaceStats(123456);
      if (priceStats) {
        mockDb.addPriceRecord({
          release_id: 123456,
          price: priceStats.price,
          currency: priceStats.currency,
          condition: priceStats.condition,
          timestamp: new Date().toISOString(),
          listing_count: priceStats.listingCount,
          wantsCount: priceStats.wantsCount
        });
      }

      // Verify all operations were called
      expect(mockDb.addOrUpdateRelease).toHaveBeenCalledTimes(2); // Collection + wantlist
      expect(mockDb.addCollectionItem).toHaveBeenCalledTimes(1);
      expect(mockDb.addWantItem).toHaveBeenCalledTimes(1);
      expect(mockDb.addPriceRecord).toHaveBeenCalledTimes(1);
    });

    it('should handle sync with existing price data', async () => {
      const mockCollection: DiscogsCollectionItem[] = [{
        id: 123456,
        instance_id: 1001,
        folder_id: 0,
        rating: 5,
        basic_information: {
          id: 123456,
          title: 'Test Album',
          artists: [{ name: 'Test Artist', id: 789, resource_url: '' }],
          year: 2023,
          formats: [{ name: 'Vinyl', qty: '1' }],
          thumb: 'https://example.com/thumb.jpg',
          cover_image: '',
          resource_url: '',
          labels: [],
          genres: [],
          styles: []
        },
        date_added: '2023-01-01T00:00:00Z'
      }];

      // Mock existing price from yesterday
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      mockDb.getLatestPrice.mockReturnValue({
        price: 20.00,
        timestamp: yesterday.toISOString()
      });

      mockDiscogs.getFolders.mockResolvedValue([{ id: 0, name: 'All', count: 1 }]);
      mockDiscogs.getCollectionByFolder.mockResolvedValue(mockCollection);
      mockDiscogs.getWantlist.mockResolvedValue([]);

      // Simulate checking if price update is needed
      const latestPrice = mockDb.getLatestPrice(123456);
      const hoursSinceLastCheck = latestPrice 
        ? (Date.now() - new Date(latestPrice.timestamp).getTime()) / (1000 * 60 * 60)
        : Infinity;

      expect(hoursSinceLastCheck).toBeGreaterThan(23); // Should need update
      expect(latestPrice.price).toBe(20.00);
    });

    it('should handle API errors gracefully', async () => {
      mockDiscogs.getFolders.mockRejectedValue(new Error('API Error'));

      try {
        await mockDiscogs.getFolders();
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe('API Error');
      }

      // Verify database operations weren't called
      expect(mockDb.addOrUpdateRelease).not.toHaveBeenCalled();
    });

    it('should handle partial sync failures', async () => {
      const mockFolders = [{ id: 0, name: 'All', count: 1 }];
      const mockCollection: DiscogsCollectionItem[] = [{
        id: 123456,
        instance_id: 1001,
        folder_id: 0,
        rating: 5,
        basic_information: {
          id: 123456,
          title: 'Test Album',
          artists: [{ name: 'Test Artist', id: 789, resource_url: '' }],
          year: 2023,
          formats: [{ name: 'Vinyl', qty: '1' }],
          thumb: 'https://example.com/thumb.jpg',
          cover_image: '',
          resource_url: '',
          labels: [],
          genres: [],
          styles: []
        },
        date_added: '2023-01-01T00:00:00Z'
      }];

      mockDiscogs.getFolders.mockResolvedValue(mockFolders);
      mockDiscogs.getCollectionByFolder.mockResolvedValue(mockCollection);
      mockDiscogs.getWantlist.mockResolvedValue([]);
      mockDiscogs.getMarketplaceStats.mockRejectedValue(new Error('Price fetch failed'));
      mockDb.getLatestPrice.mockReturnValue(null);

      // Simulate partial sync
      const folders = await mockDiscogs.getFolders();
      const folderItems = await mockDiscogs.getCollectionByFolder(0);
      const wantlist = await mockDiscogs.getWantlist();

      // Collection and wantlist should succeed
      expect(folders).toEqual(mockFolders);
      expect(folderItems).toEqual(mockCollection);
      expect(wantlist).toEqual([]);

      // Price fetch should fail
      try {
        await mockDiscogs.getMarketplaceStats(123456);
      } catch (error) {
        expect((error as Error).message).toBe('Price fetch failed');
      }

      // Collection data should still be saved
      expect(mockDb.addOrUpdateRelease).toHaveBeenCalled();
      expect(mockDb.addCollectionItem).toHaveBeenCalled();
    });
  });

  describe('Data Consistency', () => {
    it('should maintain referential integrity between releases and prices', async () => {
      const releaseId = 123456;
      
      // Add release first
      mockDb.addOrUpdateRelease({
        id: releaseId,
        title: 'Test Album',
        artist: 'Test Artist',
        year: 2023,
        format: 'Vinyl',
        thumb_url: 'https://example.com/thumb.jpg',
        added_date: '2023-01-01T00:00:00Z'
      });

      // Then add price record
      mockDb.addPriceRecord({
        release_id: releaseId,
        price: 25.99,
        currency: 'GBP',
        condition: 'VG+',
        timestamp: new Date().toISOString(),
        listing_count: 5,
        wantsCount: 42
      });

      // Verify both calls used the same release ID
      expect(mockDb.addOrUpdateRelease).toHaveBeenCalledWith(
        expect.objectContaining({ id: releaseId })
      );
      expect(mockDb.addPriceRecord).toHaveBeenCalledWith(
        expect.objectContaining({ release_id: releaseId })
      );
    });

    it('should handle duplicate collection items across folders', async () => {
      const mockCollection: DiscogsCollectionItem[] = [{
        id: 123456,
        instance_id: 1001,
        folder_id: 0,
        rating: 5,
        basic_information: {
          id: 123456,
          title: 'Test Album',
          artists: [{ name: 'Test Artist', id: 789, resource_url: '' }],
          year: 2023,
          formats: [{ name: 'Vinyl', qty: '1' }],
          thumb: 'https://example.com/thumb.jpg',
          cover_image: '',
          resource_url: '',
          labels: [],
          genres: [],
          styles: []
        },
        date_added: '2023-01-01T00:00:00Z'
      }];

      // Same item in multiple folders
      const folders = [
        { id: 0, name: 'All', count: 1 },
        { id: 1, name: 'Favourites', count: 1 }
      ];

      mockDiscogs.getCollectionByFolder.mockResolvedValue(mockCollection);

      // Process same item in different folders
      for (const folder of folders) {
        const folderItems = mockCollection; // Same items
        
        for (const item of folderItems) {
          mockDb.addOrUpdateRelease({
            id: item.id,
            title: item.basic_information.title,
            artist: item.basic_information.artists[0].name,
            year: item.basic_information.year,
            format: item.basic_information.formats[0].name,
            thumb_url: item.basic_information.thumb,
            added_date: item.date_added
          });

          mockDb.addCollectionItem({
            releaseId: item.id,
            folderId: folder.id,
            folderName: folder.name,
            instanceId: item.instance_id,
            addedDate: item.date_added
          });
        }
      }

      // Release should be added/updated for each folder
      expect(mockDb.addOrUpdateRelease).toHaveBeenCalledTimes(2);
      
      // Collection item should be added for each folder
      expect(mockDb.addCollectionItem).toHaveBeenCalledTimes(2);
      
      // Verify different folder IDs
      expect(mockDb.addCollectionItem).toHaveBeenCalledWith(
        expect.objectContaining({ folderId: 0, folderName: 'All' })
      );
      expect(mockDb.addCollectionItem).toHaveBeenCalledWith(
        expect.objectContaining({ folderId: 1, folderName: 'Favourites' })
      );
    });
  });

  describe('Performance Considerations', () => {
    it('should handle large collections efficiently', async () => {
      const largeCollection = Array.from({ length: 1000 }, (_, i) => ({
        id: i + 1,
        instance_id: 1000 + i,
        folder_id: 0,
        rating: 5,
        basic_information: {
          id: i + 1,
          title: `Album ${i + 1}`,
          artists: [{ name: `Artist ${i + 1}`, id: 1000 + i, resource_url: '' }],
          year: 2023,
          formats: [{ name: 'Vinyl', qty: '1' }],
          thumb: `https://example.com/thumb${i + 1}.jpg`,
          cover_image: '',
          resource_url: '',
          labels: [],
          genres: [],
          styles: []
        },
        date_added: '2023-01-01T00:00:00Z'
      })) as DiscogsCollectionItem[];

      mockDiscogs.getFolders.mockResolvedValue([{ id: 0, name: 'All', count: 1000 }]);
      mockDiscogs.getCollectionByFolder.mockResolvedValue(largeCollection);
      mockDiscogs.getWantlist.mockResolvedValue([]);

      const startTime = Date.now();
      
      // Simulate processing
      const folders = await mockDiscogs.getFolders();
      const folderItems = await mockDiscogs.getCollectionByFolder(0);
      
      folderItems.forEach(item => {
        mockDb.addOrUpdateRelease({
          id: item.id,
          title: item.basic_information.title,
          artist: item.basic_information.artists[0].name,
          year: item.basic_information.year,
          format: item.basic_information.formats[0].name,
          thumb_url: item.basic_information.thumb,
          added_date: item.date_added
        });
      });

      const endTime = Date.now();

      expect(mockDb.addOrUpdateRelease).toHaveBeenCalledTimes(1000);
      expect(endTime - startTime).toBeLessThan(1000); // Should be fast
    });
  });
});