# Services

This directory contains service classes that handle integration with external APIs and services. The primary service is the Discogs API integration, which provides access to collection data and marketplace information.

## Files

### `discogs.ts`
**Purpose**: Discogs API client for fetching collection and marketplace data  
**Key Features**:
- **Authentication**: Token-based authentication with Discogs API
- **Rate Limiting**: Respects Discogs API rate limits and implements backoff
- **Data Fetching**: Comprehensive API methods for all needed endpoints
- **Error Handling**: Robust error handling with retry logic
- **Type Safety**: Full TypeScript integration with Discogs API responses

## Discogs Service API

### Core Methods

**Collection Management**:
```typescript
getFolders(): Promise<DiscogsFolder[]>
getCollection(folderId: number): Promise<DiscogsCollectionItem[]>
getCollectionValue(): Promise<DiscogsCollectionValue>
```

**Wantlist Operations**:
```typescript
getWantlist(): Promise<DiscogsWantlistItem[]>
getWantlistValue(): Promise<DiscogsWantlistValue>
```

**Marketplace Data**:
```typescript
getMarketplaceStats(releaseId: number): Promise<DiscogsMarketplaceStats>
getMarketplaceListing(releaseId: number): Promise<DiscogsMarketplaceListing[]>
getLowNumForSale(releaseId: number): Promise<number>
```

**Release Information**:
```typescript
getRelease(releaseId: number): Promise<DiscogsRelease>
getMaster(masterId: number): Promise<DiscogsMaster>
```

### Authentication

The service requires:
- **Personal Access Token**: Obtained from Discogs developer settings
- **Username**: Your Discogs username for API access

Authentication is handled automatically with each request:
```typescript
const service = new DiscogsService(token, username);
```

### Rate Limiting

The Discogs API has rate limits that the service respects:
- **Rate Limits**: 60 requests per minute for authenticated users
- **Burst Limits**: Short bursts allowed with exponential backoff
- **Retry Logic**: Automatic retry with increasing delays
- **Queue Management**: Request queuing to prevent rate limit violations

### Error Handling

Comprehensive error handling for:
- **Network Errors**: Connection timeouts and network failures
- **API Errors**: HTTP status codes and API-specific errors
- **Rate Limits**: Automatic retry when rate limited
- **Authentication**: Clear messages for invalid credentials
- **Data Validation**: Validation of API response structure

### Data Transformation

The service transforms raw Discogs API responses into application-friendly formats:
- **Normalization**: Consistent data structure across endpoints
- **Type Conversion**: Proper TypeScript types for all data
- **Validation**: Runtime validation of critical fields
- **Sanitization**: Clean and validate incoming data

## API Endpoints Used

### Collection Endpoints
- `GET /users/{username}/collection/folders` - List collection folders
- `GET /users/{username}/collection/folders/{folder_id}/releases` - Folder contents
- `GET /users/{username}/collection/value` - Collection value estimate

### Wantlist Endpoints
- `GET /users/{username}/wants` - User's wantlist
- `GET /users/{username}/wants/{release_id}` - Specific want details

### Marketplace Endpoints
- `GET /marketplace/stats/{release_id}` - Marketplace statistics
- `GET /marketplace/search` - Search marketplace listings
- `GET /releases/{release_id}/stats` - Release statistics

### Release Endpoints
- `GET /releases/{release_id}` - Release details
- `GET /masters/{master_id}` - Master release details

## Configuration

Service configuration is managed through the application's config system:
```typescript
// Credentials
const { token, username } = getDiscogsCredentials();

// API settings
const service = new DiscogsService(token, username);
```

## Usage Patterns

### Basic Collection Sync
```typescript
const service = new DiscogsService(token, username);
const folders = await service.getFolders();

for (const folder of folders) {
  const items = await service.getCollection(folder.id);
  // Process collection items
}
```

### Price Fetching
```typescript
const stats = await service.getMarketplaceStats(releaseId);
const priceRecord: PriceRecord = {
  release_id: releaseId,
  price: stats.lowest_price,
  currency: stats.currency,
  // ... other fields
};
```

### Error Handling
```typescript
try {
  const data = await service.getCollection(folderId);
} catch (error) {
  if (error.status === 429) {
    // Rate limited - will be retried automatically
    console.log('Rate limited, retrying...');
  } else {
    // Handle other errors
    console.error('API error:', error.message);
  }
}
```

## Performance Optimizations

1. **Connection Pooling**: Reuses HTTP connections for efficiency
2. **Request Batching**: Groups related requests when possible
3. **Caching**: Intelligent caching of stable data (release info)
4. **Parallel Requests**: Uses worker pools for concurrent API calls
5. **Compression**: Enables HTTP compression for large responses

## Testing

Service testing includes:
- **Mock API Responses**: Unit tests with mocked HTTP responses
- **Integration Tests**: Real API calls with test data
- **Error Scenarios**: Testing all error conditions
- **Rate Limit Testing**: Verification of rate limiting behavior
- **Performance Testing**: Load testing with realistic data volumes

## Future Extensions

The service architecture supports future enhancements:
- **Additional APIs**: Easy integration of other music marketplace APIs
- **Caching Layer**: Redis or similar for improved performance
- **Webhook Support**: Real-time updates from Discogs
- **Bulk Operations**: Optimized endpoints for large-scale operations