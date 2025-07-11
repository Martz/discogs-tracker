import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PriceDatabase } from '../../src/db/database.js';
import type { ReleaseInfo } from '../../src/types/index.js';

describe('Format Filtering Tests', () => {
  let db: PriceDatabase;
  
  beforeEach(() => {
    // Use an in-memory database for testing
    db = new PriceDatabase(':memory:');
    
    // Add test data with different formats
    const testReleases: ReleaseInfo[] = [
      {
        id: 1,
        title: 'Test Vinyl Album',
        artist: 'Test Artist',
        year: 2020,
        format: 'Vinyl, LP, Album',
        thumb_url: 'http://test.com/thumb1.jpg',
        added_date: '2023-01-01'
      },
      {
        id: 2,
        title: 'Test CD Album',
        artist: 'Test Artist',
        year: 2021,
        format: 'CD, Album',
        thumb_url: 'http://test.com/thumb2.jpg',
        added_date: '2023-01-02'
      },
      {
        id: 3,
        title: 'Another Vinyl',
        artist: 'Another Artist',
        year: 2022,
        format: 'Vinyl, LP',
        thumb_url: 'http://test.com/thumb3.jpg',
        added_date: '2023-01-03'
      },
      {
        id: 4,
        title: 'Cassette Release',
        artist: 'Retro Artist',
        year: 1990,
        format: 'Cassette',
        thumb_url: 'http://test.com/thumb4.jpg',
        added_date: '2023-01-04'
      }
    ];

    testReleases.forEach(release => {
      db.addOrUpdateRelease(release);
    });

    // Add some price history and collection data for testing trends and demand
    db.addPriceRecord({
      release_id: 1,
      price: 25.00,
      currency: 'USD',
      condition: 'Near Mint (NM or M-)',
      timestamp: '2023-01-01T10:00:00Z',
      listing_count: 5,
      wantsCount: 100
    });

    db.addPriceRecord({
      release_id: 1,
      price: 30.00,
      currency: 'USD',
      condition: 'Near Mint (NM or M-)',
      timestamp: '2023-01-02T10:00:00Z',
      listing_count: 3,
      wantsCount: 120
    });

    db.addPriceRecord({
      release_id: 2,
      price: 15.00,
      currency: 'USD',
      condition: 'Near Mint (NM or M-)',
      timestamp: '2023-01-01T10:00:00Z',
      listing_count: 10,
      wantsCount: 50
    });

    db.addPriceRecord({
      release_id: 2,
      price: 16.50,
      currency: 'USD',
      condition: 'Near Mint (NM or M-)',
      timestamp: '2023-01-02T10:00:00Z',
      listing_count: 8,
      wantsCount: 60
    });

    // Add collection items
    db.addCollectionItem({
      releaseId: 1,
      folderId: 0,
      folderName: 'All',
      instanceId: 1001,
      addedDate: '2023-01-01'
    });

    db.addCollectionItem({
      releaseId: 2,
      folderId: 0,
      folderName: 'All',
      instanceId: 1002,
      addedDate: '2023-01-02'
    });
  });

  afterEach(() => {
    db.close();
  });

  describe('getAllReleases with format filtering', () => {
    it('should return all releases when no format filter is provided', () => {
      const releases = db.getAllReleases();
      expect(releases).toHaveLength(4);
    });

    it('should filter by vinyl format', () => {
      const releases = db.getAllReleases('Vinyl');
      expect(releases).toHaveLength(2);
      expect(releases.every(r => r.format.includes('Vinyl'))).toBe(true);
    });

    it('should filter by CD format', () => {
      const releases = db.getAllReleases('CD');
      expect(releases).toHaveLength(1);
      expect(releases[0].format).toContain('CD');
    });

    it('should filter by cassette format', () => {
      const releases = db.getAllReleases('Cassette');
      expect(releases).toHaveLength(1);
      expect(releases[0].format).toBe('Cassette');
    });

    it('should return empty array for non-existent format', () => {
      const releases = db.getAllReleases('DVD');
      expect(releases).toHaveLength(0);
    });
  });

  describe('getReleasesWithPriceChange with format filtering', () => {
    it('should return price changes for all formats when no filter provided', () => {
      const releases = db.getReleasesWithPriceChange(5);
      expect(releases.length).toBeGreaterThan(0);
    });

    it('should filter price changes by vinyl format', () => {
      const releases = db.getReleasesWithPriceChange(5, 'Vinyl');
      expect(releases).toHaveLength(1);
      expect(releases[0].release.format).toContain('Vinyl');
    });

    it('should filter price changes by CD format', () => {
      const releases = db.getReleasesWithPriceChange(5, 'CD');
      expect(releases).toHaveLength(1);
      expect(releases[0].release.format).toContain('CD');
    });
  });

  describe('getIncreasingValueReleases with format filtering', () => {
    it('should filter increasing value releases by format', () => {
      const releases = db.getIncreasingValueReleases(5, 'Vinyl');
      expect(releases.length).toBeGreaterThan(0);
      releases.forEach(r => {
        expect(r.release.format).toContain('Vinyl');
        expect(r.change_percent).toBeGreaterThan(0);
      });
    });
  });

  describe('getHighDemandReleases with format filtering', () => {
    it('should filter high demand releases by format', () => {
      const releases = db.getHighDemandReleases(50, 'Vinyl');
      expect(releases.length).toBeGreaterThan(0);
      releases.forEach(r => {
        expect(r.release.format).toContain('Vinyl');
        expect(r.wantsCount).toBeGreaterThanOrEqual(50);
      });
    });

    it('should return empty array when format has no high demand releases', () => {
      const releases = db.getHighDemandReleases(200, 'CD');
      expect(releases).toHaveLength(0);
    });
  });

  describe('getOptimalSellCandidates with format filtering', () => {
    it('should filter sell candidates by format', () => {
      const releases = db.getOptimalSellCandidates({
        minWantsCount: 50,
        format: 'Vinyl'
      });
      
      if (releases.length > 0) {
        releases.forEach(r => {
          expect(r.release.format).toContain('Vinyl');
        });
      }
    });

    it('should respect format filtering with other options', () => {
      const releases = db.getOptimalSellCandidates({
        minWantsCount: 100,
        minPriceChange: 10,
        format: 'Vinyl',
        limit: 5
      });
      
      if (releases.length > 0) {
        releases.forEach(r => {
          expect(r.release.format).toContain('Vinyl');
          expect(r.wantsCount).toBeGreaterThanOrEqual(100);
        });
      }
    });
  });
});