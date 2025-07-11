use anyhow::{Context, Result};
use chrono::{DateTime, Utc};
use rusqlite::{params, Connection};
use std::path::Path;

use crate::types::{PriceRecord, ReleaseInfo};

pub struct PriceDatabase {
    conn: Connection,
}

impl PriceDatabase {
    pub fn new(db_path: Option<&str>) -> Result<Self> {
        let db_file = db_path.unwrap_or("data/prices.db");
        
        // Ensure data directory exists
        if let Some(parent) = Path::new(db_file).parent() {
            std::fs::create_dir_all(parent)
                .with_context(|| format!("Failed to create directory {}", parent.display()))?;
        }

        let conn = Connection::open(db_file)
            .with_context(|| format!("Failed to open database at {}", db_file))?;

        let mut db = Self { conn };
        db.initialize()?;
        Ok(db)
    }

    fn initialize(&mut self) -> Result<()> {
        self.run_migrations()
    }

    fn run_migrations(&mut self) -> Result<()> {
        println!("Running database migrations...");

        // Migration 1: Initial schema
        self.conn.execute(
            "CREATE TABLE IF NOT EXISTS releases (
                id INTEGER PRIMARY KEY,
                title TEXT NOT NULL,
                artist TEXT NOT NULL,
                year INTEGER,
                format TEXT,
                thumb_url TEXT,
                added_date TEXT,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )",
            [],
        )?;

        self.conn.execute(
            "CREATE TABLE IF NOT EXISTS price_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                release_id INTEGER NOT NULL,
                price REAL NOT NULL,
                currency TEXT NOT NULL,
                condition TEXT NOT NULL,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                listing_count INTEGER DEFAULT 0,
                wants_count INTEGER DEFAULT 0,
                FOREIGN KEY (release_id) REFERENCES releases (id)
            )",
            [],
        )?;

        // Migration 2: Collection tracking
        self.conn.execute(
            "CREATE TABLE IF NOT EXISTS collection_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                release_id INTEGER NOT NULL,
                folder_id INTEGER NOT NULL DEFAULT 0,
                instance_id INTEGER,
                rating INTEGER DEFAULT 0,
                date_added DATETIME,
                FOREIGN KEY (release_id) REFERENCES releases (id),
                UNIQUE(release_id, folder_id, instance_id)
            )",
            [],
        )?;

        self.conn.execute(
            "CREATE TABLE IF NOT EXISTS collection_folders (
                id INTEGER PRIMARY KEY,
                name TEXT NOT NULL,
                count INTEGER DEFAULT 0,
                created DATETIME,
                updated DATETIME
            )",
            [],
        )?;

        self.conn.execute(
            "CREATE TABLE IF NOT EXISTS wants (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                release_id INTEGER NOT NULL,
                rating INTEGER DEFAULT 0,
                notes TEXT,
                date_added DATETIME,
                FOREIGN KEY (release_id) REFERENCES releases (id),
                UNIQUE(release_id)
            )",
            [],
        )?;

        // Migration 3: Add indexes for performance
        self.conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_price_history_release_id ON price_history(release_id)",
            [],
        )?;

        self.conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_price_history_timestamp ON price_history(timestamp)",
            [],
        )?;

        self.conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_collection_items_release_id ON collection_items(release_id)",
            [],
        )?;

        println!("✓ Database migrations completed");
        Ok(())
    }

    pub fn add_or_update_release(&mut self, release: &ReleaseInfo) -> Result<()> {
        self.conn.execute(
            "INSERT OR REPLACE INTO releases (id, title, artist, year, format, thumb_url, added_date, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, CURRENT_TIMESTAMP)",
            params![
                release.id,
                release.title,
                release.artist,
                release.year,
                release.format,
                release.thumb_url,
                release.added_date,
            ],
        )?;
        Ok(())
    }

    pub fn add_price_record(&mut self, record: &PriceRecord) -> Result<()> {
        self.conn.execute(
            "INSERT INTO price_history (release_id, price, currency, condition, timestamp, listing_count, wants_count)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            params![
                record.release_id,
                record.price,
                record.currency,
                record.condition,
                record.timestamp.format("%Y-%m-%d %H:%M:%S").to_string(),
                record.listing_count,
                record.wants_count,
            ],
        )?;
        Ok(())
    }

    pub fn get_release(&self, release_id: u32) -> Result<Option<ReleaseInfo>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, title, artist, year, format, thumb_url, added_date 
             FROM releases WHERE id = ?1"
        )?;

        let result = stmt.query_row(params![release_id], |row| {
            Ok(ReleaseInfo {
                id: row.get(0)?,
                title: row.get(1)?,
                artist: row.get(2)?,
                year: row.get(3)?,
                format: row.get(4)?,
                thumb_url: row.get(5)?,
                added_date: row.get(6)?,
            })
        });

        match result {
            Ok(release) => Ok(Some(release)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(e.into()),
        }
    }

    pub fn get_latest_price(&self, release_id: u32) -> Result<Option<PriceRecord>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, release_id, price, currency, condition, timestamp, listing_count, wants_count
             FROM price_history 
             WHERE release_id = ?1 
             ORDER BY timestamp DESC 
             LIMIT 1"
        )?;

        let result = stmt.query_row(params![release_id], |row| {
            let timestamp_str: String = row.get(5)?;
            let timestamp = DateTime::parse_from_str(&timestamp_str, "%Y-%m-%d %H:%M:%S")
                .map(|dt| dt.with_timezone(&Utc))
                .unwrap_or_else(|_| Utc::now());

            Ok(PriceRecord {
                id: Some(row.get(0)?),
                release_id: row.get(1)?,
                price: row.get(2)?,
                currency: row.get(3)?,
                condition: row.get(4)?,
                timestamp,
                listing_count: row.get(6)?,
                wants_count: row.get(7)?,
            })
        });

        match result {
            Ok(record) => Ok(Some(record)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(e.into()),
        }
    }

    pub fn get_price_history(&self, release_id: u32, days: u32) -> Result<Vec<PriceRecord>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, release_id, price, currency, condition, timestamp, listing_count, wants_count
             FROM price_history 
             WHERE release_id = ?1 AND timestamp >= datetime('now', '-' || ?2 || ' days')
             ORDER BY timestamp ASC"
        )?;

        let rows = stmt.query_map(params![release_id, days], |row| {
            let timestamp_str: String = row.get(5)?;
            let timestamp = DateTime::parse_from_str(&timestamp_str, "%Y-%m-%d %H:%M:%S")
                .map(|dt| dt.with_timezone(&Utc))
                .unwrap_or_else(|_| Utc::now());

            Ok(PriceRecord {
                id: Some(row.get(0)?),
                release_id: row.get(1)?,
                price: row.get(2)?,
                currency: row.get(3)?,
                condition: row.get(4)?,
                timestamp,
                listing_count: row.get(6)?,
                wants_count: row.get(7)?,
            })
        })?;

        let mut records = Vec::new();
        for row in rows {
            records.push(row?);
        }
        Ok(records)
    }

    pub fn add_collection_item(&mut self, release_id: u32, folder_id: u32, instance_id: Option<u32>) -> Result<()> {
        self.conn.execute(
            "INSERT OR IGNORE INTO collection_items (release_id, folder_id, instance_id, date_added)
             VALUES (?1, ?2, ?3, CURRENT_TIMESTAMP)",
            params![release_id, folder_id, instance_id],
        )?;
        Ok(())
    }

    pub fn add_want_item(&mut self, release_id: u32, rating: Option<u32>, notes: Option<&str>) -> Result<()> {
        self.conn.execute(
            "INSERT OR REPLACE INTO wants (release_id, rating, notes, date_added)
             VALUES (?1, ?2, ?3, CURRENT_TIMESTAMP)",
            params![release_id, rating.unwrap_or(0), notes],
        )?;
        Ok(())
    }

    pub fn get_collection_count(&self) -> Result<u32> {
        let count: u32 = self.conn.query_row(
            "SELECT COUNT(*) FROM collection_items",
            [],
            |row| row.get(0),
        )?;
        Ok(count)
    }

    pub fn get_wants_count(&self) -> Result<u32> {
        let count: u32 = self.conn.query_row(
            "SELECT COUNT(*) FROM wants",
            [],
            |row| row.get(0),
        )?;
        Ok(count)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[test]
    fn test_database_creation() {
        let temp_dir = tempdir().unwrap();
        let db_path = temp_dir.path().join("test.db");
        
        let result = PriceDatabase::new(Some(db_path.to_str().unwrap()));
        assert!(result.is_ok());
    }

    #[test]
    fn test_database_migrations() {
        let temp_dir = tempdir().unwrap();
        let db_path = temp_dir.path().join("test_migrations.db");
        
        let db = PriceDatabase::new(Some(db_path.to_str().unwrap()));
        assert!(db.is_ok());
        
        // Verify tables were created
        let db = db.unwrap();
        let result = db.get_collection_count();
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), 0);
    }

    #[test]
    fn test_basic_database_operations() {
        let temp_dir = tempdir().unwrap();
        let db_path = temp_dir.path().join("test_ops.db");
        
        let mut db = PriceDatabase::new(Some(db_path.to_str().unwrap())).unwrap();
        
        // Test adding a release
        let release = ReleaseInfo {
            id: 123456,
            title: "Test Album".to_string(),
            artist: "Test Artist".to_string(),
            year: 2023,
            format: "Vinyl".to_string(),
            thumb_url: "https://example.com/thumb.jpg".to_string(),
            added_date: "2023-01-01".to_string(),
        };
        
        let result = db.add_or_update_release(&release);
        assert!(result.is_ok());
        
        // Test retrieving the release
        let retrieved = db.get_release(123456);
        assert!(retrieved.is_ok());
        let retrieved = retrieved.unwrap();
        assert!(retrieved.is_some());
        
        let retrieved = retrieved.unwrap();
        assert_eq!(retrieved.id, 123456);
        assert_eq!(retrieved.title, "Test Album");
        assert_eq!(retrieved.artist, "Test Artist");
    }
}