import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import type { PriceRecord, ReleaseInfo } from '../types/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class PriceDatabase {
  private db: Database.Database;

  constructor(dbPath?: string) {
    const dataDir = join(__dirname, '../../data');
    if (!existsSync(dataDir)) {
      mkdirSync(dataDir, { recursive: true });
    }

    const dbFile = dbPath || join(dataDir, 'prices.db');
    this.db = new Database(dbFile);
    this.initialize();
  }

  private initialize(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS releases (
        id INTEGER PRIMARY KEY,
        title TEXT NOT NULL,
        artist TEXT NOT NULL,
        year INTEGER,
        format TEXT,
        thumb_url TEXT,
        added_date TEXT NOT NULL,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS price_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        release_id INTEGER NOT NULL,
        price REAL NOT NULL,
        currency TEXT NOT NULL,
        condition TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        listing_count INTEGER DEFAULT 0,
        FOREIGN KEY (release_id) REFERENCES releases(id)
      );

      CREATE INDEX IF NOT EXISTS idx_price_history_release_id ON price_history(release_id);
      CREATE INDEX IF NOT EXISTS idx_price_history_timestamp ON price_history(timestamp);
    `);
  }

  addOrUpdateRelease(release: ReleaseInfo): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO releases (id, title, artist, year, format, thumb_url, added_date, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `);
    
    stmt.run(
      release.id,
      release.title,
      release.artist,
      release.year,
      release.format,
      release.thumb_url,
      release.added_date
    );
  }

  addPriceRecord(record: PriceRecord): void {
    const stmt = this.db.prepare(`
      INSERT INTO price_history (release_id, price, currency, condition, timestamp, listing_count)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      record.release_id,
      record.price,
      record.currency,
      record.condition,
      record.timestamp,
      record.listing_count
    );
  }

  getLatestPrice(releaseId: number): PriceRecord | null {
    const stmt = this.db.prepare(`
      SELECT * FROM price_history
      WHERE release_id = ?
      ORDER BY timestamp DESC
      LIMIT 1
    `);
    
    return stmt.get(releaseId) as PriceRecord | null;
  }

  getPriceHistory(releaseId: number, days: number = 30): PriceRecord[] {
    const stmt = this.db.prepare(`
      SELECT * FROM price_history
      WHERE release_id = ?
        AND timestamp >= datetime('now', '-' || ? || ' days')
      ORDER BY timestamp ASC
    `);
    
    return stmt.all(releaseId, days) as PriceRecord[];
  }

  getReleaseInfo(releaseId: number): ReleaseInfo | null {
    const stmt = this.db.prepare(`
      SELECT * FROM releases WHERE id = ?
    `);
    
    return stmt.get(releaseId) as ReleaseInfo | null;
  }

  getAllReleases(): ReleaseInfo[] {
    const stmt = this.db.prepare(`
      SELECT * FROM releases ORDER BY artist, title
    `);
    
    return stmt.all() as ReleaseInfo[];
  }

  getReleasesWithPriceChange(minChangePercent: number = 5): Array<{
    release: ReleaseInfo;
    current_price: number;
    previous_price: number;
    change_percent: number;
  }> {
    const stmt = this.db.prepare(`
      WITH latest_prices AS (
        SELECT 
          release_id,
          price,
          timestamp,
          ROW_NUMBER() OVER (PARTITION BY release_id ORDER BY timestamp DESC) as rn
        FROM price_history
      ),
      price_comparison AS (
        SELECT 
          l1.release_id,
          l1.price as current_price,
          l2.price as previous_price,
          ((l1.price - l2.price) / l2.price) * 100 as change_percent
        FROM latest_prices l1
        JOIN latest_prices l2 ON l1.release_id = l2.release_id
        WHERE l1.rn = 1 AND l2.rn = 2
      )
      SELECT 
        r.*,
        pc.current_price,
        pc.previous_price,
        pc.change_percent
      FROM releases r
      JOIN price_comparison pc ON r.id = pc.release_id
      WHERE ABS(pc.change_percent) >= ?
      ORDER BY pc.change_percent DESC
    `);
    
    return stmt.all(minChangePercent) as any[];
  }

  getIncreasingValueReleases(minChangePercent: number = 5): Array<{
    release: ReleaseInfo;
    current_price: number;
    previous_price: number;
    change_percent: number;
  }> {
    const results = this.getReleasesWithPriceChange(minChangePercent);
    return results.filter(r => r.change_percent > 0);
  }

  close(): void {
    this.db.close();
  }
}