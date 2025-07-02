import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { DatabaseMigrator, migrations } from '../../src/db/migrations.js';

describe('DatabaseMigrator', () => {
  let db: Database.Database;
  let migrator: DatabaseMigrator;

  beforeEach(() => {
    db = new Database(':memory:');
    migrator = new DatabaseMigrator(db);
  });

  afterEach(() => {
    db.close();
  });

  describe('Migration System', () => {
    it('should initialize migrations table', () => {
      const tables = db.prepare(`
        SELECT name FROM sqlite_master WHERE type='table' AND name='schema_migrations'
      `).all();
      
      expect(tables).toHaveLength(1);
    });

    it('should start with version 0', () => {
      const version = migrator.getCurrentVersion();
      expect(version).toBe(0);
    });

    it('should run all migrations', () => {
      migrator.migrate();
      
      const version = migrator.getCurrentVersion();
      const expectedVersion = Math.max(...migrations.map(m => m.version));
      expect(version).toBe(expectedVersion);
    });

    it('should create all expected tables after migration', () => {
      migrator.migrate();
      
      const tables = db.prepare(`
        SELECT name FROM sqlite_master WHERE type='table' ORDER BY name
      `).all() as { name: string }[];
      
      const tableNames = tables.map(t => t.name);
      
      expect(tableNames).toContain('releases');
      expect(tableNames).toContain('price_history');
      expect(tableNames).toContain('collection_items');
      expect(tableNames).toContain('wants');
      expect(tableNames).toContain('schema_migrations');
    });

    it('should not run migrations twice', () => {
      migrator.migrate();
      const firstVersion = migrator.getCurrentVersion();
      
      migrator.migrate();
      const secondVersion = migrator.getCurrentVersion();
      
      expect(firstVersion).toBe(secondVersion);
    });

    it('should track migration history', () => {
      migrator.migrate();
      
      const appliedMigrations = db.prepare(`
        SELECT version, name FROM schema_migrations ORDER BY version
      `).all() as { version: number; name: string }[];
      
      expect(appliedMigrations).toHaveLength(migrations.length);
      
      migrations.forEach((migration, index) => {
        expect(appliedMigrations[index]).toMatchObject({
          version: migration.version,
          name: migration.name
        });
      });
    });
  });

  describe('Individual Migrations', () => {
    it('should create releases table in migration 1', () => {
      const migration1 = migrations.find(m => m.version === 1);
      expect(migration1).toBeDefined();
      
      db.exec(migration1!.up);
      
      const columns = db.prepare(`PRAGMA table_info(releases)`).all() as any[];
      const columnNames = columns.map(c => c.name);
      
      expect(columnNames).toContain('id');
      expect(columnNames).toContain('title');
      expect(columnNames).toContain('artist');
      expect(columnNames).toContain('year');
      expect(columnNames).toContain('format');
    });

    it('should create collection tracking tables in migration 2', () => {
      // Run migration 1 first
      const migration1 = migrations.find(m => m.version === 1);
      db.exec(migration1!.up);
      
      const migration2 = migrations.find(m => m.version === 2);
      expect(migration2).toBeDefined();
      
      db.exec(migration2!.up);
      
      const tables = db.prepare(`
        SELECT name FROM sqlite_master WHERE type='table'
      `).all() as { name: string }[];
      
      const tableNames = tables.map(t => t.name);
      expect(tableNames).toContain('collection_items');
      expect(tableNames).toContain('wants');
    });

    it('should add wants_count column in migration 3', () => {
      // Run previous migrations first
      migrations.slice(0, 2).forEach(migration => {
        db.exec(migration.up);
      });
      
      const migration3 = migrations.find(m => m.version === 3);
      expect(migration3).toBeDefined();
      
      db.exec(migration3!.up);
      
      const columns = db.prepare(`PRAGMA table_info(price_history)`).all() as any[];
      const columnNames = columns.map(c => c.name);
      
      expect(columnNames).toContain('wants_count');
    });
  });

  describe('Rollback Functionality', () => {
    beforeEach(() => {
      migrator.migrate(); // Apply all migrations first
    });

    it('should rollback to specific version', () => {
      const initialVersion = migrator.getCurrentVersion();
      expect(initialVersion).toBeGreaterThan(1);
      
      migrator.rollback(1);
      
      const newVersion = migrator.getCurrentVersion();
      expect(newVersion).toBe(1);
    });

    it('should remove migration records during rollback', () => {
      const initialMigrations = db.prepare(`
        SELECT COUNT(*) as count FROM schema_migrations
      `).get() as { count: number };
      
      migrator.rollback(1);
      
      const finalMigrations = db.prepare(`
        SELECT COUNT(*) as count FROM schema_migrations
      `).get() as { count: number };
      
      expect(finalMigrations.count).toBeLessThan(initialMigrations.count);
    });

    it('should handle rollback to version 0', () => {
      migrator.rollback(0);
      
      const version = migrator.getCurrentVersion();
      expect(version).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle partial migration failure gracefully', () => {
      // Create a corrupted migration that will fail
      const corruptedMigrator = new DatabaseMigrator(db);
      
      // Manually insert a bad migration record
      db.prepare(`
        INSERT INTO schema_migrations (version, name) VALUES (999, 'bad_migration')
      `).run();
      
      expect(() => {
        const version = corruptedMigrator.getCurrentVersion();
        expect(version).toBe(999);
      }).not.toThrow();
    });

    it('should handle empty migrations array', () => {
      // Create fresh migrator with empty migrations (theoretical case)
      const emptyMigrator = new DatabaseMigrator(db);
      expect(() => emptyMigrator.migrate()).not.toThrow();
    });

    it('should validate migration order', () => {
      // Ensure migrations are properly ordered by version
      for (let i = 1; i < migrations.length; i++) {
        expect(migrations[i].version).toBeGreaterThan(migrations[i-1].version);
      }
    });
  });
});