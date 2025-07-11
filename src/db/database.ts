import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { DatabaseMigrator } from './migrations.js';
import { debugDb, debug } from '../utils/logger.js';
import type { PriceRecord, ReleaseInfo } from '../types/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class PriceDatabase {
  private db: Database.Database;

  constructor(dbPath?: string) {
    const dataDir = join(__dirname, '../../data');
    if (!existsSync(dataDir)) {
      mkdirSync(dataDir, { recursive: true });
      debug(`Created data directory: ${dataDir}`);
    }

    const dbFile = dbPath || join(dataDir, 'prices.db');
    debug(`Opening database: ${dbFile}`);
    this.db = new Database(dbFile);
    this.initialize();
  }

  private initialize(): void {
    debug('Initializing database and running migrations...');
    const migrator = new DatabaseMigrator(this.db);
    migrator.migrate();
    debugDb('Database initialized successfully');
  }

  addOrUpdateRelease(release: ReleaseInfo): void {
    debugDb(`Adding/updating release: ${release.id} - ${release.title}`);
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
    debugDb(`Adding price record for release ${record.release_id}: ${record.currency} ${record.price}`);
    const stmt = this.db.prepare(`
      INSERT INTO price_history (release_id, price, currency, condition, timestamp, listing_count, wants_count)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      record.release_id,
      record.price,
      record.currency,
      record.condition,
      record.timestamp,
      record.listing_count,
      record.wantsCount || 0
    );
  }

  addCollectionItem(item: {
    releaseId: number;
    folderId: number;
    folderName: string;
    instanceId: number;
    addedDate: string;
    notes?: string;
  }): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO collection_items (release_id, folder_id, folder_name, instance_id, added_date, notes)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      item.releaseId,
      item.folderId,
      item.folderName,
      item.instanceId,
      item.addedDate,
      item.notes || null
    );
  }

  addWantItem(item: {
    releaseId: number;
    addedDate: string;
    notes?: string;
  }): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO wants (release_id, added_date, notes)
      VALUES (?, ?, ?)
    `);
    
    stmt.run(
      item.releaseId,
      item.addedDate,
      item.notes || null
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

  getCollectionFolders(): Array<{ folderId: number; folderName: string; count: number }> {
    const stmt = this.db.prepare(`
      SELECT folder_id as folderId, folder_name as folderName, COUNT(*) as count
      FROM collection_items
      GROUP BY folder_id, folder_name
    `);
    
    return stmt.all() as any[];
  }

  getWantsCount(): number {
    const stmt = this.db.prepare(`SELECT COUNT(*) as count FROM wants`);
    const result = stmt.get() as { count: number };
    return result.count;
  }

  getHighDemandReleases(minWantsCount: number = 100): Array<{
    release: ReleaseInfo;
    currentPrice: number;
    wantsCount: number;
    demandScore: number;
  }> {
    const stmt = this.db.prepare(`
      WITH latest_prices AS (
        SELECT 
          release_id,
          price,
          wants_count,
          timestamp,
          ROW_NUMBER() OVER (PARTITION BY release_id ORDER BY timestamp DESC) as rn
        FROM price_history
      ),
      demand_analysis AS (
        SELECT 
          r.*,
          lp.price as current_price,
          lp.wants_count,
          ci.folder_name,
          (lp.wants_count * 1.0 / NULLIF(lp.price, 0)) as demand_score
        FROM releases r
        JOIN latest_prices lp ON r.id = lp.release_id
        JOIN collection_items ci ON r.id = ci.release_id
        WHERE lp.rn = 1 
          AND lp.wants_count >= ?
          AND ci.folder_name = 'All'
      )
      SELECT * FROM demand_analysis
      ORDER BY demand_score DESC
    `);
    
    return stmt.all(minWantsCount) as any[];
  }

  getOptimalSellCandidates(options: {
    minPriceChange?: number;
    minWantsCount?: number;
    limit?: number;
  } = {}): Array<{
    release: ReleaseInfo;
    currentPrice: number;
    purchasePrice?: number;
    wantsCount: number;
    priceChange?: number;
    demandScore: number;
    sellScore: number;
  }> {
    const minPriceChange = options.minPriceChange || 0;
    const minWantsCount = options.minWantsCount || 50;
    const limit = options.limit || 20;

    const stmt = this.db.prepare(`
      WITH latest_prices AS (
        SELECT 
          release_id,
          price,
          wants_count,
          timestamp,
          ROW_NUMBER() OVER (PARTITION BY release_id ORDER BY timestamp DESC) as rn
        FROM price_history
      ),
      price_trends AS (
        SELECT 
          l1.release_id,
          l1.price as current_price,
          l1.wants_count,
          l2.price as previous_price,
          ((l1.price - l2.price) / NULLIF(l2.price, 0)) * 100 as price_change_percent
        FROM latest_prices l1
        LEFT JOIN latest_prices l2 ON l1.release_id = l2.release_id AND l2.rn = 2
        WHERE l1.rn = 1
      ),
      sell_analysis AS (
        SELECT 
          r.*,
          pt.current_price,
          pt.previous_price,
          pt.wants_count,
          pt.price_change_percent,
          ci.folder_name,
          (pt.wants_count * 1.0 / NULLIF(pt.current_price, 0)) as demand_score,
          (
            (pt.wants_count * 0.4) + 
            (COALESCE(pt.price_change_percent, 0) * 0.3) + 
            (pt.current_price * 0.3)
          ) as sell_score
        FROM releases r
        JOIN price_trends pt ON r.id = pt.release_id
        JOIN collection_items ci ON r.id = ci.release_id
        WHERE pt.wants_count >= ?
          AND COALESCE(pt.price_change_percent, 0) >= ?
          AND ci.folder_name = 'All'
      )
      SELECT * FROM sell_analysis
      ORDER BY sell_score DESC
      LIMIT ?
    `);
    
    return stmt.all(minWantsCount, minPriceChange, limit) as any[];
  }

  close(): void {
    this.db.close();
  }
}