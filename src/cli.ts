#!/usr/bin/env node
import { program } from '@commander-js/extra-typings';
import chalk from 'chalk';
import { setDebugMode } from './utils/logger.js';

// Check for debug flag early and enable debug mode
const debugIndex = process.argv.indexOf('--debug') >= 0 || process.argv.indexOf('-d') >= 0;
if (debugIndex) {
  setDebugMode(true);
}

import { configCommand } from './commands/config.js';
import { syncCommand } from './commands/sync.js';
import { trendsCommand } from './commands/trends.js';
import { listCommand } from './commands/list.js';
import { historyCommand } from './commands/history.js';
import { valueCommand } from './commands/value.js';
import { demandCommand } from './commands/demand.js';
import { migrateCommand } from './commands/migrate.js';

program
  .name('discogs-tracker')
  .description('Track prices of your Discogs collection over time')
  .version('1.0.0')
  .option('-d, --debug', 'Enable debug mode for verbose logging')
  .addHelpText('after', `
${chalk.cyan('Examples:')}
  $ discogs-tracker config              # Configure credentials
  $ discogs-tracker sync                # Sync collection and prices
  $ discogs-tracker sync -t 16         # Use 16 threads for faster sync
  $ discogs-tracker trends              # Show records increasing in value
  $ discogs-tracker trends -m 10        # Show records with >10% increase
  $ discogs-tracker list                # List all records
  $ discogs-tracker history 123456      # Show price history for release
  $ discogs-tracker value               # Show collection value and stats
  $ discogs-tracker value -f            # Show value breakdown by format
  $ discogs-tracker demand              # Show high-demand and optimal sell candidates
  $ discogs-tracker demand -w 100       # Show records with >100 wants
`);

program.addCommand(configCommand);
program.addCommand(syncCommand);
program.addCommand(trendsCommand);
program.addCommand(listCommand);
program.addCommand(historyCommand);
program.addCommand(valueCommand);
program.addCommand(demandCommand);
program.addCommand(migrateCommand);

// Parse arguments
program.parse();