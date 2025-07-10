# Database Layer

This directory contains the database abstraction layer for the Discogs Price Tracker. It uses SQLite with better-sqlite3 for fast, reliable local data storage and includes an automatic migration system.

## Files

### `database.ts`
**Purpose**: Main database class providing CRUD operations and data analysis  
**Key Features**:
- **Release Management**: Add, update, and retrieve release information
- **Price Tracking**: Store and analyze price history over time
- **Collection Management**: Track collection items across multiple folders
- **Wantlist Management**: Monitor wanted items and demand metrics
- **Analytics**: Calculate trends, high-demand items, and value changes

**Core Methods**:
```typescript
// Release operations
addOrUpdateRelease(release: ReleaseInfo): void
getRelease(id: number): ReleaseInfo | null

// Price history
addPriceRecord(record: PriceRecord): void
getPriceHistory(releaseId: number, days?: number): PriceRecord[]
getLatestPrice(releaseId: number): PriceRecord | null

// Analysis methods
getPriceChanges(minChangePercent: number): PriceChangeResult[]
getHighDemandReleases(minWants: number): HighDemandResult[]
```

### `migrations.ts`
**Purpose**: Database schema migration system  
**Key Features**:
- **Automatic Migration**: Runs migrations on database initialization
- **Version Control**: Tracks applied migrations to prevent conflicts
- **Backup Creation**: Creates backups before applying migrations
- **Rollback Safety**: Maintains data integrity during schema changes

**Migration System**:
- Migrations are defined as objects with `name`, `version`, and `up` function
- Applied migrations are tracked in a `migrations` table
- Each migration is atomic and reversible
- Automatic backup creation before applying migrations

## Database Schema

### Core Tables

**`releases`**
- Stores basic release information (title, artist, year, format)
- Links to Discogs release IDs for API integration
- Tracks when records were added and last updated

**`price_history`**
- Time-series data for marketplace prices
- Includes price, currency, condition, and timestamp
- Tracks listing count and wants count for demand analysis

**`collection_items`**
- Maps releases to collection folders
- Tracks when items were added to collection
- Supports multiple folders per user

**`wants`**
- Stores wantlist items with timestamps
- Links to release information
- Used for demand analysis and trending

**`migrations`**
- Tracks applied database migrations
- Ensures migrations run only once
- Maintains schema version history

### Indexes

Strategic indexes for performance:
- `price_history.release_id` for fast price lookups
- `price_history.timestamp` for time-based queries
- `collection_items.folder_id` for folder-based filtering
- Composite indexes for complex analytics queries

## Usage Patterns

### Initialization
```typescript
const db = new PriceDatabase(); // Uses default path
// or
const db = new PriceDatabase('/custom/path/to/db'); // Custom path
```

### Data Operations
```typescript
// Add release and price data
db.addOrUpdateRelease(releaseInfo);
db.addPriceRecord(priceRecord);

// Query data
const history = db.getPriceHistory(releaseId, 30); // Last 30 days
const trends = db.getPriceChanges(5); // 5% minimum change
```

### Analytics
```typescript
// Identify valuable records
const increasing = db.getIncreasingValueRecords(10); // 10% increase
const highDemand = db.getHighDemandReleases(50); // 50+ wants
```

## Performance Considerations

1. **Connection Management**: Single connection per database instance
2. **Prepared Statements**: All queries use prepared statements for performance
3. **Batch Operations**: Bulk inserts for large datasets
4. **Index Usage**: Strategic indexing for common query patterns
5. **Memory Management**: Efficient memory usage with streaming for large results

## Migration Guidelines

When adding new migrations:

1. **Incremental**: Make small, focused changes
2. **Backwards Compatible**: Avoid breaking existing data
3. **Tested**: Test migrations with real data
4. **Documented**: Include clear descriptions of changes
5. **Atomic**: Each migration should be a complete unit

## Error Handling

The database layer provides robust error handling:
- **Connection Errors**: Graceful handling of database unavailability
- **Constraint Violations**: Clear error messages for data integrity issues
- **Migration Failures**: Rollback and recovery mechanisms
- **Disk Space**: Monitoring and alerts for storage issues

## Testing

Database operations are thoroughly tested with:
- **Unit Tests**: Individual method functionality
- **Integration Tests**: End-to-end workflows
- **Migration Tests**: Schema change validation
- **Performance Tests**: Query optimization verification