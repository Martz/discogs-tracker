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

    return response.json();
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
      const url = `${API_BASE}/marketplace/listings?release_id=${releaseId}&sort=price&sort_order=asc`;
      const data = await this.makeRequest<DiscogsMarketplaceResponse>(url);

      if (data.listings.length === 0) {
        return null;
      }

      const lowestListing = data.listings[0];
      
      return {
        price: lowestListing.price.value,
        currency: lowestListing.price.currency,
        condition: lowestListing.condition,
        listingCount: data.pagination.items
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