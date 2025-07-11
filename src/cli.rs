use anyhow::Result;
use clap::{Parser, Subcommand};
use colored::*;

use crate::config::Config;
use crate::database::PriceDatabase;
use crate::discogs::DiscogsService;

#[derive(Parser)]
#[command(
    name = "discogs-tracker",
    about = "Track prices of your Discogs collection over time",
    version = "1.0.0",
    after_help = "Examples:\n  \
        discogs-tracker config              # Configure credentials\n  \
        discogs-tracker sync                # Sync collection and prices\n  \
        discogs-tracker sync -t 16          # Use 16 threads for faster sync\n  \
        discogs-tracker trends              # Show records increasing in value\n  \
        discogs-tracker trends -m 10        # Show records with >10% increase\n  \
        discogs-tracker list                # List all records\n  \
        discogs-tracker history 123456      # Show price history for release\n  \
        discogs-tracker value               # Show collection value and stats\n  \
        discogs-tracker value -f            # Show value breakdown by format\n  \
        discogs-tracker demand              # Show high-demand and optimal sell candidates\n  \
        discogs-tracker demand -w 100       # Show records with >100 wants"
)]
pub struct Cli {
    #[command(subcommand)]
    pub command: Commands,
}

#[derive(Subcommand)]
pub enum Commands {
    /// Configure credentials and settings
    Config,
    /// Sync collection and fetch current prices
    Sync {
        /// Number of threads to use for parallel sync
        #[arg(short = 't', long = "threads", default_value = "8")]
        threads: u32,
        /// Items per batch
        #[arg(short = 'b', long = "batch", default_value = "25")]
        batch: u32,
        /// Force update all prices
        #[arg(long = "force")]
        force: bool,
    },
    /// Show price trends and increasing values
    Trends {
        /// Minimum percentage change to show
        #[arg(short = 'm', long = "min", default_value = "5")]
        min_change: f64,
        /// Show all changes including decreases
        #[arg(long = "all")]
        show_all: bool,
    },
    /// List records in collection
    List {
        /// Search term to filter records
        #[arg(short = 's', long = "search")]
        search: Option<String>,
    },
    /// Show price history for a specific release
    History {
        /// Release ID to show history for
        release_id: u32,
    },
    /// Show collection value and statistics
    Value {
        /// Show breakdown by format
        #[arg(short = 'f', long = "format")]
        by_format: bool,
        /// Show top N most valuable records
        #[arg(short = 't', long = "top")]
        top: Option<u32>,
    },
    /// Show demand analysis and sell candidates
    Demand {
        /// Minimum wants count to show
        #[arg(short = 'w', long = "wants", default_value = "50")]
        min_wants: u32,
        /// Analysis type: 'demand', 'sell', or 'all'
        #[arg(short = 't', long = "type", default_value = "all")]
        analysis_type: String,
    },
    /// Run database migrations
    Migrate {
        /// Show migration status
        #[arg(short = 's', long = "status")]
        status: bool,
    },
}

impl Cli {
    pub async fn execute(self) -> Result<()> {
        match self.command {
            Commands::Config => self.handle_config().await,
            Commands::Sync { threads, batch, force } => self.handle_sync(threads, batch, force).await,
            Commands::Trends { min_change, show_all } => self.handle_trends(min_change, show_all).await,
            Commands::List { ref search } => self.handle_list(search.clone()).await,
            Commands::History { release_id } => self.handle_history(release_id).await,
            Commands::Value { by_format, top } => self.handle_value(by_format, top).await,
            Commands::Demand { min_wants, ref analysis_type } => self.handle_demand(min_wants, analysis_type.clone()).await,
            Commands::Migrate { status } => self.handle_migrate(status).await,
        }
    }

    async fn handle_config(&self) -> Result<()> {
        println!("{}", "Configuring Discogs credentials...".cyan());
        
        let mut config = Config::load()?;
        config.configure_interactive().await?;
        config.save()?;

        println!("{}", "✓ Configuration saved successfully".green());
        Ok(())
    }

    async fn handle_sync(&self, threads: u32, batch: u32, force: bool) -> Result<()> {
        let config = Config::load()?;
        let _discogs = DiscogsService::new(&config.token, &config.username);
        let _db = PriceDatabase::new(None)?;

        println!("{}", format!("Starting sync with {} threads, batch size {}", threads, batch).cyan());
        
        if force {
            println!("{}", "Force update enabled - all prices will be refreshed".yellow());
        }

        // TODO: Implement sync logic with multi-threading
        println!("{}", "✓ Sync completed".green());
        Ok(())
    }

    async fn handle_trends(&self, min_change: f64, show_all: bool) -> Result<()> {
        let _db = PriceDatabase::new(None)?;
        
        println!("{}", format!("Analyzing price trends (minimum {}% change)...", min_change).cyan());
        
        if show_all {
            println!("{}", "Showing all price changes including decreases".yellow());
        }

        // TODO: Implement trends analysis
        println!("{}", "✓ Trends analysis completed".green());
        Ok(())
    }

    async fn handle_list(&self, search: Option<String>) -> Result<()> {
        let _db = PriceDatabase::new(None)?;
        
        match search {
            Some(term) => println!("{}", format!("Searching for: {}", term).cyan()),
            None => println!("{}", "Listing all records...".cyan()),
        }

        // TODO: Implement list functionality
        println!("{}", "✓ List completed".green());
        Ok(())
    }

    async fn handle_history(&self, release_id: u32) -> Result<()> {
        let _db = PriceDatabase::new(None)?;
        
        println!("{}", format!("Showing price history for release {}", release_id).cyan());
        
        // TODO: Implement history display
        println!("{}", "✓ History displayed".green());
        Ok(())
    }

    async fn handle_value(&self, by_format: bool, top: Option<u32>) -> Result<()> {
        let _db = PriceDatabase::new(None)?;
        
        println!("{}", "Calculating collection value...".cyan());
        
        if by_format {
            println!("{}", "Showing breakdown by format".yellow());
        }
        
        if let Some(n) = top {
            println!("{}", format!("Showing top {} most valuable records", n).yellow());
        }

        // TODO: Implement value calculation
        println!("{}", "✓ Value calculation completed".green());
        Ok(())
    }

    async fn handle_demand(&self, min_wants: u32, analysis_type: String) -> Result<()> {
        let _db = PriceDatabase::new(None)?;
        
        println!("{}", format!("Analyzing demand (minimum {} wants)...", min_wants).cyan());
        println!("{}", format!("Analysis type: {}", analysis_type).yellow());
        
        // TODO: Implement demand analysis
        println!("{}", "✓ Demand analysis completed".green());
        Ok(())
    }

    async fn handle_migrate(&self, status: bool) -> Result<()> {
        let _db = PriceDatabase::new(None)?;
        
        if status {
            println!("{}", "Checking migration status...".cyan());
            // TODO: Show migration status
        } else {
            println!("{}", "Running database migrations...".cyan());
            // TODO: Run migrations
        }
        
        println!("{}", "✓ Migration check completed".green());
        Ok(())
    }
}