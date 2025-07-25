mod cli;
mod config;
mod database;
mod discogs;
mod types;

use anyhow::Result;
use clap::Parser;
use cli::Cli;

#[tokio::main]
async fn main() -> Result<()> {
    let args = Cli::parse();
    args.execute().await
}
