import { Command } from '@commander-js/extra-typings';
import chalk from 'chalk';
import Table from 'cli-table3';
import { PriceDatabase } from '../db/database.js';
import { formatCurrency, formatPercentage } from '../utils/formatter.js';

export const demandCommand = new Command('demand')
  .description('Analyse demand and identify optimal records to sell')
  .option('-w, --min-wants <number>', 'Minimum wants count to consider', parseFloat, 50)
  .option('-p, --min-price-change <number>', 'Minimum price change percentage', parseFloat, 0)
  .option('-l, --limit <number>', 'Number of results to show', parseFloat, 20)
  .option('-t, --type <type>', 'Analysis type: demand, sell, or both', 'both')
  .action(async (options) => {
    const db = new PriceDatabase();

    try {
      if (options.type === 'demand' || options.type === 'both') {
        console.log(chalk.cyan(`\n🔥 High Demand Records (>= ${options.minWants} wants)\n`));
        
        const highDemand = db.getHighDemandReleases(options.minWants);
        
        if (highDemand.length === 0) {
          console.log(chalk.yellow(`No records found with >= ${options.minWants} wants\n`));
        } else {
          const demandTable = new Table({
            head: ['Artist', 'Title', 'Price', 'Wants', 'Demand Score'],
            colWidths: [25, 35, 12, 8, 15],
            style: { head: ['cyan'] }
          });

          highDemand.slice(0, options.limit).forEach(item => {
            demandTable.push([
              item.release.artist.length > 23 ? item.release.artist.substring(0, 20) + '...' : item.release.artist,
              item.release.title.length > 33 ? item.release.title.substring(0, 30) + '...' : item.release.title,
              formatCurrency(item.currentPrice),
              item.wantsCount.toString(),
              item.demandScore.toFixed(2)
            ]);
          });

          console.log(demandTable.toString());
          console.log(chalk.green(`\nShowing ${Math.min(highDemand.length, options.limit)} of ${highDemand.length} high-demand records\n`));
        }
      }

      if (options.type === 'sell' || options.type === 'both') {
        console.log(chalk.cyan(`\n💰 Optimal Sell Candidates\n`));
        
        const sellCandidates = db.getOptimalSellCandidates({
          minWantsCount: options.minWants,
          minPriceChange: options.minPriceChange,
          limit: options.limit
        });

        if (sellCandidates.length === 0) {
          console.log(chalk.yellow(`No optimal sell candidates found with your criteria\n`));
        } else {
          const sellTable = new Table({
            head: ['Artist', 'Title', 'Price', 'Wants', 'Price Change', 'Sell Score'],
            colWidths: [25, 35, 12, 8, 12, 12],
            style: { head: ['cyan'] }
          });

          sellCandidates.forEach(item => {
            const changePercent = (item as any).price_change_percent || 0;

            sellTable.push([
              item.release.artist.length > 23 ? item.release.artist.substring(0, 20) + '...' : item.release.artist,
              item.release.title.length > 33 ? item.release.title.substring(0, 30) + '...' : item.release.title,
              formatCurrency(item.currentPrice),
              item.wantsCount.toString(),
              formatPercentage(changePercent),
              item.sellScore.toFixed(1)
            ]);
          });

          console.log(sellTable.toString());

          const totalPotentialValue = sellCandidates.reduce((sum, item) => sum + item.currentPrice, 0);
          console.log(chalk.green(`\nTotal potential value: ${formatCurrency(totalPotentialValue)}`));
          console.log(chalk.blue(`Sell score factors: 40% wants demand + 30% price trend + 30% current price\n`));
        }
      }

      // Show summary statistics
      const folders = db.getCollectionFolders();
      const wantsCount = db.getWantsCount();
      
      console.log(chalk.cyan('📊 Collection Summary\n'));
      console.log(`Collection folders:`);
      folders.forEach(folder => {
        console.log(`  ${folder.folderName}: ${folder.count} items`);
      });
      console.log(`Wantlist: ${wantsCount} items\n`);

    } catch (error) {
      console.error(chalk.red(`\nError: ${error}\n`));
      process.exit(1);
    } finally {
      db.close();
    }
  });