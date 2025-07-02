import type { 
  DiscogsCollectionItem, 
  DiscogsCollectionResponse,
  DiscogsMarketplaceResponse,
  DiscogsMarketplaceListing,
  DiscogsFolder,
  DiscogsFoldersResponse,
  DiscogsWantlistItem,
  DiscogsWantlistResponse
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

  async getFolders(): Promise<DiscogsFolder[]> {
    const url = `${API_BASE}/users/${this.username}/collection/folders`;
    const data = await this.makeRequest<DiscogsFoldersResponse>(url);
    return data.folders;
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

  async getCollectionByFolder(folderId: number): Promise<DiscogsCollectionItem[]> {
    const allItems: DiscogsCollectionItem[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const url = `${API_BASE}/users/${this.username}/collection/folders/${folderId}/releases?page=${page}&per_page=100`;
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

  async getWantlist(): Promise<DiscogsWantlistItem[]> {
    const allItems: DiscogsWantlistItem[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const url = `${API_BASE}/users/${this.username}/wants?page=${page}&per_page=100`;
      const data = await this.makeRequest<DiscogsWantlistResponse>(url);
      
      allItems.push(...data.wants);
      hasMore = page < data.pagination.pages;
      page++;

      if (hasMore) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return allItems;
  }

  async getMarketplaceStats(releaseId: number): Promise<{
    price: number;
    currency: string;
    condition: string;
    listingCount: number;
    wantsCount: number;
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

      // Get wants count from release endpoint
      let wantsCount = 0;
      try {
        const releaseUrl = `${API_BASE}/releases/${releaseId}`;
        const releaseData = await this.makeRequest<{
          community: {
            want: number;
            have: number;
          };
        }>(releaseUrl);
        wantsCount = releaseData.community?.want || 0;
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
      console.error(`Failed to fetch marketplace price for release ${releaseId}:`, error);
      return null;
    }
  }

  async getLowestMarketplacePrice(releaseId: number): Promise<{
    price: number;
    currency: string;
    condition: string;
    listingCount: number;
  } | null> {
    const stats = await this.getMarketplaceStats(releaseId);
    if (!stats) return null;
    
    return {
      price: stats.price,
      currency: stats.currency,
      condition: stats.condition,
      listingCount: stats.listingCount
    };
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