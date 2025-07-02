import { Command } from '@commander-js/extra-typings';
import ora from 'ora';
import chalk from 'chalk';
import { DiscogsService } from '../services/discogs.js';
import { PriceDatabase } from '../db/database.js';
import { getDiscogsCredentials, isConfigured } from '../utils/config.js';
import { formatDateTime } from '../utils/formatter.js';
import { WorkerPool, type WorkerTask } from '../utils/worker-pool.js';
import type { ReleaseInfo } from '../types/index.js';

interface PriceTaskData {
  releaseId: number;
  token: string;
  username: string;
}

interface PriceResultData {
  releaseId: number;
  price: number;
  currency: string;
  condition: string;
  listingCount: number;
  wantsCount: number;
  timestamp: string;
}

export const syncCommand = new Command('sync')
  .description('Sync your Discogs collection and fetch current prices')
  .option('-f, --force', 'Force price update even if recently checked')
  .option('-t, --threads <number>', 'Number of worker threads to use', parseFloat, 8)
  .option('-b, --batch-size <number>', 'Batch size for parallel processing', parseFloat, 20)
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
      // Get folders first
      spinner.start('Fetching collection folders...');
      const folders = await discogs.getFolders();
      spinner.succeed(`Found ${folders.length} folders`);

      // Sync all folders (not just "All")
      const allCollectionItems = [];
      for (const folder of folders) {
        spinner.start(`Fetching folder: ${folder.name}...`);
        const folderItems = await discogs.getCollectionByFolder(folder.id);
        
        for (const item of folderItems) {
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
          db.addCollectionItem({
            releaseId: item.id,
            folderId: folder.id,
            folderName: folder.name,
            instanceId: item.instance_id,
            addedDate: item.date_added
          });
          
          allCollectionItems.push(item);
        }
        
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Sync wantlist
      spinner.start('Fetching wantlist...');
      const wantlist = await discogs.getWantlist();
      for (const want of wantlist) {
        const releaseInfo: ReleaseInfo = {
          id: want.id,
          title: want.basic_information.title,
          artist: want.basic_information.artists[0].name,
          year: want.basic_information.year,
          format: want.basic_information.formats[0].name,
          thumb_url: want.basic_information.thumb,
          added_date: want.date_added
        };
        
        db.addOrUpdateRelease(releaseInfo);
        db.addWantItem({
          releaseId: want.id,
          addedDate: want.date_added,
          notes: want.notes
        });
      }
      
      spinner.succeed(`Collection synced: ${allCollectionItems.length} items, ${wantlist.length} wants`);

      // Filter items that need price updates
      const itemsToUpdate = allCollectionItems.filter(item => {
        const latestPrice = db.getLatestPrice(item.id);
        const hoursSinceLastCheck = latestPrice 
          ? (Date.now() - new Date(latestPrice.timestamp).getTime()) / (1000 * 60 * 60)
          : Infinity;
        return options.force || hoursSinceLastCheck >= 24;
      });

      if (itemsToUpdate.length === 0) {
        spinner.succeed('All prices are up to date (use --force to update anyway)');
      } else {
        spinner.start(`Fetching prices for ${itemsToUpdate.length} items using ${options.threads} threads...`);
        
        // Create worker pool
        const workerPool = new WorkerPool<PriceTaskData, PriceResultData>('price-fetcher.js', options.threads);
        
        try {
          // Create tasks for parallel processing
          const tasks: WorkerTask<PriceTaskData>[] = itemsToUpdate.map((item, index) => ({
            id: `price-${item.id}-${index}`,
            data: {
              releaseId: item.id,
              token,
              username
            }
          }));

          let completed = 0;
          let errors = 0;

          // Process in batches with progress updates
          const results = await workerPool.executeBatch(
            tasks, 
            options.batchSize,
            (completedCount, total) => {
              completed = completedCount;
              spinner.text = `Fetching prices... ${completedCount}/${total} (${Math.round((completedCount / total) * 100)}%)`;
            }
          );

          // Process results and save to database
          for (const result of results) {
            if (result.success && result.result) {
              db.addPriceRecord({
                release_id: result.result.releaseId,
                price: result.result.price,
                currency: result.result.currency,
                condition: result.result.condition,
                timestamp: result.result.timestamp,
                listing_count: result.result.listingCount,
                wantsCount: result.result.wantsCount
              });
            } else {
              errors++;
              console.error(chalk.red(`\nError: ${result.error}`));
            }
          }

          spinner.succeed(`Price sync complete. Processed: ${completed}, Errors: ${errors}`);
        } finally {
          // Always terminate worker pool
          workerPool.terminate();
        }
      }
      
      console.log(chalk.green(`\n✓ Sync completed at ${formatDateTime(new Date())}\n`));
    } catch (error) {
      spinner.fail('Sync failed');
      console.error(chalk.red(`\nError: ${error}\n`));
      process.exit(1);
    } finally {
      db.close();
    }
  });