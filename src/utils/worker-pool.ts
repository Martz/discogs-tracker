import { Worker } from 'worker_threads';
import { cpus } from 'os';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { debugWorker, debug } from './logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export interface WorkerTask<T> {
  id: string;
  data: T;
}

export interface WorkerResult<T> {
  id: string;
  success: boolean;
  result?: T;
  error?: string;
}

export class WorkerPool<TaskData, ResultData> {
  private workers: Worker[] = [];
  private taskQueue: Array<{ task: WorkerTask<TaskData>; resolve: (result: WorkerResult<ResultData>) => void }> = [];
  private busyWorkers = new Set<number>();
  private workerScript: string;
  private maxWorkers: number;

  constructor(workerScript: string, maxWorkers?: number) {
    this.workerScript = join(__dirname, '../workers', workerScript);
    this.maxWorkers = maxWorkers || Math.min(cpus().length, 8); // Limit to 8 for API rate limiting
    debug(`Initializing worker pool with ${this.maxWorkers} workers for script: ${workerScript}`);
    this.initializeWorkers();
  }

  private initializeWorkers(): void {
    debugWorker(`Creating ${this.maxWorkers} worker threads`);
    for (let i = 0; i < this.maxWorkers; i++) {
      const worker = new Worker(this.workerScript);
      
      worker.on('message', (message: WorkerResult<ResultData>) => {
        debugWorker(`Worker ${i} completed task: ${message.id}`, i);
        this.busyWorkers.delete(i);
        this.processNextTask();
        
        // Find and resolve the corresponding task
        const taskIndex = this.taskQueue.findIndex(t => t.task.id === message.id);
        if (taskIndex !== -1) {
          const { resolve } = this.taskQueue.splice(taskIndex, 1)[0];
          resolve(message);
        }
      });

      worker.on('error', (error) => {
        console.error(`Worker ${i} error:`, error);
        this.busyWorkers.delete(i);
        this.processNextTask();
      });

      this.workers[i] = worker;
    }
  }

  private processNextTask(): void {
    if (this.taskQueue.length === 0) return;

    const availableWorkerIndex = this.workers.findIndex((_, index) => !this.busyWorkers.has(index));
    if (availableWorkerIndex === -1) return;

    const { task } = this.taskQueue[0];
    this.busyWorkers.add(availableWorkerIndex);
    this.workers[availableWorkerIndex].postMessage(task);
  }

  async execute(task: WorkerTask<TaskData>): Promise<WorkerResult<ResultData>> {
    return new Promise((resolve) => {
      this.taskQueue.push({ task, resolve });
      this.processNextTask();
    });
  }

  async executeAll(tasks: WorkerTask<TaskData>[]): Promise<WorkerResult<ResultData>[]> {
    const promises = tasks.map(task => this.execute(task));
    return Promise.all(promises);
  }

  async executeBatch(
    tasks: WorkerTask<TaskData>[], 
    batchSize: number = 10,
    onProgress?: (completed: number, total: number) => void
  ): Promise<WorkerResult<ResultData>[]> {
    const results: WorkerResult<ResultData>[] = [];
    
    for (let i = 0; i < tasks.length; i += batchSize) {
      const batch = tasks.slice(i, i + batchSize);
      const batchResults = await this.executeAll(batch);
      results.push(...batchResults);
      
      if (onProgress) {
        onProgress(results.length, tasks.length);
      }

      // Add small delay between batches to respect API rate limits
      if (i + batchSize < tasks.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return results;
  }

  terminate(): void {
    this.workers.forEach(worker => worker.terminate());
    this.workers = [];
    this.taskQueue = [];
    this.busyWorkers.clear();
  }
}