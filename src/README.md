# Source Code Architecture

This directory contains the main source code for the Discogs Price Tracker application. The codebase is organized into several logical modules that separate concerns and make the application maintainable and extensible.

## Overview

The Discogs Price Tracker is a TypeScript CLI application that helps users track the prices of their Discogs collection over time. It uses a multi-threaded approach to efficiently sync data from the Discogs API and stores price history in a local SQLite database.

## Directory Structure

```
src/
├── cli.ts              # Main CLI entry point
├── commands/           # CLI command implementations
├── db/                 # Database layer and migrations
├── services/           # External service integrations
├── types/              # TypeScript type definitions
├── utils/              # Utility functions and helpers
└── workers/            # Multi-threading and background tasks
```

## Architecture Components

### Entry Point
- **`cli.ts`** - The main entry point that sets up the CLI using Commander.js, registers all commands, and handles top-level error handling.

### Command Layer (`commands/`)
Each CLI command (sync, trends, value, etc.) is implemented as a separate module. This follows the Single Responsibility Principle and makes commands easy to test and maintain.

### Data Layer (`db/`)
Handles all database operations using SQLite with better-sqlite3. Includes automatic migrations and provides a clean API for data persistence.

### Service Layer (`services/`)
Manages integration with external services, primarily the Discogs API. Handles authentication, rate limiting, and data transformation.

### Type System (`types/`)
Centralized TypeScript definitions ensure type safety across the application and provide clear contracts between modules.

### Utilities (`utils/`)
Shared functionality like configuration management, formatting, and worker pool management.

### Workers (`workers/`)
Multi-threaded price fetching system that allows the application to efficiently sync large collections by parallelizing API calls while respecting rate limits.

## Key Design Patterns

1. **Separation of Concerns** - Each directory has a clear responsibility
2. **Dependency Injection** - Services are injected rather than directly instantiated
3. **Factory Pattern** - Worker pools and database connections are created through factories
4. **Command Pattern** - CLI commands are self-contained modules
5. **Repository Pattern** - Database operations are abstracted through the PriceDatabase class

## Data Flow

1. **CLI Command** → Parses user input and options
2. **Service Layer** → Fetches data from Discogs API
3. **Worker Pool** → Parallelizes price fetching for performance
4. **Database Layer** → Persists data with automatic migrations
5. **Utilities** → Format and present results to user

## Development Guidelines

- Keep commands focused and single-purpose
- Use TypeScript interfaces for all external data
- Handle errors gracefully with user-friendly messages
- Write tests for all business logic
- Follow the existing naming conventions
- Use the provided utilities for common operations

For detailed information about each component, see the README.md files in the respective subdirectories.