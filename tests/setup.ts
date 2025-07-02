import { beforeEach, afterEach } from 'vitest';
import { existsSync, rmSync } from 'fs';
import { join } from 'path';

// Clean up test databases before and after each test
beforeEach(() => {
  cleanupTestDatabases();
});

afterEach(() => {
  cleanupTestDatabases();
});

function cleanupTestDatabases() {
  const testDbPaths = [
    join(process.cwd(), 'test.db'),
    join(process.cwd(), 'test-*.db'),
    join(process.cwd(), 'data/test.db'),
    join(process.cwd(), 'data/test-*.db')
  ];

  testDbPaths.forEach(path => {
    if (existsSync(path)) {
      rmSync(path, { force: true });
    }
  });
}