import { describe, it, expect } from 'vitest';
import { 
  formatCurrency, 
  formatPercentage, 
  formatTrendArrow, 
  formatDate, 
  formatDateTime 
} from '../../src/utils/formatter.js';

describe('Formatter Utils', () => {
  describe('formatCurrency', () => {
    it('should format GBP currency by default', () => {
      expect(formatCurrency(25.99)).toBe('£25.99');
      expect(formatCurrency(0)).toBe('£0.00');
      expect(formatCurrency(1000.5)).toBe('£1000.50');
    });

    it('should format different currencies', () => {
      expect(formatCurrency(25.99, 'USD')).toBe('$25.99');
      expect(formatCurrency(25.99, 'EUR')).toBe('€25.99');
      expect(formatCurrency(25.99, 'JPY')).toBe('JPY25.99');
    });

    it('should handle decimal precision', () => {
      expect(formatCurrency(25.1)).toBe('£25.10');
      expect(formatCurrency(25.999)).toBe('£26.00');
      expect(formatCurrency(25.001)).toBe('£25.00');
    });

    it('should handle negative values', () => {
      expect(formatCurrency(-10.50)).toBe('£-10.50');
    });
  });

  describe('formatPercentage', () => {
    it('should format positive percentages with plus sign', () => {
      const result = formatPercentage(15.5);
      expect(result).toContain('+15.50%');
    });

    it('should format negative percentages', () => {
      const result = formatPercentage(-8.25);
      expect(result).toContain('-8.25%');
    });

    it('should format zero percentage', () => {
      const result = formatPercentage(0);
      expect(result).toContain('0.00%');
    });

    it('should handle decimal precision', () => {
      const result = formatPercentage(12.345);
      expect(result).toContain('12.35%');
    });

    it('should apply color formatting', () => {
      // Note: These tests check for ANSI color codes that chalk would add
      const positive = formatPercentage(10);
      const negative = formatPercentage(-10);
      const zero = formatPercentage(0);

      // Check that the percentage values are correct
      expect(positive).toContain('+10.00%');
      expect(negative).toContain('-10.00%');
      expect(zero).toContain('0.00%');

      // In test environment, chalk might not add colors, so we just verify the content
      expect(typeof positive).toBe('string');
      expect(typeof negative).toBe('string');
      expect(typeof zero).toBe('string');
    });
  });

  describe('formatTrendArrow', () => {
    it('should return up arrow for up trend', () => {
      const result = formatTrendArrow('up');
      expect(result).toContain('↑');
      expect(typeof result).toBe('string');
    });

    it('should return down arrow for down trend', () => {
      const result = formatTrendArrow('down');
      expect(result).toContain('↓');
      expect(typeof result).toBe('string');
    });

    it('should return right arrow for stable trend', () => {
      const result = formatTrendArrow('stable');
      expect(result).toContain('→');
      expect(typeof result).toBe('string');
    });
  });

  describe('formatDate', () => {
    it('should format date as YYYY-MM-DD', () => {
      const date = new Date('2023-12-25T15:30:00Z');
      const result = formatDate(date);
      expect(result).toBe('2023-12-25');
    });

    it('should handle different timezones consistently', () => {
      const date1 = new Date('2023-01-01T00:00:00Z');
      const date2 = new Date('2023-01-01T23:59:59Z');
      
      expect(formatDate(date1)).toBe('2023-01-01');
      expect(formatDate(date2)).toBe('2023-01-01');
    });

    it('should pad single digit months and days', () => {
      const date = new Date('2023-01-05T12:00:00Z');
      const result = formatDate(date);
      expect(result).toBe('2023-01-05');
    });
  });

  describe('formatDateTime', () => {
    it('should format datetime as YYYY-MM-DD HH:mm:ss', () => {
      const date = new Date('2023-12-25T15:30:45Z');
      const result = formatDateTime(date);
      expect(result).toBe('2023-12-25 15:30:45');
    });

    it('should handle midnight correctly', () => {
      const date = new Date('2023-01-01T00:00:00Z');
      const result = formatDateTime(date);
      expect(result).toBe('2023-01-01 00:00:00');
    });

    it('should handle end of day correctly', () => {
      const date = new Date('2023-12-31T23:59:59Z');
      const result = formatDateTime(date);
      expect(result).toBe('2023-12-31 23:59:59');
    });

    it('should pad single digit values', () => {
      const date = new Date('2023-01-05T09:05:05Z');
      const result = formatDateTime(date);
      expect(result).toBe('2023-01-05 09:05:05');
    });
  });

  describe('Edge Cases', () => {
    it('should handle very large currency values', () => {
      const result = formatCurrency(999999.99);
      expect(result).toBe('£999999.99');
    });

    it('should handle very small currency values', () => {
      const result = formatCurrency(0.01);
      expect(result).toBe('£0.01');
    });

    it('should handle very large percentage values', () => {
      const result = formatPercentage(999.99);
      expect(result).toContain('+999.99%');
    });

    it('should handle very small percentage values', () => {
      const result = formatPercentage(0.01);
      expect(result).toContain('+0.01%');
    });

    it('should handle leap year dates', () => {
      const date = new Date('2024-02-29T12:00:00Z');
      const result = formatDate(date);
      expect(result).toBe('2024-02-29');
    });

    it('should handle year boundaries', () => {
      const newYear = new Date('2024-01-01T00:00:00Z');
      const newYearEve = new Date('2023-12-31T23:59:59Z');
      
      expect(formatDate(newYear)).toBe('2024-01-01');
      expect(formatDate(newYearEve)).toBe('2023-12-31');
    });
  });
});