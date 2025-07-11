use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DiscogsArtist {
    pub name: String,
    pub id: u32,
    pub resource_url: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DiscogsFormat {
    pub name: String,
    pub qty: String,
    pub descriptions: Option<Vec<String>>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DiscogsLabel {
    pub name: String,
    pub catno: String,
    pub entity_type: String,
    pub entity_type_name: String,
    pub id: u32,
    pub resource_url: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DiscogsBasicInformation {
    pub id: u32,
    pub title: String,
    pub year: u32,
    pub resource_url: String,
    pub thumb: String,
    pub cover_image: String,
    pub formats: Vec<DiscogsFormat>,
    pub artists: Vec<DiscogsArtist>,
    pub labels: Vec<DiscogsLabel>,
    pub genres: Vec<String>,
    pub styles: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DiscogsCollectionItem {
    pub id: u32,
    pub instance_id: u32,
    pub folder_id: u32,
    pub rating: u32,
    pub basic_information: DiscogsBasicInformation,
    pub date_added: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DiscogsPagination {
    pub page: u32,
    pub pages: u32,
    pub per_page: u32,
    pub items: u32,
    pub urls: DiscogsPaginationUrls,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DiscogsPaginationUrls {
    pub last: Option<String>,
    pub next: Option<String>,
    pub prev: Option<String>,
    pub first: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DiscogsCollectionResponse {
    pub pagination: DiscogsPagination,
    pub releases: Vec<DiscogsCollectionItem>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DiscogsFolder {
    pub id: u32,
    pub user_id: u32,
    pub name: String,
    pub count: u32,
    pub created: String,
    pub updated: String,
    pub resource_url: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DiscogsFoldersResponse {
    pub folders: Vec<DiscogsFolder>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DiscogsWantlistItem {
    pub id: u32,
    pub rating: u32,
    pub notes: String,
    pub basic_information: DiscogsBasicInformation,
    pub date_added: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DiscogsWantlistResponse {
    pub pagination: DiscogsPagination,
    pub wants: Vec<DiscogsWantlistItem>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DiscogsMarketplaceStats {
    pub lowest_price: Option<DiscogsPrice>,
    pub num_for_sale: u32,
    pub blocked_from_sale: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DiscogsPrice {
    pub value: f64,
    pub currency: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DiscogsReleaseInfo {
    pub community: Option<DiscogsCommunity>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DiscogsCommunity {
    pub want: u32,
    pub have: u32,
}

#[derive(Debug, Clone)]
pub struct ReleaseInfo {
    pub id: u32,
    pub title: String,
    pub artist: String,
    pub year: u32,
    pub format: String,
    pub thumb_url: String,
    pub added_date: String,
}

#[derive(Debug, Clone)]
pub struct PriceRecord {
    pub id: Option<u32>,
    pub release_id: u32,
    pub price: f64,
    pub currency: String,
    pub condition: String,
    pub timestamp: DateTime<Utc>,
    pub listing_count: u32,
    pub wants_count: Option<u32>,
}

#[derive(Debug)]
pub struct MarketplacePrice {
    pub price: f64,
    pub currency: String,
    pub condition: String,
    pub listing_count: u32,
    pub wants_count: u32,
}

#[derive(Debug)]
pub struct PriceTrend {
    pub release: ReleaseInfo,
    pub current_price: f64,
    pub previous_price: f64,
    pub price_change: f64,
    pub percentage_change: f64,
    pub trend: TrendDirection,
    pub price_history: Vec<PriceRecord>,
}

#[derive(Debug)]
pub enum TrendDirection {
    Up,
    Down,
    Stable,
}