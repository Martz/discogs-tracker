# Commands

This directory contains the implementation of all CLI commands for the Discogs Price Tracker. Each command is implemented as a separate module that exports a Commander.js command object.

## Command Structure

Each command file follows a consistent pattern:
- Imports necessary dependencies
- Creates a command using Commander.js
- Defines options and arguments
- Implements the action handler
- Exports the command for registration in `cli.ts`

## Available Commands

### `config.ts`
**Purpose**: Configure Discogs credentials and application settings  
**Usage**: `discogs-tracker config [--show]`  
**Features**:
- Interactive setup of Discogs username and personal access token
- Configuration of tracking intervals and price change thresholds
- Display current configuration with masked credentials

### `sync.ts`
**Purpose**: Synchronize collection data and fetch current marketplace prices  
**Usage**: `discogs-tracker sync [options]`  
**Features**:
- Multi-threaded price fetching for improved performance
- Configurable thread count and batch size
- Force update option to refresh all prices
- Progress indicators for large collections

### `trends.ts`
**Purpose**: Analyze price trends and identify records increasing in value  
**Usage**: `discogs-tracker trends [options]`  
**Features**:
- Configurable minimum change percentage threshold
- Show all changes (including decreases) or just increases
- Historical price comparison over time

### `value.ts`
**Purpose**: Display collection value and statistics  
**Usage**: `discogs-tracker value [options]`  
**Features**:
- Total collection value calculation
- Breakdown by format (Vinyl, CD, etc.)
- Top N most valuable records
- Value change over time

### `list.ts`
**Purpose**: List and search records in the collection  
**Usage**: `discogs-tracker list [options]`  
**Features**:
- Search functionality by artist, title, or other fields
- Filtering and sorting options
- Detailed record information display

### `history.ts`
**Purpose**: Show price history for specific releases  
**Usage**: `discogs-tracker history <release-id>`  
**Features**:
- Time-series price data visualization
- Price change trends over time
- Historical marketplace statistics

### `demand.ts`
**Purpose**: Analyze demand and identify optimal sell candidates  
**Usage**: `discogs-tracker demand [options]`  
**Features**:
- High-demand record identification based on wants count
- Optimal sell candidate calculation using demand score
- Minimum wants threshold filtering
- Separate analysis types (demand only, sell candidates only)

### `migrate.ts`
**Purpose**: Manage database schema migrations  
**Usage**: `discogs-tracker migrate [options]`  
**Features**:
- Check migration status
- Apply pending migrations
- Database backup before migrations

## Command Implementation Guidelines

When adding new commands:

1. **Follow the naming convention**: Use descriptive, action-oriented names
2. **Consistent option naming**: Use standard option patterns (e.g., `-v/--verbose`, `-f/--force`)
3. **Error handling**: Provide clear, actionable error messages
4. **Progress feedback**: Use ora spinners for long-running operations
5. **Validation**: Validate user input before processing
6. **Help text**: Include meaningful descriptions and examples
7. **Testing**: Write comprehensive tests for command logic

## Dependencies

Commands commonly use:
- **Commander.js**: CLI argument parsing and command definition
- **Inquirer**: Interactive prompts for user input
- **Chalk**: Terminal text styling and colors
- **Ora**: Terminal spinners for progress indication
- **CLI-table3**: Formatted table output

## Integration Points

Commands interact with:
- **Database layer** (`../db/`) for data persistence
- **Services** (`../services/`) for external API calls
- **Utilities** (`../utils/`) for formatting and configuration
- **Workers** (`../workers/`) for parallel processing