import { spawn, execSync } from 'child_process';
import { promises as fs } from 'fs';
import { join, resolve } from 'path';
import { tmpdir } from 'os';
import { randomUUID } from 'crypto';

export interface TestConfig {
  timeout: number;
  useRealAPI: boolean;
  mockApiResponses?: Record<string, any>;
}

export interface CommandResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  duration: number;
}

export interface DatabaseState {
  releases: any[];
  priceHistory: any[];
  collectionItems: any[];
  wantItems: any[];
}

/**
 * Cross-implementation test runner that can execute both Rust and TypeScript versions
 */
export class CrossImplementationTestRunner {
  private projectRoot: string;
  private tempDir: string;
  private rustBinary: string;
  private typescriptCli: string;

  constructor() {
    this.projectRoot = resolve(__dirname, '../../../');
    this.tempDir = join(tmpdir(), `discogs-tracker-test-${randomUUID()}`);
    this.rustBinary = join(this.projectRoot, 'target/release/discogs-tracker');
    this.typescriptCli = join(this.projectRoot, 'dist/cli.js');
  }

  async setup(): Promise<void> {
    // Create temporary directory for test artifacts
    await fs.mkdir(this.tempDir, { recursive: true });

    // Build both implementations
    await this.buildImplementations();
  }

  async cleanup(): Promise<void> {
    try {
      await fs.rm(this.tempDir, { recursive: true, force: true });
    } catch (error) {
      console.warn('Failed to cleanup temp directory:', error);
    }
  }

  private async buildImplementations(): Promise<void> {
    console.log('Building implementations...');
    
    // Build Rust version
    try {
      execSync('cargo build --release', { 
        cwd: this.projectRoot,
        stdio: 'pipe'
      });
      console.log('✓ Rust build completed');
    } catch (error) {
      throw new Error(`Rust build failed: ${error}`);
    }

    // Build TypeScript version
    try {
      execSync('npm run build', { 
        cwd: this.projectRoot,
        stdio: 'pipe'
      });
      console.log('✓ TypeScript build completed');
    } catch (error) {
      throw new Error(`TypeScript build failed: ${error}`);
    }

    // Verify binaries exist
    try {
      await fs.access(this.rustBinary);
      await fs.access(this.typescriptCli);
    } catch (error) {
      throw new Error(`Built binaries not found: ${error}`);
    }
  }

  /**
   * Execute a command using the Rust implementation
   */
  async executeRust(args: string[], config: TestConfig = { timeout: 30000, useRealAPI: false }): Promise<CommandResult> {
    return this.executeCommand(this.rustBinary, args, config);
  }

  /**
   * Execute a command using the TypeScript implementation
   */
  async executeTypeScript(args: string[], config: TestConfig = { timeout: 30000, useRealAPI: false }): Promise<CommandResult> {
    return this.executeCommand('node', [this.typescriptCli, ...args], config);
  }

  /**
   * Execute both implementations with the same arguments and compare results
   */
  async executeBoth(args: string[], config: TestConfig = { timeout: 30000, useRealAPI: false }): Promise<{
    rust: CommandResult;
    typescript: CommandResult;
  }> {
    const [rustResult, typescriptResult] = await Promise.all([
      this.executeRust(args, config),
      this.executeTypeScript(args, config)
    ]);

    return {
      rust: rustResult,
      typescript: typescriptResult
    };
  }

  private async executeCommand(command: string, args: string[], config: TestConfig): Promise<CommandResult> {
    const startTime = Date.now();
    
    return new Promise((resolve, reject) => {
      const env = { ...process.env };
      
      // Set up test environment
      env.DISCOGS_CONFIG_DIR = this.tempDir;
      
      if (!config.useRealAPI) {
        // Mock API endpoints
        env.DISCOGS_API_BASE = 'http://localhost:3001';
      }

      const child = spawn(command, args, {
        env,
        cwd: this.projectRoot,
        stdio: 'pipe'
      });

      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      const timeout = setTimeout(() => {
        child.kill('SIGTERM');
        reject(new Error(`Command timed out after ${config.timeout}ms`));
      }, config.timeout);

      child.on('close', (code) => {
        clearTimeout(timeout);
        const duration = Date.now() - startTime;
        
        resolve({
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          exitCode: code || 0,
          duration
        });
      });

      child.on('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
  }

  /**
   * Create a temporary database for testing
   */
  async createTestDatabase(): Promise<string> {
    const dbPath = join(this.tempDir, `test-${randomUUID()}.db`);
    return dbPath;
  }

  /**
   * Get database state for comparison
   */
  async getDatabaseState(dbPath: string): Promise<DatabaseState> {
    const Database = require('better-sqlite3');
    const db = new Database(dbPath);

    try {
      const releases = db.prepare('SELECT * FROM releases ORDER BY id').all();
      const priceHistory = db.prepare('SELECT * FROM price_history ORDER BY release_id, timestamp').all();
      const collectionItems = db.prepare('SELECT * FROM collection_items ORDER BY release_id').all();
      const wantItems = db.prepare('SELECT * FROM want_items ORDER BY release_id').all();

      return {
        releases,
        priceHistory,
        collectionItems,
        wantItems
      };
    } finally {
      db.close();
    }
  }

  /**
   * Compare database states between two implementations
   */
  compareDatabaseStates(state1: DatabaseState, state2: DatabaseState): {
    isEqual: boolean;
    differences: string[];
  } {
    const differences: string[] = [];

    // Compare releases
    if (state1.releases.length !== state2.releases.length) {
      differences.push(`Releases count mismatch: ${state1.releases.length} vs ${state2.releases.length}`);
    } else {
      for (let i = 0; i < state1.releases.length; i++) {
        const release1 = state1.releases[i];
        const release2 = state2.releases[i];
        
        if (JSON.stringify(release1) !== JSON.stringify(release2)) {
          differences.push(`Release ${i} differs: ${JSON.stringify(release1)} vs ${JSON.stringify(release2)}`);
        }
      }
    }

    // Compare price history
    if (state1.priceHistory.length !== state2.priceHistory.length) {
      differences.push(`Price history count mismatch: ${state1.priceHistory.length} vs ${state2.priceHistory.length}`);
    }

    // Compare collection items
    if (state1.collectionItems.length !== state2.collectionItems.length) {
      differences.push(`Collection items count mismatch: ${state1.collectionItems.length} vs ${state2.collectionItems.length}`);
    }

    // Compare want items
    if (state1.wantItems.length !== state2.wantItems.length) {
      differences.push(`Want items count mismatch: ${state1.wantItems.length} vs ${state2.wantItems.length}`);
    }

    return {
      isEqual: differences.length === 0,
      differences
    };
  }

  /**
   * Create a configuration file for testing
   */
  async createTestConfig(config: any): Promise<string> {
    const configPath = join(this.tempDir, 'config.json');
    await fs.writeFile(configPath, JSON.stringify(config, null, 2));
    return configPath;
  }

  /**
   * Parse CLI output for structured data
   */
  parseOutput(output: string, format: 'json' | 'table' | 'text' = 'text'): any {
    if (format === 'json') {
      try {
        return JSON.parse(output);
      } catch {
        return null;
      }
    }

    if (format === 'table') {
      // Parse table output
      const lines = output.split('\n').filter(line => line.trim());
      if (lines.length < 2) return [];

      const headers = lines[0].split(/\s+/);
      const data = lines.slice(2).map(line => {
        const values = line.split(/\s+/);
        const row: any = {};
        headers.forEach((header, index) => {
          row[header] = values[index] || '';
        });
        return row;
      });

      return data;
    }

    return output;
  }

  /**
   * Compare command outputs ignoring whitespace and formatting differences
   */
  compareOutputs(output1: string, output2: string, options: {
    ignoreWhitespace?: boolean;
    ignoreTimestamps?: boolean;
    ignoreColors?: boolean;
  } = {}): {
    isEqual: boolean;
    differences: string[];
  } {
    let normalized1 = output1;
    let normalized2 = output2;

    if (options.ignoreColors) {
      // Remove ANSI color codes
      const ansiRegex = /\x1b\[[0-9;]*m/g;
      normalized1 = normalized1.replace(ansiRegex, '');
      normalized2 = normalized2.replace(ansiRegex, '');
    }

    if (options.ignoreTimestamps) {
      // Remove timestamps (ISO format)
      const timestampRegex = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?/g;
      normalized1 = normalized1.replace(timestampRegex, 'TIMESTAMP');
      normalized2 = normalized2.replace(timestampRegex, 'TIMESTAMP');
    }

    if (options.ignoreWhitespace) {
      normalized1 = normalized1.replace(/\s+/g, ' ').trim();
      normalized2 = normalized2.replace(/\s+/g, ' ').trim();
    }

    const isEqual = normalized1 === normalized2;
    const differences = isEqual ? [] : [`Output differs:\n--- Rust ---\n${normalized1}\n--- TypeScript ---\n${normalized2}`];

    return { isEqual, differences };
  }

  /**
   * Measure performance characteristics
   */
  measurePerformance(result: CommandResult): {
    duration: number;
    memoryUsage: string;
    successRate: number;
  } {
    return {
      duration: result.duration,
      memoryUsage: this.extractMemoryUsage(result.stderr),
      successRate: result.exitCode === 0 ? 1.0 : 0.0
    };
  }

  private extractMemoryUsage(stderr: string): string {
    // Try to extract memory usage from stderr if available
    const memMatch = stderr.match(/Memory usage: ([\d.]+\s*[KMGT]?B)/i);
    return memMatch ? memMatch[1] : 'unknown';
  }
}