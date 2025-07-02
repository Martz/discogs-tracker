import { parentPort } from 'worker_threads';
import type { WorkerTask, WorkerResult } from '../utils/worker-pool.js';

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

const API_BASE = 'https://api.discogs.com';
const USER_AGENT = 'DiscogsCollectionTracker/1.0';

async function fetchMarketplaceStats(releaseId: number, token: string): Promise<{
  price: number;
  currency: string;
  condition: string;
  listingCount: number;
  wantsCount: number;
} | null> {
  try {
    const url = `${API_BASE}/marketplace/stats/${releaseId}`;
    const response = await fetch(url, {
      headers: {
        'Authorization': `Discogs token=${token}`,
        'User-Agent': USER_AGENT
      }
    });

    if (!response.ok) {
      throw new Error(`Discogs API error: ${response.statusText}`);
    }

    const data = await response.json() as {
      lowest_price: {
        value: number;
        currency: string;
      };
      num_for_sale: number;
      blocked_from_sale: boolean;
    };

    if (!data.lowest_price || data.num_for_sale === 0) {
      return null;
    }

    // Get wants count from release endpoint
    let wantsCount = 0;
    try {
      const releaseUrl = `${API_BASE}/releases/${releaseId}`;
      const releaseResponse = await fetch(releaseUrl, {
        headers: {
          'Authorization': `Discogs token=${token}`,
          'User-Agent': USER_AGENT
        }
      });

      if (releaseResponse.ok) {
        const releaseData = await releaseResponse.json() as {
          community?: {
            want: number;
            have: number;
          };
        };
        wantsCount = releaseData.community?.want || 0;
      }
    } catch {
      // Ignore wants count errors
    }

    return {
      price: data.lowest_price.value,
      currency: data.lowest_price.currency,
      condition: 'Various',
      listingCount: data.num_for_sale,
      wantsCount
    };
  } catch (error) {
    throw new Error(`Failed to fetch price for release ${releaseId}: ${error}`);
  }
}

// Add exponential backoff retry logic
async function fetchWithRetry<T>(
  fn: () => Promise<T>, 
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }
      
      const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error('Max retries exceeded');
}

if (parentPort) {
  parentPort.on('message', async (task: WorkerTask<PriceTaskData>) => {
    const result: WorkerResult<PriceResultData> = {
      id: task.id,
      success: false
    };

    try {
      const stats = await fetchWithRetry(
        () => fetchMarketplaceStats(task.data.releaseId, task.data.token)
      );

      if (stats) {
        result.success = true;
        result.result = {
          releaseId: task.data.releaseId,
          price: stats.price,
          currency: stats.currency,
          condition: stats.condition,
          listingCount: stats.listingCount,
          wantsCount: stats.wantsCount,
          timestamp: new Date().toISOString()
        };
      } else {
        result.error = 'No marketplace data available';
      }
    } catch (error) {
      result.error = error instanceof Error ? error.message : 'Unknown error';
    }

    parentPort!.postMessage(result);
  });
}