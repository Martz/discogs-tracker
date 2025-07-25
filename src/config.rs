use anyhow::{Context, Result};
use dialoguer::{Input, Password};
use dirs::config_dir;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Serialize, Deserialize, Default)]
pub struct Config {
    pub username: String,
    pub token: String,
}

impl Config {
    pub fn load() -> Result<Self> {
        let config_path = Self::config_path()?;
        
        if !config_path.exists() {
            return Ok(Self::default());
        }

        let content = fs::read_to_string(&config_path)
            .with_context(|| format!("Failed to read config file at {}", config_path.display()))?;
        
        let config: Config = serde_json::from_str(&content)
            .with_context(|| "Failed to parse config file")?;
        
        Ok(config)
    }

    pub fn save(&self) -> Result<()> {
        let config_path = Self::config_path()?;
        
        if let Some(parent) = config_path.parent() {
            fs::create_dir_all(parent)
                .with_context(|| format!("Failed to create config directory at {}", parent.display()))?;
        }

        let content = serde_json::to_string_pretty(self)
            .with_context(|| "Failed to serialize config")?;
        
        fs::write(&config_path, content)
            .with_context(|| format!("Failed to write config file at {}", config_path.display()))?;
        
        Ok(())
    }

    pub async fn configure_interactive(&mut self) -> Result<()> {
        println!("Please provide your Discogs credentials:");
        println!("Get your personal access token from: https://www.discogs.com/settings/developers");
        println!();

        self.username = Input::new()
            .with_prompt("Discogs username")
            .default(self.username.clone())
            .interact_text()
            .with_context(|| "Failed to read username")?;

        self.token = Password::new()
            .with_prompt("Personal access token")
            .interact()
            .with_context(|| "Failed to read token")?;

        Ok(())
    }

    pub fn is_configured(&self) -> bool {
        !self.username.is_empty() && !self.token.is_empty()
    }

    fn config_path() -> Result<PathBuf> {
        let config_dir = config_dir()
            .ok_or_else(|| anyhow::anyhow!("Unable to determine config directory"))?;
        
        Ok(config_dir.join("discogs-tracker").join("config.json"))
    }
}