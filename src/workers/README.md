# Workers

This directory contains the multi-threading implementation for parallel processing of API requests. The worker system allows the application to efficiently sync large collections by parallelizing price fetching while respecting API rate limits.

## Files

### `price-fetcher.ts`
**Purpose**: Worker thread script for fetching marketplace prices from the Discogs API  
**Key Features**:
- **Parallel Processing**: Runs in separate threads to avoid blocking the main process
- **Rate Limiting**: Implements per-worker rate limiting to respect API constraints
- **Error Handling**: Robust error handling with retry logic and exponential backoff
- **Data Transformation**: Processes raw API responses into application data structures

## Worker Architecture

### Thread Model
The application uses Node.js Worker Threads for true parallelism:
- **Main Thread**: Manages the worker pool and coordinates tasks
- **Worker Threads**: Execute individual price fetching tasks
- **Communication**: Message passing between main thread and workers
- **Isolation**: Each worker has its own memory space and context

### Task Distribution
Tasks are distributed to workers using a sophisticated queuing system:
```typescript
interface WorkerTask {
  id: string;
  type: 'price-fetch';
  data: {
    releaseId: number;
    token: string;
    username: string;
  };
  retries?: number;
  timeout?: number;
}
```

### Result Aggregation
Workers return standardized results that are aggregated by the main thread:
```typescript
interface WorkerResult {
  taskId: string;
  success: boolean;
  data?: {
    releaseId: number;
    price: number;
    currency: string;
    condition: string;
    listingCount: number;
    wantsCount: number;
    timestamp: string;
  };
  error?: string;
  duration: number;
}
```

## Price Fetching Process

### API Integration
Each worker makes requests to multiple Discogs API endpoints:

1. **Marketplace Stats**: `GET /marketplace/stats/{release_id}`
   - Lowest price and currency
   - Number of items for sale
   - Price history statistics

2. **Release Stats**: `GET /releases/{release_id}/stats`
   - Number of people who want this release
   - Community rating information
   - Have/want ratio

3. **Marketplace Search**: `GET /marketplace/search?release_id={id}`
   - Current marketplace listings
   - Price distribution analysis
   - Seller information

### Data Processing
Workers process and normalize the API responses:
- **Price Extraction**: Find the lowest available price
- **Condition Filtering**: Focus on specific conditions (VG+, NM, etc.)
- **Currency Conversion**: Normalize currencies when needed
- **Data Validation**: Ensure data integrity before returning results

### Error Handling
Comprehensive error handling for various scenarios:
- **Network Errors**: Timeout and connection failures
- **API Errors**: Rate limiting, authentication, and API-specific errors
- **Data Errors**: Invalid or missing data in API responses
- **Resource Errors**: Memory or processing limitations

## Performance Optimizations

### Connection Pooling
Workers maintain HTTP connection pools for efficiency:
- **Keep-Alive**: Reuse connections to reduce overhead
- **Pool Size**: Optimal connection pool sizing
- **Timeout Management**: Proper connection timeout handling
- **Resource Cleanup**: Automatic cleanup of stale connections

### Request Batching
Where possible, workers batch related requests:
- **Release Groups**: Process related releases together
- **API Efficiency**: Minimize API call overhead
- **Rate Limit Optimization**: Maximize rate limit utilization
- **Response Caching**: Cache stable data to reduce requests

### Memory Management
Efficient memory usage in worker threads:
- **Garbage Collection**: Explicit memory management
- **Buffer Reuse**: Reuse buffers for API responses
- **Memory Monitoring**: Track memory usage per worker
- **Leak Prevention**: Prevent memory leaks in long-running workers

## Rate Limiting Strategy

### Global Rate Limiting
The system implements sophisticated rate limiting:
- **API Limits**: Respects Discogs API limits (60 requests/minute)
- **Burst Handling**: Allows short bursts with backoff
- **Fair Distribution**: Distributes rate limit across all workers
- **Adaptive Throttling**: Adjusts based on API response times

### Per-Worker Limits
Each worker maintains its own rate limiting:
```typescript
class RateLimiter {
  private requests: number = 0;
  private windowStart: number = Date.now();
  private readonly maxRequests: number = 10; // Per worker per minute
  
  async checkLimit(): Promise<void> {
    // Implementation details...
  }
}
```

### Backoff Strategies
Multiple backoff strategies for different scenarios:
- **Exponential Backoff**: For rate limit violations
- **Linear Backoff**: For temporary network issues
- **Random Jitter**: To prevent thundering herd problems
- **Circuit Breaker**: For persistent API failures

## Worker Pool Management

### Dynamic Scaling
The worker pool can dynamically adjust its size:
- **Load-Based Scaling**: Scale based on task queue length
- **Performance Monitoring**: Monitor worker performance metrics
- **Resource Constraints**: Consider CPU and memory availability
- **API Constraints**: Respect API rate limits when scaling

### Health Monitoring
Continuous monitoring of worker health:
- **Performance Metrics**: Track request duration and success rates
- **Error Rates**: Monitor and alert on high error rates
- **Resource Usage**: Track CPU and memory usage per worker
- **API Response Times**: Monitor API performance trends

### Fault Tolerance
Robust handling of worker failures:
- **Worker Recovery**: Automatic restart of failed workers
- **Task Redistribution**: Reassign tasks from failed workers
- **Graceful Degradation**: Reduce parallelism if needed
- **State Recovery**: Recover partial state from worker crashes

## Usage Examples

### Basic Price Fetching
```typescript
// In main thread
const pool = new WorkerPool(8, './workers/price-fetcher.js');
const task: WorkerTask = {
  id: 'price-123456',
  type: 'price-fetch',
  data: { releaseId: 123456, token, username }
};
const result = await pool.addTask(task);
```

### Batch Processing
```typescript
// Process multiple releases efficiently
const tasks = releaseIds.map(id => ({
  id: `price-${id}`,
  type: 'price-fetch',
  data: { releaseId: id, token, username }
}));
const results = await pool.addBatch(tasks);
```

### Progress Monitoring
```typescript
pool.onProgress((progress) => {
  console.log(`Progress: ${progress.completed}/${progress.total}`);
  console.log(`Success rate: ${progress.successRate}%`);
  console.log(`Average duration: ${progress.avgDuration}ms`);
});
```

## Configuration

### Worker Pool Settings
```typescript
interface WorkerPoolConfig {
  maxWorkers: number;        // Maximum number of worker threads
  taskTimeout: number;       // Timeout for individual tasks
  retryAttempts: number;     // Number of retry attempts
  rateLimitPerWorker: number; // API calls per worker per minute
  queueSize: number;         // Maximum task queue size
}
```

### Performance Tuning
- **Thread Count**: Optimal number based on CPU cores and API limits
- **Batch Size**: Balance between efficiency and memory usage
- **Timeout Values**: Appropriate timeouts for different operations
- **Retry Logic**: Intelligent retry strategies for different error types

## Testing

### Unit Tests
- **Worker Logic**: Test individual worker functions
- **Rate Limiting**: Verify rate limiting behavior
- **Error Handling**: Test various error scenarios
- **Data Processing**: Validate data transformation logic

### Integration Tests
- **Pool Management**: Test worker pool lifecycle
- **Task Distribution**: Verify fair task distribution
- **Performance**: Load testing with realistic workloads
- **Fault Tolerance**: Test recovery from various failures

### Performance Tests
- **Throughput**: Measure tasks processed per second
- **Latency**: Track task completion times
- **Resource Usage**: Monitor CPU and memory consumption
- **Scalability**: Test behavior with varying workloads