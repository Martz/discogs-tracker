import { Command } from '@commander-js/extra-typings';
import chalk from 'chalk';
import { PriceDatabase } from '../db/database.js';
import { createCollectionTable } from '../utils/formatter.js';

export const listCommand = new Command('list')
  .description('List all releases in your collection')
  .option('-s, --search <query>', 'Search by artist or title')
  .option('-f, --format <format>', 'Filter by format (e.g., "Vinyl", "CD")')
  .option('--vinyl', 'Show only vinyl records')
  .option('--cd', 'Show only CD releases')
  .action(async (options) => {
    const db = new PriceDatabase();

    try {
      // Determine format filter
      let formatFilter: string | undefined;
      if (options.vinyl) {
        formatFilter = 'Vinyl';
      } else if (options.cd) {
        formatFilter = 'CD';
      } else if (options.format) {
        formatFilter = options.format;
      }

      let releases = db.getAllReleases(formatFilter);
      
      if (options.search) {
        const query = options.search.toLowerCase();
        releases = releases.filter(r => 
          r.artist.toLowerCase().includes(query) || 
          r.title.toLowerCase().includes(query)
        );
      }

      if (releases.length === 0) {
        const filterDesc = formatFilter ? ` matching format "${formatFilter}"` : '';
        console.log(chalk.yellow(`\nNo releases found${filterDesc}\n`));
        return;
      }

      const formatDesc = formatFilter ? ` (${formatFilter})` : '';
      console.log(chalk.cyan(`\nFound ${releases.length} releases${formatDesc}:\n`));
      console.log(createCollectionTable(releases));
      console.log();
    } catch (error) {
      console.error(chalk.red(`\nError: ${error}\n`));
      process.exit(1);
    } finally {
      db.close();
    }
  });