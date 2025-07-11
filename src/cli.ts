#!/usr/bin/env node
import { program } from '@commander-js/extra-typings';
import chalk from 'chalk';
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
  .addHelpText('after', `
${chalk.cyan('Examples:')}
  $ discogs-tracker config              # Configure credentials
  $ discogs-tracker sync                # Sync collection and prices
  $ discogs-tracker sync -t 16         # Use 16 threads for faster sync
  $ discogs-tracker trends              # Show records increasing in value
  $ discogs-tracker trends -m 10        # Show records with >10% increase
  $ discogs-tracker trends --vinyl      # Show vinyl price trends only
  $ discogs-tracker list                # List all records
  $ discogs-tracker list --cd           # List CD releases only
  $ discogs-tracker list -f "Cassette"  # List cassette releases only
  $ discogs-tracker history 123456      # Show price history for release
  $ discogs-tracker value               # Show collection value and stats
  $ discogs-tracker value -f            # Show value breakdown by format
  $ discogs-tracker demand              # Show high-demand and optimal sell candidates
  $ discogs-tracker demand -w 100       # Show records with >100 wants
  $ discogs-tracker demand --vinyl      # Show vinyl demand analysis only
`);

program.addCommand(configCommand);
program.addCommand(syncCommand);
program.addCommand(trendsCommand);
program.addCommand(listCommand);
program.addCommand(historyCommand);
program.addCommand(valueCommand);
program.addCommand(demandCommand);
program.addCommand(migrateCommand);

program.parse();