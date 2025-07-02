import type { Database } from 'better-sqlite3';

export interface Migration {
  version: number;
  name: string;
  up: string;
  down?: string;
}

export const migrations: Migration[] = [
  {
    version: 1,
    name: 'initial_schema',
    up: `
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
    `
  },
  {
    version: 2,
    name: 'add_collection_tracking',
    up: `
      CREATE TABLE IF NOT EXISTS collection_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        release_id INTEGER NOT NULL,
        folder_id INTEGER NOT NULL,
        folder_name TEXT NOT NULL,
        instance_id INTEGER UNIQUE,
        added_date TEXT NOT NULL,
        notes TEXT,
        FOREIGN KEY (release_id) REFERENCES releases(id)
      );

      CREATE TABLE IF NOT EXISTS wants (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        release_id INTEGER NOT NULL,
        added_date TEXT NOT NULL,
        notes TEXT,
        FOREIGN KEY (release_id) REFERENCES releases(id)
      );

      CREATE INDEX IF NOT EXISTS idx_collection_items_release_id ON collection_items(release_id);
      CREATE INDEX IF NOT EXISTS idx_collection_items_folder_id ON collection_items(folder_id);
      CREATE INDEX IF NOT EXISTS idx_wants_release_id ON wants(release_id);
    `
  },
  {
    version: 3,
    name: 'add_wants_count_to_price_history',
    up: `
      ALTER TABLE price_history ADD COLUMN wants_count INTEGER DEFAULT 0;
    `
  }
];

export class DatabaseMigrator {
  private db: Database;

  constructor(db: Database) {
    this.db = db;
    this.initializeMigrationsTable();
  }

  private initializeMigrationsTable(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        applied_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);
  }

  getCurrentVersion(): number {
    const result = this.db.prepare(`
      SELECT version FROM schema_migrations ORDER BY version DESC LIMIT 1
    `).get() as { version: number } | undefined;
    
    return result?.version || 0;
  }

  migrate(): void {
    const currentVersion = this.getCurrentVersion();
    const pendingMigrations = migrations.filter(m => m.version > currentVersion);

    if (pendingMigrations.length === 0) {
      return;
    }

    console.log(`Running ${pendingMigrations.length} database migrations...`);

    this.db.transaction(() => {
      for (const migration of pendingMigrations) {
        try {
          this.db.exec(migration.up);
          this.db.prepare(`
            INSERT INTO schema_migrations (version, name) VALUES (?, ?)
          `).run(migration.version, migration.name);
          
          console.log(`✓ Applied migration: ${migration.name}`);
        } catch (error) {
          console.error(`✗ Failed to apply migration ${migration.name}:`, error);
          throw error;
        }
      }
    })();

    console.log('Database migrations completed');
  }

  rollback(targetVersion: number): void {
    const currentVersion = this.getCurrentVersion();
    const migrationsToRollback = migrations
      .filter(m => m.version > targetVersion && m.version <= currentVersion)
      .reverse();

    if (migrationsToRollback.length === 0) {
      return;
    }

    this.db.transaction(() => {
      for (const migration of migrationsToRollback) {
        if (migration.down) {
          this.db.exec(migration.down);
        }
        this.db.prepare(`
          DELETE FROM schema_migrations WHERE version = ?
        `).run(migration.version);
      }
    })();
  }
}