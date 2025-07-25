# Cross-Implementation Integration Tests

This directory contains integration tests that verify compatibility between the Rust and TypeScript implementations of discogs-tracker.

## Structure

- `utils/` - Test runner and utility functions
- `cli-commands.test.ts` - CLI command compatibility tests
- `config-management.test.ts` - Configuration compatibility tests
- `sync-workflow.test.ts` - Sync workflow compatibility tests
- `performance.test.ts` - Performance comparison tests
- `error-handling.test.ts` - Error handling compatibility tests

# Test Scripts

```bash
# Run all tests
npm test

# Run only unit tests (excluding cross-implementation)
npm run test:unit

# Run cross-implementation integration tests
npm run test:cross

# Run Rust-specific integration tests
cargo test --test integration_tests

# Run all Rust tests (unit + integration)
cargo test

# Run with coverage
npm run test:coverage
```

## Test Framework

The `CrossImplementationTestRunner` utility provides:

- Building both Rust and TypeScript implementations
- Executing commands with identical arguments
- Comparing outputs and database states
- Performance measurement and comparison
- Mock API server for testing without real API calls