import { Command } from '@commander-js/extra-typings';
import ora from 'ora';
import chalk from 'chalk';
import { DiscogsService } from '../services/discogs.js';
import { PriceDatabase } from '../db/database.js';
import { getDiscogsCredentials, isConfigured } from '../utils/config.js';
import { formatDateTime } from '../utils/formatter.js';
import type { ReleaseInfo } from '../types/index.js';

export const syncCommand = new Command('sync')
  .description('Sync your Discogs collection and fetch current prices')
  .option('-f, --force', 'Force price update even if recently checked')
  .action(async (options) => {
    if (!isConfigured()) {
      console.error(chalk.red('\n✗ Please configure your credentials first using: discogs-tracker config\n'));
      process.exit(1);
    }

    const { token, username } = getDiscogsCredentials();
    const discogs = new DiscogsService(token, username);
    const db = new PriceDatabase();
    
    const spinner = ora('Fetching collection from Discogs...').start();

    try {
      const collection = await discogs.getCollection();
      spinner.succeed(`Found ${collection.length} releases in collection`);

      spinner.start('Updating release information...');
      for (const item of collection) {
        const releaseInfo: ReleaseInfo = {
          id: item.id,
          title: item.basic_information.title,
          artist: item.basic_information.artists[0].name,
          year: item.basic_information.year,
          format: item.basic_information.formats[0].name,
          thumb_url: item.basic_information.thumb,
          added_date: item.date_added
        };
        
        db.addOrUpdateRelease(releaseInfo);
      }
      spinner.succeed('Release information updated');

      spinner.start('Fetching current marketplace prices...');
      let processed = 0;
      let errors = 0;
      
      for (const item of collection) {
        try {
          const latestPrice = db.getLatestPrice(item.id);
          const hoursSinceLastCheck = latestPrice 
            ? (Date.now() - new Date(latestPrice.timestamp).getTime()) / (1000 * 60 * 60)
            : Infinity;

          if (!options.force && hoursSinceLastCheck < 24) {
            processed++;
            continue;
          }

          const priceData = await discogs.getLowestMarketplacePrice(item.id);
          
          if (priceData) {
            db.addPriceRecord({
              release_id: item.id,
              price: priceData.price,
              currency: priceData.currency,
              condition: priceData.condition,
              timestamp: new Date().toISOString(),
              listing_count: priceData.listingCount
            });
          }
          
          processed++;
          spinner.text = `Fetching prices... ${processed}/${collection.length}`;
          
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
          errors++;
          console.error(chalk.red(`\nError processing ${item.basic_information.title}: ${error}`));
        }
      }

      spinner.succeed(`Price sync complete. Processed: ${processed}, Errors: ${errors}`);
      
      console.log(chalk.green(`\n✓ Sync completed at ${formatDateTime(new Date())}\n`));
    } catch (error) {
      spinner.fail('Sync failed');
      console.error(chalk.red(`\nError: ${error}\n`));
      process.exit(1);
    } finally {
      db.close();
    }
  });