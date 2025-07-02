export interface DiscogsArtist {
  name: string;
  id: number;
  resource_url: string;
}

export interface DiscogsFormat {
  name: string;
  qty: string;
  descriptions?: string[];
}

export interface DiscogsBasicInformation {
  id: number;
  title: string;
  year: number;
  resource_url: string;
  thumb: string;
  cover_image: string;
  formats: DiscogsFormat[];
  artists: DiscogsArtist[];
  labels: Array<{
    name: string;
    catno: string;
    entity_type: string;
    entity_type_name: string;
    id: number;
    resource_url: string;
  }>;
  genres: string[];
  styles: string[];
}

export interface DiscogsCollectionItem {
  id: number;
  instance_id: number;
  folder_id: number;
  rating: number;
  basic_information: DiscogsBasicInformation;
  date_added: string;
}

export interface DiscogsPagination {
  page: number;
  pages: number;
  per_page: number;
  items: number;
  urls: {
    last?: string;
    next?: string;
    prev?: string;
    first?: string;
  };
}

export interface DiscogsCollectionResponse {
  pagination: DiscogsPagination;
  releases: DiscogsCollectionItem[];
}

export interface DiscogsMarketplaceListing {
  listing_id: number;
  resource_url: string;
  uri: string;
  status: string;
  condition: string;
  sleeve_condition: string;
  comments: string;
  ships_from: string;
  posted: string;
  allow_offers: boolean;
  audio: boolean;
  price: {
    value: number;
    currency: string;
  };
  original_price: {
    curr_abbr: string;
    curr_id: number;
    formatted: string;
    value: number;
  };
  shipping_price: {
    value: number;
    currency: string;
  };
  original_shipping_price: {
    curr_abbr: string;
    curr_id: number;
    formatted: string;
    value: number;
  };
  seller: {
    id: number;
    username: string;
    avatar_url: string;
    stats: {
      rating: string;
      stars: number;
      total: number;
    };
    min_order_total: number;
    html_url: string;
    uid: number;
    url: string;
    payment: string;
    shipping: string;
    resource_url: string;
  };
  release: {
    id: number;
    description: string;
    format: string;
    catalog_number: string;
    year: number;
    resource_url: string;
    thumbnail: string;
  };
}

export interface DiscogsMarketplaceResponse {
  pagination: DiscogsPagination;
  listings: DiscogsMarketplaceListing[];
}

export interface PriceRecord {
  id?: number;
  release_id: number;
  price: number;
  currency: string;
  condition: string;
  timestamp: string;
  listing_count: number;
  wantsCount?: number;
}

export interface ReleaseInfo {
  id: number;
  title: string;
  artist: string;
  year: number;
  format: string;
  thumb_url: string;
  added_date: string;
}

/**
 * Represents price trend analysis for a release over time
 * Trends are calculated by comparing current price with previous price data
 */
export interface PriceTrend {
  release: ReleaseInfo;
  current_price: number;
  previous_price: number;
  price_change: number;
  percentage_change: number;
  /** Trend direction: 'up' for increasing, 'down' for decreasing, 'stable' for no significant change */
  trend: 'up' | 'down' | 'stable';
  price_history: PriceRecord[];
}

export interface DiscogsFolder {
  id: number;
  user_id: number;
  name: string;
  count: number;
  created: string;
  updated: string;
  resource_url: string;
}

export interface DiscogsFoldersResponse {
  folders: DiscogsFolder[];
}

export interface DiscogsWantlistItem {
  id: number;
  rating: number;
  notes: string;
  basic_information: DiscogsBasicInformation;
  date_added: string;
}

export interface DiscogsWantlistResponse {
  pagination: DiscogsPagination;
  wants: DiscogsWantlistItem[];
}