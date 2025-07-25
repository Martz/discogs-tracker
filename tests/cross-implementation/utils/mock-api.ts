import { createServer, Server } from 'http';
import { URL } from 'url';

export interface MockApiServer {
  start(): Promise<void>;
  stop(): Promise<void>;
  port: number;
  setResponse(endpoint: string, response: any): void;
  getRequestLog(): Array<{ method: string; url: string; timestamp: Date }>;
}

/**
 * Mock API server for testing both implementations without hitting real Discogs API
 */
export class DiscogsApiMock implements MockApiServer {
  private server: Server;
  public port: number;
  private responses: Map<string, any> = new Map();
  private requestLog: Array<{ method: string; url: string; timestamp: Date }> = [];

  constructor(port: number = 3001) {
    this.port = port;
    this.server = createServer(this.handleRequest.bind(this));
    this.setupDefaultResponses();
  }

  private setupDefaultResponses(): void {
    // Default user identity response
    this.setResponse('/oauth/identity', {
      id: 123456,
      username: 'testuser',
      resource_url: 'https://api.discogs.com/users/testuser'
    });

    // Default folders response
    this.setResponse('/users/testuser/collection/folders', {
      folders: [
        { id: 0, name: 'All', count: 2 },
        { id: 1, name: 'Favourites', count: 1 }
      ]
    });

    // Default collection response
    this.setResponse('/users/testuser/collection/folders/0/releases', {
      releases: [
        {
          id: 123456,
          instance_id: 1001,
          folder_id: 0,
          rating: 5,
          basic_information: {
            id: 123456,
            title: 'Test Album',
            artists: [{ name: 'Test Artist', id: 789, resource_url: '' }],
            year: 2023,
            formats: [{ name: 'Vinyl', qty: '1' }],
            thumb: 'https://example.com/thumb.jpg',
            cover_image: '',
            resource_url: '',
            labels: [],
            genres: ['Rock'],
            styles: ['Alternative Rock']
          },
          date_added: '2023-01-01T00:00:00Z'
        }
      ],
      pagination: {
        page: 1,
        pages: 1,
        per_page: 50,
        items: 1
      }
    });

    // Default wantlist response
    this.setResponse('/users/testuser/wants', {
      wants: [
        {
          id: 789012,
          rating: 0,
          notes: 'Want this!',
          basic_information: {
            id: 789012,
            title: 'Wanted Album',
            artists: [{ name: 'Wanted Artist', id: 456, resource_url: '' }],
            year: 2023,
            formats: [{ name: 'Vinyl', qty: '1' }],
            thumb: 'https://example.com/want.jpg',
            cover_image: '',
            resource_url: '',
            labels: [],
            genres: ['Electronic'],
            styles: ['House']
          },
          date_added: '2023-01-01T00:00:00Z'
        }
      ],
      pagination: {
        page: 1,
        pages: 1,
        per_page: 50,
        items: 1
      }
    });

    // Default marketplace stats response
    this.setResponse('/marketplace/stats/123456', {
      lowest_price: {
        value: 25.99,
        currency: 'GBP'
      },
      num_for_sale: 5,
      blocked_from_sale: false
    });

    // Default release search response (for wants count)
    this.setResponse('/database/search', {
      results: [
        {
          id: 123456,
          title: 'Test Album',
          community: {
            want: 42,
            have: 156
          }
        }
      ],
      pagination: {
        page: 1,
        pages: 1,
        per_page: 50,
        items: 1
      }
    });
  }

  private handleRequest(req: any, res: any): void {
    const url = new URL(req.url, `http://localhost:${this.port}`);
    const path = url.pathname;

    // Log the request
    this.requestLog.push({
      method: req.method,
      url: req.url,
      timestamp: new Date()
    });

    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, User-Agent');

    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    // Check for rate limiting simulation
    if (url.searchParams.get('simulate') === 'rate_limit') {
      res.writeHead(429, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        message: 'You are making requests too quickly. You are limited to 60 requests per minute.'
      }));
      return;
    }

    // Check for error simulation
    if (url.searchParams.get('simulate') === 'error') {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        message: 'Internal Server Error'
      }));
      return;
    }

    // Find matching response
    const response = this.responses.get(path) || this.responses.get(path.replace(/\/\d+$/, '/123456'));

    if (response) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(response));
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        message: 'Resource not found'
      }));
    }
  }

  public setResponse(endpoint: string, response: any): void {
    this.responses.set(endpoint, response);
  }

  public getRequestLog(): Array<{ method: string; url: string; timestamp: Date }> {
    return [...this.requestLog];
  }

  public clearRequestLog(): void {
    this.requestLog = [];
  }

  public async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server.listen(this.port, (err?: Error) => {
        if (err) {
          reject(err);
        } else {
          console.log(`Mock Discogs API server started on port ${this.port}`);
          resolve();
        }
      });
    });
  }

  public async stop(): Promise<void> {
    return new Promise((resolve) => {
      this.server.close(() => {
        console.log('Mock Discogs API server stopped');
        resolve();
      });
    });
  }

  /**
   * Helper to set up responses for a complete sync workflow
   */
  public setupSyncWorkflow(username: string = 'testuser'): void {
    this.setResponse(`/users/${username}/collection/folders`, {
      folders: [
        { id: 0, name: 'All', count: 3 },
        { id: 1, name: 'Favourites', count: 1 }
      ]
    });

    this.setResponse(`/users/${username}/collection/folders/0/releases`, {
      releases: [
        {
          id: 123456,
          instance_id: 1001,
          folder_id: 0,
          rating: 5,
          basic_information: {
            id: 123456,
            title: 'Album One',
            artists: [{ name: 'Artist One', id: 789, resource_url: '' }],
            year: 2023,
            formats: [{ name: 'Vinyl', qty: '1' }],
            thumb: 'https://example.com/thumb1.jpg',
            cover_image: '',
            resource_url: '',
            labels: [],
            genres: ['Rock'],
            styles: ['Alternative']
          },
          date_added: '2023-01-01T00:00:00Z'
        },
        {
          id: 234567,
          instance_id: 1002,
          folder_id: 0,
          rating: 4,
          basic_information: {
            id: 234567,
            title: 'Album Two',
            artists: [{ name: 'Artist Two', id: 890, resource_url: '' }],
            year: 2022,
            formats: [{ name: 'CD', qty: '1' }],
            thumb: 'https://example.com/thumb2.jpg',
            cover_image: '',
            resource_url: '',
            labels: [],
            genres: ['Electronic'],
            styles: ['House']
          },
          date_added: '2023-02-01T00:00:00Z'
        }
      ],
      pagination: { page: 1, pages: 1, per_page: 50, items: 2 }
    });

    this.setResponse(`/users/${username}/wants`, {
      wants: [
        {
          id: 345678,
          rating: 0,
          notes: 'Must have!',
          basic_information: {
            id: 345678,
            title: 'Wanted Album',
            artists: [{ name: 'Wanted Artist', id: 456, resource_url: '' }],
            year: 2024,
            formats: [{ name: 'Vinyl', qty: '1' }],
            thumb: 'https://example.com/want.jpg',
            cover_image: '',
            resource_url: '',
            labels: [],
            genres: ['Jazz'],
            styles: ['Fusion']
          },
          date_added: '2023-03-01T00:00:00Z'
        }
      ],
      pagination: { page: 1, pages: 1, per_page: 50, items: 1 }
    });

    // Set up marketplace stats for each release
    this.setResponse('/marketplace/stats/123456', {
      lowest_price: { value: 29.99, currency: 'GBP' },
      num_for_sale: 8,
      blocked_from_sale: false
    });

    this.setResponse('/marketplace/stats/234567', {
      lowest_price: { value: 15.50, currency: 'GBP' },
      num_for_sale: 3,
      blocked_from_sale: false
    });

    this.setResponse('/marketplace/stats/345678', {
      lowest_price: { value: 89.99, currency: 'GBP' },
      num_for_sale: 1,
      blocked_from_sale: false
    });
  }

  /**
   * Helper to simulate API errors for testing error handling
   */
  public setupErrorScenarios(): void {
    this.setResponse('/error/500', { error: 'Internal Server Error' });
    this.setResponse('/error/404', { error: 'Not Found' });
    this.setResponse('/error/429', { error: 'Rate Limited' });
  }
}