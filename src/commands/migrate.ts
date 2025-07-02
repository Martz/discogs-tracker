import { Command } from '@commander-js/extra-typings';
import chalk from 'chalk';
import { PriceDatabase } from '../db/database.js';
import { DatabaseMigrator, migrations } from '../db/migrations.js';

export const migrateCommand = new Command('migrate')
  .description('Database migration commands')
  .option('-s, --status', 'Show migration status')
  .option('-r, --rollback <version>', 'Rollback to specific version', parseFloat)
  .action(async (options) => {
    const db = new PriceDatabase();
    
    try {
      // Get internal database connection for migrations
      const migrator = new (DatabaseMigrator as any)((db as any).db);
      
      if (options.status) {
        const currentVersion = migrator.getCurrentVersion();
        const latestVersion = Math.max(...migrations.map(m => m.version));
        
        console.log(chalk.cyan('\n📊 Database Migration Status\n'));
        console.log(`Current version: ${chalk.bold(currentVersion)}`);
        console.log(`Latest version: ${chalk.bold(latestVersion)}`);
        console.log(`Status: ${currentVersion >= latestVersion ? chalk.green('Up to date') : chalk.yellow('Needs migration')}`);
        
        console.log('\nMigrations:');
        migrations.forEach(migration => {
          const status = migration.version <= currentVersion ? chalk.green('✓') : chalk.gray('○');
          console.log(`  ${status} v${migration.version}: ${migration.name}`);
        });
        console.log();
        
      } else if (options.rollback !== undefined) {
        console.log(chalk.yellow(`\nRolling back to version ${options.rollback}...\n`));
        migrator.rollback(options.rollback);
        console.log(chalk.green('Rollback completed\n'));
        
      } else {
        console.log(chalk.blue('\nRunning database migrations...\n'));
        migrator.migrate();
        console.log(chalk.green('Migration completed\n'));
      }
      
    } catch (error) {
      console.error(chalk.red(`\nMigration error: ${error}\n`));
      process.exit(1);
    } finally {
      db.close();
    }
  });