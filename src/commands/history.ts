import { Command } from '@commander-js/extra-typings';
import chalk from 'chalk';
import Table from 'cli-table3';
import { PriceDatabase } from '../db/database.js';
import { formatCurrency, formatDateTime } from '../utils/formatter.js';

export const historyCommand = new Command('history')
  .description('Show price history for a specific release')
  .argument('<releaseId>', 'Discogs release ID')
  .option('-d, --days <number>', 'Number of days to show', parseFloat, 30)
  .action(async (releaseId, options) => {
    const db = new PriceDatabase();
    const id = parseInt(releaseId);

    if (isNaN(id)) {
      console.error(chalk.red('\nInvalid release ID\n'));
      process.exit(1);
    }

    try {
      const release = db.getReleaseInfo(id);
      if (!release) {
        console.error(chalk.red('\nRelease not found in your collection\n'));
        process.exit(1);
      }

      const history = db.getPriceHistory(id, options.days);
      if (history.length === 0) {
        console.log(chalk.yellow('\nNo price history found for this release\n'));
        return;
      }

      console.log(chalk.cyan(`\nPrice History for: ${release.artist} - ${release.title}\n`));

      const table = new Table({
        head: ['Date', 'Price', 'Condition', 'Listings'],
        colWidths: [25, 15, 20, 10],
        style: {
          head: ['cyan']
        }
      });

      history.forEach(record => {
        table.push([
          formatDateTime(new Date(record.timestamp)),
          formatCurrency(record.price, record.currency),
          record.condition,
          record.listing_count
        ]);
      });

      console.log(table.toString());

      if (history.length >= 2) {
        const firstPrice = history[0].price;
        const lastPrice = history[history.length - 1].price;
        const change = lastPrice - firstPrice;
        const changePercent = (change / firstPrice) * 100;

        console.log(`\nPrice change over ${options.days} days: ${formatCurrency(change)} (${changePercent > 0 ? '+' : ''}${changePercent.toFixed(2)}%)\n`);
      }
    } catch (error) {
      console.error(chalk.red(`\nError: ${error}\n`));
      process.exit(1);
    } finally {
      db.close();
    }
  });