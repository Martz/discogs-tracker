#!/usr/bin/env node
import { program } from '@commander-js/extra-typings';
import chalk from 'chalk';
import { configCommand } from './commands/config.js';
import { syncCommand } from './commands/sync.js';
import { trendsCommand } from './commands/trends.js';
import { listCommand } from './commands/list.js';
import { historyCommand } from './commands/history.js';

program
  .name('discogs-tracker')
  .description('Track prices of your Discogs collection over time')
  .version('1.0.0')
  .addHelpText('after', `
${chalk.cyan('Examples:')}
  $ discogs-tracker config              # Configure credentials
  $ discogs-tracker sync                # Sync collection and prices
  $ discogs-tracker trends              # Show records increasing in value
  $ discogs-tracker trends -m 10        # Show records with >10% increase
  $ discogs-tracker list                # List all records
  $ discogs-tracker history 123456      # Show price history for release
`);

program.addCommand(configCommand);
program.addCommand(syncCommand);
program.addCommand(trendsCommand);
program.addCommand(listCommand);
program.addCommand(historyCommand);

program.parse();