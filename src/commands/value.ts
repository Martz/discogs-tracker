import { Command } from '@commander-js/extra-typings';
import chalk from 'chalk';
import ora from 'ora';
import { PriceDatabase } from '../db/database.js';
import { formatCurrency } from '../utils/formatter.js';

interface CollectionStats {
  totalRecords: number;
  recordsWithPrice: number;
  recordsWithoutPrice: number;
  totalValue: number;
  averageValue: number;
  medianValue: number;
  mostValuable: Array<{
    release: any;
    price: number;
  }>;
  valueByFormat: Map<string, { count: number; value: number }>;
}

export const valueCommand = new Command('value')
  .description('Show your collection value and statistics')
  .option('-t, --top <number>', 'Show top N most valuable records', parseFloat, 10)
  .option('-f, --format', 'Show value breakdown by format')
  .action(async (options) => {
    const db = new PriceDatabase();
    const spinner = ora('Calculating collection value...').start();

    try {
      const releases = db.getAllReleases();
      const stats: CollectionStats = {
        totalRecords: releases.length,
        recordsWithPrice: 0,
        recordsWithoutPrice: 0,
        totalValue: 0,
        averageValue: 0,
        medianValue: 0,
        mostValuable: [],
        valueByFormat: new Map()
      };

      const prices: number[] = [];
      const recordsWithPrices: Array<{ release: any; price: number }> = [];

      for (const release of releases) {
        const latestPrice = db.getLatestPrice(release.id);
        
        if (latestPrice && latestPrice.price > 0) {
          stats.recordsWithPrice++;
          stats.totalValue += latestPrice.price;
          prices.push(latestPrice.price);
          recordsWithPrices.push({ release, price: latestPrice.price });

          // Track by format
          const format = release.format || 'Unknown';
          const formatStats = stats.valueByFormat.get(format) || { count: 0, value: 0 };
          formatStats.count++;
          formatStats.value += latestPrice.price;
          stats.valueByFormat.set(format, formatStats);
        } else {
          stats.recordsWithoutPrice++;
        }
      }

      // Calculate statistics
      if (prices.length > 0) {
        stats.averageValue = stats.totalValue / prices.length;
        prices.sort((a, b) => a - b);
        stats.medianValue = prices.length % 2 === 0
          ? (prices[prices.length / 2 - 1] + prices[prices.length / 2]) / 2
          : prices[Math.floor(prices.length / 2)];
      }

      // Find most valuable
      recordsWithPrices.sort((a, b) => b.price - a.price);
      stats.mostValuable = recordsWithPrices.slice(0, options.top);

      spinner.succeed('Collection value calculated');

      // Display results
      console.log(chalk.cyan('\n📊 Collection Value Summary\n'));
      console.log(`Total Records: ${chalk.bold(stats.totalRecords)}`);
      console.log(`Records with prices: ${chalk.green(stats.recordsWithPrice)} (${((stats.recordsWithPrice / stats.totalRecords) * 100).toFixed(1)}%)`);
      console.log(`Records without prices: ${chalk.yellow(stats.recordsWithoutPrice)}`);
      console.log();
      console.log(`Total Value: ${chalk.bold.green(formatCurrency(stats.totalValue))}`);
      console.log(`Average Value: ${formatCurrency(stats.averageValue)}`);
      console.log(`Median Value: ${formatCurrency(stats.medianValue)}`);

      if (options.format && stats.valueByFormat.size > 0) {
        console.log(chalk.cyan('\n💿 Value by Format\n'));
        const sortedFormats = Array.from(stats.valueByFormat.entries())
          .sort((a, b) => b[1].value - a[1].value);
        
        for (const [format, data] of sortedFormats) {
          const percentage = ((data.value / stats.totalValue) * 100).toFixed(1);
          console.log(`${format.padEnd(20)} ${data.count.toString().padStart(4)} records   ${formatCurrency(data.value).padStart(10)}  (${percentage}%)`);
        }
      }

      if (stats.mostValuable.length > 0) {
        console.log(chalk.cyan(`\n💎 Top ${options.top} Most Valuable Records\n`));
        stats.mostValuable.forEach((item, index) => {
          console.log(`${(index + 1).toString().padStart(2)}. ${formatCurrency(item.price).padStart(10)} - ${item.release.artist} - ${item.release.title}`);
        });
      }

      console.log();
    } catch (error) {
      spinner.fail('Failed to calculate collection value');
      console.error(chalk.red(`\nError: ${error}\n`));
      process.exit(1);
    } finally {
      db.close();
    }
  });