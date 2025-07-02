import { Command } from '@commander-js/extra-typings';
import chalk from 'chalk';
import { PriceDatabase } from '../db/database.js';
import { createCollectionTable } from '../utils/formatter.js';

export const listCommand = new Command('list')
  .description('List all releases in your collection')
  .option('-s, --search <query>', 'Search by artist or title')
  .action(async (options) => {
    const db = new PriceDatabase();

    try {
      let releases = db.getAllReleases();
      
      if (options.search) {
        const query = options.search.toLowerCase();
        releases = releases.filter(r => 
          r.artist.toLowerCase().includes(query) || 
          r.title.toLowerCase().includes(query)
        );
      }

      if (releases.length === 0) {
        console.log(chalk.yellow('\nNo releases found\n'));
        return;
      }

      console.log(chalk.cyan(`\nFound ${releases.length} releases:\n`));
      console.log(createCollectionTable(releases));
      console.log();
    } catch (error) {
      console.error(chalk.red(`\nError: ${error}\n`));
      process.exit(1);
    } finally {
      db.close();
    }
  });