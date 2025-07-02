import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PriceDatabase } from '../../src/db/database.js';
import type { ReleaseInfo, PriceRecord } from '../../src/types/index.js';

describe('PriceDatabase', () => {
  let db: PriceDatabase;

  beforeEach(() => {
    db = new PriceDatabase(':memory:');
  });

  afterEach(() => {
    db.close();
  });

  describe('Release Management', () => {
    it('should add and update releases', () => {
      const release: ReleaseInfo = {
        id: 123456,
        title: 'Test Album',
        artist: 'Test Artist',
        year: 2023,
        format: 'Vinyl',
        thumb_url: 'https://example.com/thumb.jpg',
        added_date: '2023-01-01T00:00:00Z'
      };

      db.addOrUpdateRelease(release);
      const retrieved = db.getReleaseInfo(123456);

      expect(retrieved).toEqual(release);
    });

    it('should update existing release', () => {
      const release: ReleaseInfo = {
        id: 123456,
        title: 'Test Album',
        artist: 'Test Artist',
        year: 2023,
        format: 'Vinyl',
        thumb_url: 'https://example.com/thumb.jpg',
        added_date: '2023-01-01T00:00:00Z'
      };

      db.addOrUpdateRelease(release);

      const updatedRelease = { ...release, title: 'Updated Album' };
      db.addOrUpdateRelease(updatedRelease);

      const retrieved = db.getReleaseInfo(123456);
      expect(retrieved?.title).toBe('Updated Album');
    });

    it('should return null for non-existent release', () => {
      const retrieved = db.getReleaseInfo(999999);
      expect(retrieved).toBeNull();
    });
  });

  describe('Price History', () => {
    beforeEach(() => {
      const release: ReleaseInfo = {
        id: 123456,
        title: 'Test Album',
        artist: 'Test Artist',
        year: 2023,
        format: 'Vinyl',
        thumb_url: 'https://example.com/thumb.jpg',
        added_date: '2023-01-01T00:00:00Z'
      };
      db.addOrUpdateRelease(release);
    });

    it('should add price records', () => {
      const priceRecord: PriceRecord = {
        release_id: 123456,
        price: 25.99,
        currency: 'GBP',
        condition: 'Very Good Plus (VG+)',
        timestamp: '2023-01-01T12:00:00Z',
        listing_count: 5,
        wantsCount: 42
      };

      db.addPriceRecord(priceRecord);
      const latest = db.getLatestPrice(123456);

      expect(latest).toMatchObject({
        release_id: 123456,
        price: 25.99,
        currency: 'GBP',
        condition: 'Very Good Plus (VG+)',
        listing_count: 5,
        wants_count: 42
      });
    });

    it('should get price history within date range', () => {
      const prices = [
        {
          release_id: 123456,
          price: 20.00,
          currency: 'GBP',
          condition: 'Good',
          timestamp: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
          listing_count: 3,
          wantsCount: 30
        },
        {
          release_id: 123456,
          price: 25.99,
          currency: 'GBP',
          condition: 'Very Good Plus (VG+)',
          timestamp: new Date().toISOString(),
          listing_count: 5,
          wantsCount: 42
        }
      ];

      prices.forEach(price => db.addPriceRecord(price));

      const history = db.getPriceHistory(123456, 30);
      expect(history).toHaveLength(2);
      expect(history[0].price).toBe(20.00);
      expect(history[1].price).toBe(25.99);
    });

    it('should return empty array for no price history', () => {
      const history = db.getPriceHistory(999999, 30);
      expect(history).toHaveLength(0);
    });
  });

  describe('Collection Items', () => {
    beforeEach(() => {
      const release: ReleaseInfo = {
        id: 123456,
        title: 'Test Album',
        artist: 'Test Artist',
        year: 2023,
        format: 'Vinyl',
        thumb_url: 'https://example.com/thumb.jpg',
        added_date: '2023-01-01T00:00:00Z'
      };
      db.addOrUpdateRelease(release);
    });

    it('should add collection items', () => {
      db.addCollectionItem({
        releaseId: 123456,
        folderId: 0,
        folderName: 'All',
        instanceId: 1001,
        addedDate: '2023-01-01T00:00:00Z'
      });

      const folders = db.getCollectionFolders();
      expect(folders).toHaveLength(1);
      expect(folders[0]).toMatchObject({
        folderId: 0,
        folderName: 'All',
        count: 1
      });
    });

    it('should handle multiple folders', () => {
      db.addCollectionItem({
        releaseId: 123456,
        folderId: 0,
        folderName: 'All',
        instanceId: 1001,
        addedDate: '2023-01-01T00:00:00Z'
      });

      db.addCollectionItem({
        releaseId: 123456,
        folderId: 1,
        folderName: 'Favourites',
        instanceId: 1002,
        addedDate: '2023-01-01T00:00:00Z'
      });

      const folders = db.getCollectionFolders();
      expect(folders).toHaveLength(2);
    });
  });

  describe('Wants Management', () => {
    beforeEach(() => {
      const release: ReleaseInfo = {
        id: 123456,
        title: 'Test Album',
        artist: 'Test Artist',
        year: 2023,
        format: 'Vinyl',
        thumb_url: 'https://example.com/thumb.jpg',
        added_date: '2023-01-01T00:00:00Z'
      };
      db.addOrUpdateRelease(release);
    });

    it('should add want items', () => {
      db.addWantItem({
        releaseId: 123456,
        addedDate: '2023-01-01T00:00:00Z',
        notes: 'Really want this one!'
      });

      const wantsCount = db.getWantsCount();
      expect(wantsCount).toBe(1);
    });

    it('should count multiple wants', () => {
      const releases = [123456, 789012, 345678];
      
      releases.forEach(id => {
        const release: ReleaseInfo = {
          id,
          title: `Album ${id}`,
          artist: 'Test Artist',
          year: 2023,
          format: 'Vinyl',
          thumb_url: 'https://example.com/thumb.jpg',
          added_date: '2023-01-01T00:00:00Z'
        };
        db.addOrUpdateRelease(release);
        
        db.addWantItem({
          releaseId: id,
          addedDate: '2023-01-01T00:00:00Z'
        });
      });

      const wantsCount = db.getWantsCount();
      expect(wantsCount).toBe(3);
    });
  });

  describe('Price Trends Analysis', () => {
    beforeEach(() => {
      // Add test releases
      const releases = [
        { id: 1, title: 'Rising Album', artist: 'Artist A' },
        { id: 2, title: 'Falling Album', artist: 'Artist B' },
        { id: 3, title: 'Stable Album', artist: 'Artist C' }
      ];

      releases.forEach(release => {
        db.addOrUpdateRelease({
          ...release,
          year: 2023,
          format: 'Vinyl',
          thumb_url: 'https://example.com/thumb.jpg',
          added_date: '2023-01-01T00:00:00Z'
        });

        db.addCollectionItem({
          releaseId: release.id,
          folderId: 0,
          folderName: 'All',
          instanceId: 1000 + release.id,
          addedDate: '2023-01-01T00:00:00Z'
        });
      });

      // Add price history to simulate trends
      const baseTime = Date.now() - 2 * 24 * 60 * 60 * 1000; // 2 days ago

      // Rising prices
      db.addPriceRecord({
        release_id: 1,
        price: 20.00,
        currency: 'GBP',
        condition: 'VG+',
        timestamp: new Date(baseTime).toISOString(),
        listing_count: 5,
        wantsCount: 100
      });
      db.addPriceRecord({
        release_id: 1,
        price: 30.00,
        currency: 'GBP',
        condition: 'VG+',
        timestamp: new Date().toISOString(),
        listing_count: 3,
        wantsCount: 150
      });

      // Falling prices
      db.addPriceRecord({
        release_id: 2,
        price: 50.00,
        currency: 'GBP',
        condition: 'VG+',
        timestamp: new Date(baseTime).toISOString(),
        listing_count: 8,
        wantsCount: 75
      });
      db.addPriceRecord({
        release_id: 2,
        price: 40.00,
        currency: 'GBP',
        condition: 'VG+',
        timestamp: new Date().toISOString(),
        listing_count: 12,
        wantsCount: 60
      });
    });

    it('should identify records with price changes', () => {
      const changes = db.getReleasesWithPriceChange(10);
      expect(changes.length).toBeGreaterThan(0);
      
      const risingRecord = changes.find(r => r.release.id === 1);
      expect(risingRecord).toBeDefined();
      expect(risingRecord?.change_percent).toBeGreaterThan(0);
    });

    it('should identify increasing value records', () => {
      const increasing = db.getIncreasingValueReleases(10);
      expect(increasing.length).toBeGreaterThan(0);
      
      const risingRecord = increasing.find(r => r.release.id === 1);
      expect(risingRecord).toBeDefined();
      expect(risingRecord?.change_percent).toBeGreaterThan(0);
    });

    it('should calculate high demand releases', () => {
      const highDemand = db.getHighDemandReleases(50);
      expect(highDemand.length).toBeGreaterThan(0);
      
      // Should include releases with wants count >= 50
      const demandRecord = highDemand.find(r => r.release.id === 1);
      expect(demandRecord).toBeDefined();
      expect(demandRecord?.wantsCount).toBeGreaterThanOrEqual(50);
    });

    it('should calculate optimal sell candidates', () => {
      const sellCandidates = db.getOptimalSellCandidates({
        minWantsCount: 50,
        minPriceChange: 0,
        limit: 10
      });

      expect(sellCandidates.length).toBeGreaterThan(0);
      
      // Should be sorted by sell score
      for (let i = 1; i < sellCandidates.length; i++) {
        expect(sellCandidates[i-1].sellScore).toBeGreaterThanOrEqual(sellCandidates[i].sellScore);
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty database gracefully', () => {
      expect(db.getAllReleases()).toHaveLength(0);
      expect(db.getWantsCount()).toBe(0);
      expect(db.getCollectionFolders()).toHaveLength(0);
      expect(db.getLatestPrice(123456)).toBeNull();
    });

    it('should handle zero prices and wants counts', () => {
      const release: ReleaseInfo = {
        id: 123456,
        title: 'Free Album',
        artist: 'Test Artist',
        year: 2023,
        format: 'Digital',
        thumb_url: 'https://example.com/thumb.jpg',
        added_date: '2023-01-01T00:00:00Z'
      };

      db.addOrUpdateRelease(release);
      db.addPriceRecord({
        release_id: 123456,
        price: 0,
        currency: 'GBP',
        condition: 'Free',
        timestamp: new Date().toISOString(),
        listing_count: 1,
        wantsCount: 0
      });

      const latest = db.getLatestPrice(123456);
      expect(latest?.price).toBe(0);
      expect(latest?.wants_count).toBe(0);
    });
  });
});