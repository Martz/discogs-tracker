# Utils

This directory contains utility functions and helper classes that provide common functionality used throughout the application. These utilities promote code reuse and maintain consistency across the codebase.

## Files

### `config.ts`
**Purpose**: Configuration management for application settings and credentials  
**Key Features**:
- **Secure Storage**: Uses OS-appropriate secure storage for credentials
- **Environment Separation**: Different configs for different environments
- **Type Safety**: Fully typed configuration schema
- **Default Values**: Sensible defaults for all configuration options

**Main Functions**:
```typescript
// Credential management
getDiscogsCredentials(): DiscogsCredentials
setDiscogsCredentials(token: string, username: string): void

// Application settings
getTrackingConfig(): TrackingConfig
setTrackingConfig(config: Partial<TrackingConfig>): void

// Full configuration access
getConfig(): ConfigSchema
```

**Configuration Schema**:
- **Discogs Settings**: API token, username
- **Tracking Settings**: Check intervals, price change thresholds
- **Performance Settings**: Thread counts, batch sizes
- **Storage Settings**: Database paths, backup settings

### `formatter.ts`
**Purpose**: Data formatting and display utilities  
**Key Features**:
- **Currency Formatting**: Locale-aware currency display
- **Date/Time Formatting**: Consistent timestamp formatting
- **Table Formatting**: CLI table generation with proper alignment
- **Progress Indicators**: Styled progress bars and spinners
- **Color Coding**: Semantic color usage for different data types

**Main Functions**:
```typescript
// Currency and numbers
formatCurrency(amount: number, currency: string): string
formatPercentage(value: number, decimals?: number): string
formatNumber(value: number): string

// Dates and times
formatDate(date: Date | string): string
formatRelativeTime(date: Date | string): string
formatDuration(milliseconds: number): string

// CLI display
createTable(headers: string[], rows: string[][]): Table
formatPriceChange(oldPrice: number, newPrice: number): string
formatTrendIndicator(change: number): string
```

**Formatting Standards**:
- **Currencies**: Proper locale formatting with symbols
- **Percentages**: Consistent decimal places and +/- indicators
- **Dates**: Human-readable relative dates ("2 days ago")
- **Tables**: Aligned columns with proper spacing
- **Colors**: Green for positive, red for negative, yellow for warnings

### `worker-pool.ts`
**Purpose**: Multi-threading and task management system  
**Key Features**:
- **Thread Pool Management**: Configurable number of worker threads
- **Task Queue**: FIFO task queue with priority support
- **Load Balancing**: Distributes tasks evenly across workers
- **Error Handling**: Automatic retry with exponential backoff
- **Progress Tracking**: Real-time progress monitoring

**Core Classes**:
```typescript
class WorkerPool {
  constructor(maxWorkers: number, workerScript: string)
  
  // Task management
  addTask(task: WorkerTask): Promise<WorkerResult>
  addBatch(tasks: WorkerTask[]): Promise<WorkerResult[]>
  
  // Pool control
  start(): void
  stop(): Promise<void>
  resize(newSize: number): void
  
  // Monitoring
  getStats(): PoolStats
  onProgress(callback: (progress: ProgressInfo) => void): void
}
```

**Task Processing**:
- **Parallel Execution**: Multiple tasks run simultaneously
- **Rate Limiting**: Respects API rate limits across all workers
- **Fault Tolerance**: Failed tasks are retried automatically
- **Resource Management**: Proper cleanup of worker threads
- **Performance Monitoring**: Tracks throughput and error rates

## Utility Categories

### Configuration Management
- **Secure Storage**: OS keychain integration for sensitive data
- **Environment Variables**: Support for .env files and environment overrides
- **Validation**: Schema validation for all configuration values
- **Migration**: Automatic migration of configuration formats

### Data Processing
- **Transformation**: Convert between different data formats
- **Validation**: Runtime validation of external data
- **Sanitization**: Clean and normalize user input
- **Aggregation**: Statistical analysis and data summarization

### CLI Utilities
- **Input Handling**: Robust parsing of command-line arguments
- **Output Formatting**: Consistent styling across all commands
- **Interactive Prompts**: User-friendly input collection
- **Progress Display**: Visual feedback for long-running operations

### Error Handling
- **Standardized Errors**: Consistent error types and messages
- **Logging**: Structured logging with different severity levels
- **Recovery**: Automatic recovery strategies for common failures
- **User Feedback**: Helpful error messages with suggested solutions

## Usage Patterns

### Configuration Access
```typescript
import { getDiscogsCredentials, getTrackingConfig } from '../utils/config.js';

const { token, username } = getDiscogsCredentials();
const { checkInterval } = getTrackingConfig();
```

### Data Formatting
```typescript
import { formatCurrency, formatDate, createTable } from '../utils/formatter.js';

const priceDisplay = formatCurrency(29.99, 'USD');
const dateDisplay = formatDate(new Date());
const table = createTable(['Artist', 'Title', 'Price'], rows);
```

### Worker Pool Usage
```typescript
import { WorkerPool } from '../utils/worker-pool.js';

const pool = new WorkerPool(8, './price-fetcher.js');
const results = await pool.addBatch(priceTasks);
```

## Design Principles

### Single Responsibility
Each utility has a focused, well-defined purpose:
- Configuration utilities only handle configuration
- Formatters only handle display formatting
- Worker pools only handle task parallelization

### Reusability
Utilities are designed for maximum reuse:
- **Generic Interfaces**: Work with various data types
- **Configurable Behavior**: Options for different use cases
- **No Side Effects**: Pure functions where possible
- **Composable**: Can be combined for complex operations

### Performance
Utilities are optimized for performance:
- **Lazy Loading**: Load resources only when needed
- **Caching**: Cache expensive computations
- **Memory Efficiency**: Minimize memory allocations
- **Async Operations**: Non-blocking operations where appropriate

## Testing Strategy

### Unit Tests
- **Pure Functions**: Easy to test with various inputs
- **Mock Dependencies**: Test utilities in isolation
- **Edge Cases**: Comprehensive edge case coverage
- **Performance Tests**: Validate performance characteristics

### Integration Tests
- **Real Configuration**: Test with actual config files
- **Worker Pool Testing**: Multi-threaded test scenarios
- **Error Scenarios**: Test error handling paths
- **Resource Cleanup**: Verify proper resource management

## Best Practices

### Adding New Utilities
1. **Clear Purpose**: Define the specific problem being solved
2. **Consistent API**: Follow existing patterns and conventions
3. **Documentation**: Include comprehensive JSDoc comments
4. **Testing**: Write tests before implementation
5. **Dependencies**: Minimize external dependencies

### Maintenance
1. **Regular Review**: Periodically review for optimization opportunities
2. **Deprecation**: Properly deprecate old utilities before removal
3. **Performance Monitoring**: Track performance in production
4. **Documentation Updates**: Keep documentation current with changes
5. **Breaking Changes**: Follow semantic versioning for changes