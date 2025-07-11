use anyhow::{Context, Result};
use reqwest::Client;

use std::time::Duration;
use tokio::time::sleep;

use crate::types::*;

const API_BASE: &str = "https://api.discogs.com";
const USER_AGENT: &str = "DiscogsCollectionTracker/1.0";

pub struct DiscogsService {
    client: Client,
    token: String,
    username: String,
}

impl DiscogsService {
    pub fn new(token: &str, username: &str) -> Self {
        let client = Client::builder()
            .user_agent(USER_AGENT)
            .timeout(Duration::from_secs(30))
            .build()
            .expect("Failed to create HTTP client");

        Self {
            client,
            token: token.to_string(),
            username: username.to_string(),
        }
    }

    async fn make_request<T>(&self, url: &str) -> Result<T>
    where
        T: serde::de::DeserializeOwned,
    {
        let response = self
            .client
            .get(url)
            .header("Authorization", format!("Discogs token={}", self.token))
            .send()
            .await
            .with_context(|| format!("Failed to make request to {}", url))?;

        if !response.status().is_success() {
            return Err(anyhow::anyhow!(
                "Discogs API error: {} {}",
                response.status(),
                response.text().await.unwrap_or_default()
            ));
        }

        let data = response
            .json::<T>()
            .await
            .with_context(|| "Failed to parse JSON response")?;

        Ok(data)
    }

    pub async fn get_folders(&self) -> Result<Vec<DiscogsFolder>> {
        let url = format!("{}/users/{}/collection/folders", API_BASE, self.username);
        let response: DiscogsFoldersResponse = self.make_request(&url).await?;
        Ok(response.folders)
    }

    pub async fn get_collection(&self) -> Result<Vec<DiscogsCollectionItem>> {
        let mut all_items = Vec::new();
        let mut page = 1;

        loop {
            let url = format!(
                "{}/users/{}/collection/folders/0/releases?page={}&per_page=100",
                API_BASE, self.username, page
            );

            let response: DiscogsCollectionResponse = self.make_request(&url).await?;
            all_items.extend(response.releases);

            if page >= response.pagination.pages {
                break;
            }

            page += 1;
            
            // Rate limiting
            sleep(Duration::from_millis(1000)).await;
        }

        Ok(all_items)
    }

    pub async fn get_collection_by_folder(&self, folder_id: u32) -> Result<Vec<DiscogsCollectionItem>> {
        let mut all_items = Vec::new();
        let mut page = 1;

        loop {
            let url = format!(
                "{}/users/{}/collection/folders/{}/releases?page={}&per_page=100",
                API_BASE, self.username, folder_id, page
            );

            let response: DiscogsCollectionResponse = self.make_request(&url).await?;
            all_items.extend(response.releases);

            if page >= response.pagination.pages {
                break;
            }

            page += 1;
            
            // Rate limiting
            sleep(Duration::from_millis(1000)).await;
        }

        Ok(all_items)
    }

    pub async fn get_wantlist(&self) -> Result<Vec<DiscogsWantlistItem>> {
        let mut all_items = Vec::new();
        let mut page = 1;

        loop {
            let url = format!(
                "{}/users/{}/wants?page={}&per_page=100",
                API_BASE, self.username, page
            );

            let response: DiscogsWantlistResponse = self.make_request(&url).await?;
            all_items.extend(response.wants);

            if page >= response.pagination.pages {
                break;
            }

            page += 1;
            
            // Rate limiting
            sleep(Duration::from_millis(1000)).await;
        }

        Ok(all_items)
    }

    pub async fn get_marketplace_stats(&self, release_id: u32) -> Result<Option<MarketplacePrice>> {
        let url = format!("{}/marketplace/stats/{}", API_BASE, release_id);
        
        let stats: DiscogsMarketplaceStats = match self.make_request(&url).await {
            Ok(stats) => stats,
            Err(_) => return Ok(None), // Handle errors gracefully
        };

        let lowest_price = match stats.lowest_price {
            Some(price) if stats.num_for_sale > 0 => price,
            _ => return Ok(None),
        };

        // Get wants count from release endpoint
        let wants_count = self.get_wants_count(release_id).await.unwrap_or(0);

        Ok(Some(MarketplacePrice {
            price: lowest_price.value,
            currency: lowest_price.currency,
            condition: "Various".to_string(),
            listing_count: stats.num_for_sale,
            wants_count,
        }))
    }

    async fn get_wants_count(&self, release_id: u32) -> Result<u32> {
        let url = format!("{}/releases/{}", API_BASE, release_id);
        let release_data: DiscogsReleaseInfo = self.make_request(&url).await?;
        
        Ok(release_data.community
            .map(|c| c.want)
            .unwrap_or(0))
    }
}

impl From<DiscogsCollectionItem> for ReleaseInfo {
    fn from(item: DiscogsCollectionItem) -> Self {
        let basic = &item.basic_information;
        let artist = basic.artists
            .first()
            .map(|a| a.name.clone())
            .unwrap_or_else(|| "Unknown Artist".to_string());
        
        let format = basic.formats
            .first()
            .map(|f| f.name.clone())
            .unwrap_or_else(|| "Unknown Format".to_string());

        ReleaseInfo {
            id: basic.id,
            title: basic.title.clone(),
            artist,
            year: basic.year,
            format,
            thumb_url: basic.thumb.clone(),
            added_date: item.date_added,
        }
    }
}

impl From<DiscogsWantlistItem> for ReleaseInfo {
    fn from(item: DiscogsWantlistItem) -> Self {
        let basic = &item.basic_information;
        let artist = basic.artists
            .first()
            .map(|a| a.name.clone())
            .unwrap_or_else(|| "Unknown Artist".to_string());
        
        let format = basic.formats
            .first()
            .map(|f| f.name.clone())
            .unwrap_or_else(|| "Unknown Format".to_string());

        ReleaseInfo {
            id: basic.id,
            title: basic.title.clone(),
            artist,
            year: basic.year,
            format,
            thumb_url: basic.thumb.clone(),
            added_date: item.date_added,
        }
    }
}