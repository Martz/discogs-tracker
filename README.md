# Discogs Price Tracker

A TypeScript CLI application that tracks the prices of your Discogs collection over time, helping you identify records that are increasing in value.

## Features

- Sync your entire Discogs collection (all folders) and wantlist
- Track marketplace prices and wants count over time
- Identify records with increasing values and high demand
- Analyse optimal records to sell based on demand and price trends
- View price history and collection statistics
- SQLite database for time series data storage

## Installation

```bash
npm install
npm run build
npm link  # Makes 'discogs-tracker' available globally
```

## Usage

### 1. Configure credentials

```bash
discogs-tracker config
```

You'll need:
- Your Discogs username
- A personal access token (get one from https://www.discogs.com/settings/developers)

### 2. Sync your collection

```bash
discogs-tracker sync                    # Sync with default settings
discogs-tracker sync -t 16              # Use 16 threads for faster sync
discogs-tracker sync -b 50              # Process 50 items per batch
discogs-tracker sync --force            # Force update all prices
```

This fetches your collection, wantlist, and current marketplace prices. The multi-threaded sync is much faster for large collections.

### 3. View collection value

```bash
# Show total collection value and statistics
discogs-tracker value

# Show value breakdown by format (Vinyl, CD, etc.)
discogs-tracker value -f

# Show top 20 most valuable records
discogs-tracker value -t 20
```

### 4. View price trends

```bash
# Show records increasing in value (default: >5% change)
discogs-tracker trends

# Show records with >10% increase
discogs-tracker trends -m 10

# Show all price changes (including decreases)
discogs-tracker trends --all
```

### 5. Demand analysis

```bash
# Show high-demand records and optimal sell candidates
discogs-tracker demand

# Show records with minimum 100 wants
discogs-tracker demand -w 100

# Show only high-demand analysis
discogs-tracker demand -t demand

# Show only sell candidates
discogs-tracker demand -t sell
```

### 6. Other commands

```bash
# List all records in your collection
discogs-tracker list

# Search for specific records
discogs-tracker list -s "Beatles"

# View price history for a specific release
discogs-tracker history 123456
```

## How it works

1. The app fetches your entire collection (all folders) and wantlist from Discogs
2. For each release, it finds the lowest marketplace price and wants count
3. Data is stored in a local SQLite database with timestamps
4. Running sync regularly builds up price and demand history
5. Analysis commands identify:
   - Records increasing in value
   - Records with high demand (many people want them)
   - Optimal sell candidates based on demand score (wants/price ratio) and trends

## Data storage

- Configuration: Stored in your system's config directory
- Price database: Stored in `data/prices.db`

## Development

```bash
npm run dev     # Run without building
npm run watch   # Watch mode for development
```