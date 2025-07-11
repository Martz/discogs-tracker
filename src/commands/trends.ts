import { Command } from '@commander-js/extra-typings';
import chalk from 'chalk';
import { PriceDatabase } from '../db/database.js';
import { getTrackingConfig } from '../utils/config.js';
import { createPriceTrendsTable, formatCurrency } from '../utils/formatter.js';
import type { PriceTrend } from '../types/index.js';

export const trendsCommand = new Command('trends')
  .description('Show records with increasing prices')
  .option('-m, --min-change <percent>', 'Minimum price change percentage', parseFloat)
  .option('-a, --all', 'Show all price changes (including decreases)')
  .action(async (options) => {
    const db = new PriceDatabase();
    const { minPriceChangePercent } = getTrackingConfig();
    const minChange = options.minChange || minPriceChangePercent;

    try {
      const releases = options.all 
        ? db.getReleasesWithPriceChange(minChange)
        : db.getIncreasingValueReleases(minChange);

      if (releases.length === 0) {
        console.log(chalk.yellow(`\nNo releases found with price change >= ${minChange}%\n`));
        return;
      }

      const trends: PriceTrend[] = releases.map(r => {
        const priceHistory = db.getPriceHistory(r.release.id, 30);
        const priceChange = r.current_price - r.previous_price;
        
        return {
          release: r.release,
          current_price: r.current_price,
          previous_price: r.previous_price,
          price_change: priceChange,
          percentage_change: r.change_percent,
          trend: priceChange > 0 ? 'up' : priceChange < 0 ? 'down' : 'stable',
          price_history: priceHistory
        };
      });

      console.log(chalk.cyan(`\n${options.all ? 'All Price Changes' : 'Increasing Value Records'} (>= ${minChange}% change):\n`));
      console.log(createPriceTrendsTable(trends));

      const totalPotentialProfit = trends
        .filter(t => t.trend === 'up')
        .reduce((sum, t) => sum + t.price_change, 0);
      
      if (totalPotentialProfit > 0) {
        console.log(chalk.green(`\nTotal potential profit: ${formatCurrency(totalPotentialProfit)}\n`));
      }
    } catch (error) {
      console.error(chalk.red(`\nError: ${error}\n`));
      process.exit(1);
    } finally {
      db.close();
    }
  });