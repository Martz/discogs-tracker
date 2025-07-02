import chalk from 'chalk';
import Table from 'cli-table3';
import type { PriceTrend, ReleaseInfo } from '../types/index.js';

export function formatCurrency(amount: number, currency: string = 'GBP'): string {
  const symbol = currency === 'GBP' ? '£' : currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency;
  return `${symbol}${amount.toFixed(2)}`;
}

export function formatPercentage(value: number): string {
  const formatted = `${value > 0 ? '+' : ''}${value.toFixed(2)}%`;
  if (value > 0) {
    return chalk.green(formatted);
  } else if (value < 0) {
    return chalk.red(formatted);
  }
  return chalk.gray(formatted);
}

export function formatTrendArrow(trend: 'up' | 'down' | 'stable'): string {
  switch (trend) {
    case 'up':
      return chalk.green('↑');
    case 'down':
      return chalk.red('↓');
    case 'stable':
      return chalk.gray('→');
  }
}

export function createPriceTrendsTable(trends: PriceTrend[]): string {
  const table = new Table({
    head: ['Artist', 'Title', 'Current Price', 'Previous Price', 'Change', '%', 'Trend'],
    colWidths: [25, 35, 15, 15, 10, 10, 8],
    style: {
      head: ['cyan']
    }
  });

  trends.forEach(trend => {
    table.push([
      trend.release.artist,
      trend.release.title.length > 33 ? trend.release.title.substring(0, 30) + '...' : trend.release.title,
      formatCurrency(trend.current_price),
      formatCurrency(trend.previous_price),
      formatCurrency(trend.price_change),
      formatPercentage(trend.percentage_change),
      formatTrendArrow(trend.trend)
    ]);
  });

  return table.toString();
}

export function createCollectionTable(releases: ReleaseInfo[]): string {
  const table = new Table({
    head: ['ID', 'Artist', 'Title', 'Year', 'Format'],
    colWidths: [10, 25, 35, 8, 15],
    style: {
      head: ['cyan']
    }
  });

  releases.forEach(release => {
    table.push([
      release.id,
      release.artist,
      release.title.length > 33 ? release.title.substring(0, 30) + '...' : release.title,
      release.year || 'N/A',
      release.format
    ]);
  });

  return table.toString();
}

export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

export function formatDateTime(date: Date): string {
  return date.toISOString().replace('T', ' ').substring(0, 19);
}