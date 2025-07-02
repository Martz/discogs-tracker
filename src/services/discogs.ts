import type { 
  DiscogsCollectionItem, 
  DiscogsCollectionResponse,
  DiscogsMarketplaceResponse,
  DiscogsMarketplaceListing 
} from '../types/index.js';

const API_BASE = 'https://api.discogs.com';
const USER_AGENT = 'DiscogsCollectionTracker/1.0';

export class DiscogsService {
  private token: string;
  private username: string;

  constructor(token: string, username: string) {
    this.token = token;
    this.username = username;
  }

  private async makeRequest<T>(url: string): Promise<T> {
    const response = await fetch(url, {
      headers: {
        'Authorization': `Discogs token=${this.token}`,
        'User-Agent': USER_AGENT
      }
    });

    if (!response.ok) {
      throw new Error(`Discogs API error: ${response.statusText}`);
    }

    return response.json() as Promise<T>;
  }

  async getCollection(): Promise<DiscogsCollectionItem[]> {
    const allItems: DiscogsCollectionItem[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const url = `${API_BASE}/users/${this.username}/collection/folders/0/releases?page=${page}&per_page=100`;
      const data = await this.makeRequest<DiscogsCollectionResponse>(url);
      
      allItems.push(...data.releases);
      hasMore = page < data.pagination.pages;
      page++;

      if (hasMore) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return allItems;
  }

  async getLowestMarketplacePrice(releaseId: number): Promise<{
    price: number;
    currency: string;
    condition: string;
    listingCount: number;
  } | null> {
    try {
      const url = `${API_BASE}/marketplace/stats/${releaseId}`;
      const data = await this.makeRequest<{
        lowest_price: {
          value: number;
          currency: string;
        };
        num_for_sale: number;
        blocked_from_sale: boolean;
      }>(url);

      if (!data.lowest_price || data.num_for_sale === 0) {
        return null;
      }

      return {
        price: data.lowest_price.value,
        currency: data.lowest_price.currency,
        condition: 'Various',
        listingCount: data.num_for_sale
      };
    } catch (error) {
      console.error(`Failed to fetch marketplace price for release ${releaseId}:`, error);
      return null;
    }
  }

  async getAllMarketplaceListings(releaseId: number): Promise<DiscogsMarketplaceListing[]> {
    const allListings: DiscogsMarketplaceListing[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore && page <= 3) {
      const url = `${API_BASE}/marketplace/listings?release_id=${releaseId}&page=${page}&per_page=100`;
      const data = await this.makeRequest<DiscogsMarketplaceResponse>(url);
      
      allListings.push(...data.listings);
      hasMore = page < data.pagination.pages;
      page++;

      if (hasMore) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return allListings;
  }
}