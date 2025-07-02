# Discogs Price Tracker

A TypeScript CLI application that tracks the prices of your Discogs collection over time, helping you identify records that are increasing in value.

## Features

- Sync your Discogs collection automatically
- Track marketplace prices over time (using lowest available price)
- Identify records with increasing values
- View price history and trends
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
discogs-tracker sync
```

This fetches your collection and current marketplace prices.

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

### 5. Other commands

```bash
# List all records in your collection
discogs-tracker list

# Search for specific records
discogs-tracker list -s "Beatles"

# View price history for a specific release
discogs-tracker history 123456
```

## How it works

1. The app fetches your collection from Discogs
2. For each release, it finds the lowest marketplace price
3. Prices are stored in a local SQLite database with timestamps
4. Running sync regularly builds up price history
5. The trends command analyzes price changes to find records increasing in value

## Data storage

- Configuration: Stored in your system's config directory
- Price database: Stored in `data/prices.db`

## Development

```bash
npm run dev     # Run without building
npm run watch   # Watch mode for development
```