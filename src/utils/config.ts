import Conf from 'conf';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface ConfigSchema {
  discogs: {
    token: string;
    username: string;
  };
  tracking: {
    checkInterval: number;
    minPriceChangePercent: number;
  };
}

const config = new Conf<ConfigSchema>({
  projectName: 'discogs-price-tracker',
  defaults: {
    discogs: {
      token: '',
      username: ''
    },
    tracking: {
      checkInterval: 24,
      minPriceChangePercent: 5
    }
  }
});

export function getConfig(): ConfigSchema {
  return config.store;
}

export function setDiscogsCredentials(token: string, username: string): void {
  config.set('discogs.token', token);
  config.set('discogs.username', username);
}

export function getDiscogsCredentials(): { token: string; username: string } {
  return config.get('discogs');
}

export function setTrackingConfig(checkInterval: number, minPriceChangePercent: number): void {
  config.set('tracking.checkInterval', checkInterval);
  config.set('tracking.minPriceChangePercent', minPriceChangePercent);
}

export function getTrackingConfig(): { checkInterval: number; minPriceChangePercent: number } {
  return config.get('tracking');
}

export function isConfigured(): boolean {
  const { token, username } = getDiscogsCredentials();
  return Boolean(token && username);
}