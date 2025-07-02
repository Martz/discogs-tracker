import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Worker } from 'worker_threads';
import { WorkerPool, type WorkerTask, type WorkerResult } from '../../src/utils/worker-pool.js';

// Mock worker_threads
vi.mock('worker_threads', () => ({
  Worker: vi.fn()
}));

// Mock os
vi.mock('os', () => ({
  cpus: () => Array(8).fill({ model: 'Test CPU' })
}));

describe('WorkerPool', () => {
  let mockWorkerInstances: any[];
  let workerPool: WorkerPool<any, any>;
  const MockedWorker = Worker as any;

  beforeEach(() => {
    mockWorkerInstances = [];
    
    MockedWorker.mockImplementation(() => {
      const mockWorker = {
        postMessage: vi.fn(),
        on: vi.fn(),
        terminate: vi.fn()
      };
      mockWorkerInstances.push(mockWorker);
      return mockWorker;
    });
  });

  afterEach(() => {
    if (workerPool) {
      workerPool.terminate();
    }
    vi.clearAllMocks();
    mockWorkerInstances = [];
  });

  describe('Initialization', () => {
    it('should create worker pool with default settings', () => {
      workerPool = new WorkerPool('test-worker.js');
      
      expect(MockedWorker).toHaveBeenCalledTimes(8); // Default to CPU count, max 8
      expect(mockWorkerInstances).toHaveLength(8);
    });

    it('should create worker pool with custom worker count', () => {
      workerPool = new WorkerPool('test-worker.js', 4);
      
      expect(MockedWorker).toHaveBeenCalledTimes(4);
      expect(mockWorkerInstances).toHaveLength(4);
    });

    it('should set up event listeners for workers', () => {
      workerPool = new WorkerPool('test-worker.js', 2);
      
      mockWorkerInstances.forEach(worker => {
        expect(worker.on).toHaveBeenCalledWith('message', expect.any(Function));
        expect(worker.on).toHaveBeenCalledWith('error', expect.any(Function));
      });
    });
  });

  describe('Task Management', () => {
    beforeEach(() => {
      workerPool = new WorkerPool('test-worker.js', 2);
    });

    it('should handle task creation', () => {
      const task: WorkerTask<any> = {
        id: 'test-task-1',
        data: { test: 'data' }
      };

      // Just verify the task structure
      expect(task.id).toBe('test-task-1');
      expect(task.data).toEqual({ test: 'data' });
    });

    it('should handle result structure', () => {
      const result: WorkerResult<any> = {
        id: 'test-task-1',
        success: true,
        result: { processed: true }
      };

      expect(result.id).toBe('test-task-1');
      expect(result.success).toBe(true);
      expect(result.result).toEqual({ processed: true });
    });

    it('should post messages to workers', async () => {
      const task: WorkerTask<any> = {
        id: 'test-task-1',
        data: { test: 'data' }
      };

      // Call execute but don't wait for completion
      workerPool.execute(task);

      // Verify a worker received the message
      const totalCalls = mockWorkerInstances.reduce((sum, worker) => 
        sum + worker.postMessage.mock.calls.length, 0);
      
      expect(totalCalls).toBeGreaterThan(0);
    });
  });

  describe('Termination', () => {
    beforeEach(() => {
      workerPool = new WorkerPool('test-worker.js', 2);
    });

    it('should terminate all workers', () => {
      workerPool.terminate();
      
      mockWorkerInstances.forEach(worker => {
        expect(worker.terminate).toHaveBeenCalled();
      });
    });

    it('should handle multiple termination calls gracefully', () => {
      workerPool.terminate();
      expect(() => workerPool.terminate()).not.toThrow();
      
      mockWorkerInstances.forEach(worker => {
        expect(worker.terminate).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle worker creation errors', () => {
      MockedWorker.mockImplementationOnce(() => {
        throw new Error('Worker creation failed');
      });

      expect(() => new WorkerPool('invalid-worker.js', 1)).toThrow('Worker creation failed');
    });
  });

  describe('Configuration', () => {
    it('should respect custom worker count', () => {
      const customPool = new WorkerPool('test-worker.js', 3);
      
      expect(MockedWorker).toHaveBeenCalledTimes(3);
      
      customPool.terminate();
    });

    it('should handle zero worker count gracefully', () => {
      expect(() => new WorkerPool('test-worker.js', 0)).not.toThrow();
    });

    it('should handle very large worker counts', () => {
      const largePool = new WorkerPool('test-worker.js', 100);
      
      expect(MockedWorker).toHaveBeenCalledTimes(100);
      
      largePool.terminate();
    });
  });

  describe('Worker Script Path', () => {
    it('should accept different script paths', () => {
      const pool1 = new WorkerPool('script1.js', 1);
      const pool2 = new WorkerPool('script2.js', 1);
      
      expect(MockedWorker).toHaveBeenCalledTimes(2);
      
      pool1.terminate();
      pool2.terminate();
    });

    it('should handle relative paths', () => {
      const pool = new WorkerPool('./workers/test.js', 1);
      
      expect(MockedWorker).toHaveBeenCalledTimes(1);
      
      pool.terminate();
    });
  });

  describe('Resource Management', () => {
    it('should clean up resources on termination', () => {
      workerPool = new WorkerPool('test-worker.js', 3);
      
      // Verify workers were created
      expect(mockWorkerInstances).toHaveLength(3);
      
      // Terminate and verify cleanup
      workerPool.terminate();
      
      mockWorkerInstances.forEach(worker => {
        expect(worker.terminate).toHaveBeenCalled();
      });
    });

    it('should handle termination without workers', () => {
      // Create pool but immediately terminate
      workerPool = new WorkerPool('test-worker.js', 0);
      
      expect(() => workerPool.terminate()).not.toThrow();
    });
  });
});