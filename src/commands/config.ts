import { Command } from '@commander-js/extra-typings';
import inquirer from 'inquirer';
import chalk from 'chalk';
import { setDiscogsCredentials, getDiscogsCredentials, setTrackingConfig, getTrackingConfig } from '../utils/config.js';

export const configCommand = new Command('config')
  .description('Configure Discogs credentials and tracking settings')
  .option('-s, --show', 'Show current configuration')
  .action(async (options) => {
    if (options.show) {
      const { token, username } = getDiscogsCredentials();
      const { checkInterval, minPriceChangePercent } = getTrackingConfig();
      
      console.log(chalk.cyan('\nCurrent Configuration:'));
      console.log(`Username: ${username || chalk.red('Not set')}`);
      console.log(`Token: ${token ? chalk.green('***' + token.slice(-4)) : chalk.red('Not set')}`);
      console.log(`Check Interval: ${checkInterval} hours`);
      console.log(`Min Price Change: ${minPriceChangePercent}%\n`);
      return;
    }

    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'username',
        message: 'Enter your Discogs username:',
        default: getDiscogsCredentials().username,
        validate: (input) => input.length > 0 || 'Username is required'
      },
      {
        type: 'password',
        name: 'token',
        message: 'Enter your Discogs personal access token:',
        default: getDiscogsCredentials().token,
        validate: (input) => input.length > 0 || 'Token is required'
      },
      {
        type: 'number',
        name: 'checkInterval',
        message: 'How often to check prices (hours):',
        default: getTrackingConfig().checkInterval,
        validate: (input) => input > 0 || 'Must be greater than 0'
      },
      {
        type: 'number',
        name: 'minPriceChangePercent',
        message: 'Minimum price change to report (%):',
        default: getTrackingConfig().minPriceChangePercent,
        validate: (input) => input > 0 || 'Must be greater than 0'
      }
    ]);

    setDiscogsCredentials(answers.token, answers.username);
    setTrackingConfig(answers.checkInterval, answers.minPriceChangePercent);
    
    console.log(chalk.green('\n✓ Configuration saved successfully!\n'));
  });