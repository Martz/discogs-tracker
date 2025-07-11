import chalk from 'chalk';

/**
 * Global debug state - can be enabled by CLI flag
 */
let debugEnabled = false;

/**
 * Enable or disable debug logging
 */
export function setDebugMode(enabled: boolean): void {
  debugEnabled = enabled;
}

/**
 * Check if debug mode is currently enabled
 */
export function isDebugEnabled(): boolean {
  return debugEnabled;
}

/**
 * Log debug information if debug mode is enabled
 */
export function debug(message: string, data?: any): void {
  if (!debugEnabled) return;
  
  const timestamp = new Date().toISOString();
  const prefix = chalk.gray(`[${timestamp}] [DEBUG]`);
  
  if (data) {
    console.error(`${prefix} ${message}`, data);
  } else {
    console.error(`${prefix} ${message}`);
  }
}

/**
 * Log debug information about API calls
 */
export function debugApi(method: string, url: string, response?: any): void {
  if (!debugEnabled) return;
  
  const timestamp = new Date().toISOString();
  const prefix = chalk.gray(`[${timestamp}] [API]`);
  
  if (response) {
    console.error(`${prefix} ${chalk.blue(method)} ${url} -> ${chalk.green('Success')}`);
    if (typeof response === 'object' && response.status) {
      console.error(`${prefix} Response status: ${response.status}`);
    }
  } else {
    console.error(`${prefix} ${chalk.blue(method)} ${url}`);
  }
}

/**
 * Log debug information about database operations
 */
export function debugDb(operation: string, details?: string): void {
  if (!debugEnabled) return;
  
  const timestamp = new Date().toISOString();
  const prefix = chalk.gray(`[${timestamp}] [DB]`);
  
  if (details) {
    console.error(`${prefix} ${chalk.magenta(operation)} - ${details}`);
  } else {
    console.error(`${prefix} ${chalk.magenta(operation)}`);
  }
}

/**
 * Log debug information about worker operations
 */
export function debugWorker(message: string, workerId?: string | number): void {
  if (!debugEnabled) return;
  
  const timestamp = new Date().toISOString();
  const prefix = chalk.gray(`[${timestamp}] [WORKER${workerId ? `-${workerId}` : ''}]`);
  
  console.error(`${prefix} ${chalk.yellow(message)}`);
}

/**
 * Log timing information for performance debugging
 */
export function debugTiming(operation: string, startTime: number): void {
  if (!debugEnabled) return;
  
  const duration = Date.now() - startTime;
  const timestamp = new Date().toISOString();
  const prefix = chalk.gray(`[${timestamp}] [TIMING]`);
  
  console.error(`${prefix} ${chalk.cyan(operation)} took ${chalk.bold(`${duration}ms`)}`);
}