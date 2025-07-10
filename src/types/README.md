# Types

This directory contains TypeScript type definitions and interfaces used throughout the application. These types ensure type safety, provide clear contracts between modules, and serve as documentation for data structures.

## Files

### `index.ts`
**Purpose**: Central export point for all TypeScript types and interfaces  
**Organization**: Types are logically grouped by their domain (Discogs API, Database, Application)

## Type Categories

### Discogs API Types

These types mirror the structure of data returned by the Discogs API:

**Core Entities**:
```typescript
interface DiscogsArtist {
  name: string;
  id: number;
  resource_url: string;
}

interface DiscogsFormat {
  name: string;        // "Vinyl", "CD", etc.
  qty: string;         // Quantity
  descriptions?: string[];  // "LP", "Album", etc.
}

interface DiscogsBasicInformation {
  id: number;
  title: string;
  year: number;
  formats: DiscogsFormat[];
  artists: DiscogsArtist[];
  genres: string[];
  styles: string[];
  // ... additional fields
}
```

**Collection Types**:
```typescript
interface DiscogsCollectionItem {
  id: number;
  instance_id: number;
  folder_id: number;
  rating: number;
  basic_information: DiscogsBasicInformation;
  date_added: string;
}

interface DiscogsFolder {
  id: number;
  name: string;
  count: number;
  resource_url: string;
}
```

**Marketplace Types**:
```typescript
interface DiscogsMarketplaceListing {
  id: number;
  price: {
    value: number;
    currency: string;
  };
  condition: string;
  seller: {
    username: string;
    stats: {
      rating: string;
      total: number;
    };
  };
}

interface DiscogsMarketplaceStats {
  lowest_price: number;
  currency: string;
  for_sale: number;
  blocked_from_sale: boolean;
}
```

**API Response Types**:
```typescript
interface DiscogsPagination {
  page: number;
  pages: number;
  per_page: number;
  items: number;
  urls: {
    last?: string;
    next?: string;
  };
}

interface DiscogsCollectionResponse {
  pagination: DiscogsPagination;
  releases: DiscogsCollectionItem[];
}
```

### Application Types

Internal types used by the application logic:

**Database Models**:
```typescript
interface ReleaseInfo {
  id: number;
  title: string;
  artist: string;
  year: number;
  format: string;
  thumb_url?: string;
  added_date: string;
}

interface PriceRecord {
  release_id: number;
  price: number;
  currency: string;
  condition: string;
  listing_count: number;
  wants_count: number;
  timestamp: string;
}
```

**Analysis Results**:
```typescript
interface PriceChangeResult {
  release: ReleaseInfo;
  old_price: number;
  new_price: number;
  change_amount: number;
  change_percent: number;
  days_since_change: number;
}

interface HighDemandResult {
  release: ReleaseInfo;
  current_price: number;
  wants_count: number;
  demand_score: number;  // wants/price ratio
  listing_count: number;
}
```

### Worker Types

Types for the multi-threading system:

```typescript
interface WorkerTask {
  id: string;
  type: string;
  data: any;
  retries?: number;
  timeout?: number;
}

interface WorkerResult {
  taskId: string;
  success: boolean;
  data?: any;
  error?: string;
  duration: number;
}
```

### Configuration Types

Types for application configuration:

```typescript
interface DiscogsCredentials {
  token: string;
  username: string;
}

interface TrackingConfig {
  checkInterval: number;           // Hours between checks
  minPriceChangePercent: number;   // Minimum change to track
  maxThreads: number;              // Max worker threads
  batchSize: number;               // Items per batch
}
```

## Type Safety Benefits

### Compile-Time Validation
- **API Contracts**: Ensures API responses match expected structure
- **Database Schema**: Validates database operations at compile time
- **Parameter Validation**: Catches parameter mismatches early
- **Refactoring Safety**: IDE support for safe code changes

### Documentation
- **Self-Documenting**: Types serve as inline documentation
- **IDE Support**: IntelliSense and autocomplete for better DX
- **Contract Clarity**: Clear interfaces between modules
- **Example Usage**: Types show exactly what data is expected

### Runtime Safety
- **Data Validation**: Combined with runtime checks for robust operation
- **Error Prevention**: Prevents common data-related bugs
- **API Evolution**: Safe handling of API changes
- **Null Safety**: Explicit handling of optional fields

## Usage Patterns

### Type Guards
```typescript
function isDiscogsCollectionItem(item: any): item is DiscogsCollectionItem {
  return item && 
         typeof item.id === 'number' &&
         typeof item.instance_id === 'number' &&
         item.basic_information;
}
```

### Generic Types
```typescript
interface APIResponse<T> {
  data: T;
  pagination?: DiscogsPagination;
  success: boolean;
  error?: string;
}
```

### Utility Types
```typescript
type PartialRelease = Partial<ReleaseInfo>;
type RequiredPriceFields = Pick<PriceRecord, 'release_id' | 'price' | 'timestamp'>;
```

## Maintenance Guidelines

### Adding New Types
1. **Domain Grouping**: Organize by logical domain (API, DB, App)
2. **Naming Convention**: Use descriptive, consistent names
3. **Documentation**: Include JSDoc comments for complex types
4. **Validation**: Consider runtime validation needs
5. **Backwards Compatibility**: Plan for API evolution

### Type Evolution
1. **Optional Fields**: Use `?` for fields that may not exist
2. **Union Types**: Support multiple possible values
3. **Generic Types**: Create reusable type patterns
4. **Deprecation**: Mark deprecated fields clearly
5. **Migration**: Provide migration paths for breaking changes

### Best Practices
1. **Strict Mode**: Use strict TypeScript settings
2. **No Any**: Avoid `any` type; use `unknown` when needed
3. **Immutability**: Prefer `readonly` for data that shouldn't change
4. **Composition**: Build complex types from simple ones
5. **Testing**: Validate types with actual API data