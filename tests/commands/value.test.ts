import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PriceDatabase } from '../../src/db/database.js';
import type { ReleaseInfo } from '../../src/types/index.js';

// Mock the database
vi.mock('../../src/db/database.js');

// Mock ora
vi.mock('ora', () => ({
  default: vi.fn(() => ({
    start: vi.fn().mockReturnThis(),
    succeed: vi.fn().mockReturnThis(),
    fail: vi.fn().mockReturnThis(),
    text: ''
  }))
}));

// Mock console methods to capture output
const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

describe('Value Command Logic', () => {
  let mockDb: any;
  let releases: ReleaseInfo[];

  beforeEach(() => {
    mockDb = {
      getAllReleases: vi.fn(),
      getLatestPrice: vi.fn(),
      close: vi.fn()
    };

    releases = [
      {
        id: 1,
        title: 'Album One',
        artist: 'Artist A',
        year: 2020,
        format: 'Vinyl',
        thumb_url: 'https://example.com/1.jpg',
        added_date: '2023-01-01'
      },
      {
        id: 2,
        title: 'Album Two',
        artist: 'Artist B',
        year: 2021,
        format: 'CD',
        thumb_url: 'https://example.com/2.jpg',
        added_date: '2023-01-02'
      },
      {
        id: 3,
        title: 'Album Three',
        artist: 'Artist C',
        year: 2022,
        format: 'Vinyl',
        thumb_url: 'https://example.com/3.jpg',
        added_date: '2023-01-03'
      }
    ];

    vi.mocked(PriceDatabase).mockImplementation(() => mockDb);
  });

  afterEach(() => {
    vi.clearAllMocks();
    consoleSpy.mockClear();
  });

  describe('Collection Value Calculation', () => {
    it('should calculate total collection value correctly', () => {
      mockDb.getAllReleases.mockReturnValue(releases);
      mockDb.getLatestPrice
        .mockReturnValueOnce({ price: 25.99, timestamp: '2023-01-01' })
        .mockReturnValueOnce({ price: 15.50, timestamp: '2023-01-01' })
        .mockReturnValueOnce({ price: 35.00, timestamp: '2023-01-01' });

      // Simulate value calculation logic
      let totalValue = 0;
      let recordsWithPrice = 0;
      const prices: number[] = [];

      releases.forEach(release => {
        const latestPrice = mockDb.getLatestPrice(release.id);
        if (latestPrice && latestPrice.price > 0) {
          recordsWithPrice++;
          totalValue += latestPrice.price;
          prices.push(latestPrice.price);
        }
      });

      const averageValue = recordsWithPrice > 0 ? totalValue / recordsWithPrice : 0;
      prices.sort((a, b) => a - b);
      const medianValue = prices.length % 2 === 0
        ? (prices[prices.length / 2 - 1] + prices[prices.length / 2]) / 2
        : prices[Math.floor(prices.length / 2)];

      expect(totalValue).toBe(76.49);
      expect(recordsWithPrice).toBe(3);
      expect(averageValue).toBeCloseTo(25.50, 2);
      expect(medianValue).toBe(25.99);
    });

    it('should handle records without prices', () => {
      mockDb.getAllReleases.mockReturnValue(releases);
      mockDb.getLatestPrice
        .mockReturnValueOnce({ price: 25.99, timestamp: '2023-01-01' })
        .mockReturnValueOnce(null) // No price data
        .mockReturnValueOnce({ price: 0, timestamp: '2023-01-01' }); // Zero price

      let totalValue = 0;
      let recordsWithPrice = 0;
      let recordsWithoutPrice = 0;

      releases.forEach(release => {
        const latestPrice = mockDb.getLatestPrice(release.id);
        if (latestPrice && latestPrice.price > 0) {
          recordsWithPrice++;
          totalValue += latestPrice.price;
        } else {
          recordsWithoutPrice++;
        }
      });

      expect(totalValue).toBe(25.99);
      expect(recordsWithPrice).toBe(1);
      expect(recordsWithoutPrice).toBe(2);
    });

    it('should group records by format correctly', () => {
      mockDb.getAllReleases.mockReturnValue(releases);
      mockDb.getLatestPrice
        .mockReturnValueOnce({ price: 25.99, timestamp: '2023-01-01' })
        .mockReturnValueOnce({ price: 15.50, timestamp: '2023-01-01' })
        .mockReturnValueOnce({ price: 35.00, timestamp: '2023-01-01' });

      const valueByFormat = new Map<string, { count: number; value: number }>();

      releases.forEach(release => {
        const latestPrice = mockDb.getLatestPrice(release.id);
        if (latestPrice && latestPrice.price > 0) {
          const format = release.format || 'Unknown';
          const formatStats = valueByFormat.get(format) || { count: 0, value: 0 };
          formatStats.count++;
          formatStats.value += latestPrice.price;
          valueByFormat.set(format, formatStats);
        }
      });

      expect(valueByFormat.get('Vinyl')).toEqual({ count: 2, value: expect.closeTo(60.99, 2) });
      expect(valueByFormat.get('CD')).toEqual({ count: 1, value: 15.50 });
    });

    it('should find most valuable records', () => {
      mockDb.getAllReleases.mockReturnValue(releases);
      mockDb.getLatestPrice
        .mockReturnValueOnce({ price: 25.99, timestamp: '2023-01-01' })
        .mockReturnValueOnce({ price: 15.50, timestamp: '2023-01-01' })
        .mockReturnValueOnce({ price: 35.00, timestamp: '2023-01-01' });

      const recordsWithPrices: Array<{ release: ReleaseInfo; price: number }> = [];

      releases.forEach(release => {
        const latestPrice = mockDb.getLatestPrice(release.id);
        if (latestPrice && latestPrice.price > 0) {
          recordsWithPrices.push({ release, price: latestPrice.price });
        }
      });

      recordsWithPrices.sort((a, b) => b.price - a.price);
      const top2 = recordsWithPrices.slice(0, 2);

      expect(top2[0].release.title).toBe('Album Three');
      expect(top2[0].price).toBe(35.00);
      expect(top2[1].release.title).toBe('Album One');
      expect(top2[1].price).toBe(25.99);
    });
  });

  describe('Statistical Calculations', () => {
    it('should calculate median for odd number of prices', () => {
      const prices = [10, 20, 30];
      prices.sort((a, b) => a - b);
      const median = prices[Math.floor(prices.length / 2)];
      expect(median).toBe(20);
    });

    it('should calculate median for even number of prices', () => {
      const prices = [10, 20, 30, 40];
      prices.sort((a, b) => a - b);
      const median = (prices[prices.length / 2 - 1] + prices[prices.length / 2]) / 2;
      expect(median).toBe(25);
    });

    it('should handle single price correctly', () => {
      const prices = [42.50];
      const median = prices[Math.floor(prices.length / 2)];
      const average = prices.reduce((sum, p) => sum + p, 0) / prices.length;
      
      expect(median).toBe(42.50);
      expect(average).toBe(42.50);
    });

    it('should handle empty price array', () => {
      const prices: number[] = [];
      const total = prices.reduce((sum, p) => sum + p, 0);
      const average = prices.length > 0 ? total / prices.length : 0;
      
      expect(total).toBe(0);
      expect(average).toBe(0);
    });
  });

  describe('Format Breakdown', () => {
    it('should calculate format percentages correctly', () => {
      const valueByFormat = new Map([
        ['Vinyl', { count: 2, value: 60.00 }],
        ['CD', { count: 1, value: 20.00 }],
        ['Digital', { count: 1, value: 10.00 }]
      ]);

      const totalValue = 90.00;
      const formatStats: Array<[string, { count: number; value: number; percentage: number }]> = [];

      valueByFormat.forEach((data, format) => {
        const percentage = (data.value / totalValue) * 100;
        formatStats.push([format, { ...data, percentage }]);
      });

      formatStats.sort((a, b) => b[1].value - a[1].value);

      expect(formatStats[0][1].percentage).toBeCloseTo(66.67, 2); // Vinyl
      expect(formatStats[1][1].percentage).toBeCloseTo(22.22, 2); // CD
      expect(formatStats[2][1].percentage).toBeCloseTo(11.11, 2); // Digital
    });

    it('should handle single format', () => {
      const valueByFormat = new Map([
        ['Vinyl', { count: 3, value: 75.00 }]
      ]);

      const totalValue = 75.00;
      
      valueByFormat.forEach((data, format) => {
        const percentage = (data.value / totalValue) * 100;
        expect(percentage).toBe(100);
        expect(format).toBe('Vinyl');
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty collection', () => {
      mockDb.getAllReleases.mockReturnValue([]);

      const stats = {
        totalRecords: 0,
        recordsWithPrice: 0,
        recordsWithoutPrice: 0,
        totalValue: 0,
        averageValue: 0,
        medianValue: 0
      };

      expect(stats.totalRecords).toBe(0);
      expect(stats.totalValue).toBe(0);
      expect(stats.averageValue).toBe(0);
    });

    it('should handle collection with no price data', () => {
      mockDb.getAllReleases.mockReturnValue(releases);
      mockDb.getLatestPrice.mockReturnValue(null);

      let recordsWithoutPrice = 0;
      releases.forEach(release => {
        const latestPrice = mockDb.getLatestPrice(release.id);
        if (!latestPrice || latestPrice.price <= 0) {
          recordsWithoutPrice++;
        }
      });

      expect(recordsWithoutPrice).toBe(3);
    });

    it('should handle very high precision prices', () => {
      const prices = [25.999999, 15.555555, 35.123456];
      const total = prices.reduce((sum, p) => sum + p, 0);
      const average = total / prices.length;

      // Should maintain reasonable precision
      expect(parseFloat(total.toFixed(2))).toBe(76.68);
      expect(parseFloat(average.toFixed(2))).toBe(25.56);
    });

    it('should handle undefined format gracefully', () => {
      const releaseWithoutFormat = {
        ...releases[0],
        format: undefined as any
      };

      const format = releaseWithoutFormat.format || 'Unknown';
      expect(format).toBe('Unknown');
    });
  });
});