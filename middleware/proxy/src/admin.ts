/**
 * F.A.I.L. Kit Proxy Admin API
 *
 * REST API for managing the proxy and viewing receipts.
 */

import http, { IncomingMessage, ServerResponse } from 'http';
import { URL } from 'url';
import { ReceiptStore } from './receipt-store';
import { logger } from './logger';

interface RouteHandler {
  method: string;
  path: RegExp;
  handler: (req: IncomingMessage, res: ServerResponse, params: Record<string, string>) => Promise<void>;
}

/**
 * Create the admin API server
 */
export function createAdminServer(
  receiptStore: ReceiptStore,
  proxyServer: http.Server
): http.Server {
  const routes: RouteHandler[] = [
    // Health check
    {
      method: 'GET',
      path: /^\/health$/,
      handler: async (_req, res) => {
        sendJson(res, 200, { status: 'healthy', timestamp: new Date().toISOString() });
      },
    },

    // Get proxy stats
    {
      method: 'GET',
      path: /^\/stats$/,
      handler: async (_req, res) => {
        const proxyStats = (proxyServer as any).getStats?.() || {};
        const receiptStats = receiptStore.getStats();
        sendJson(res, 200, {
          proxy: proxyStats,
          receipts: receiptStats,
        });
      },
    },

    // List receipts
    {
      method: 'GET',
      path: /^\/receipts$/,
      handler: async (req, res) => {
        const url = new URL(req.url || '/', `http://${req.headers.host}`);
        const query = {
          toolName: url.searchParams.get('tool') || undefined,
          toolCategory: url.searchParams.get('category') || undefined,
          status: url.searchParams.get('status') as any || undefined,
          limit: parseInt(url.searchParams.get('limit') || '100', 10),
          offset: parseInt(url.searchParams.get('offset') || '0', 10),
        };

        const receipts = receiptStore.query(query);
        sendJson(res, 200, {
          total: receipts.length,
          offset: query.offset,
          limit: query.limit,
          receipts,
        });
      },
    },

    // Get single receipt
    {
      method: 'GET',
      path: /^\/receipts\/([^/]+)$/,
      handler: async (_req, res, params) => {
        const receipt = receiptStore.get(params.id);
        if (receipt) {
          sendJson(res, 200, receipt);
        } else {
          sendJson(res, 404, { error: 'Receipt not found' });
        }
      },
    },

    // Get receipt statistics
    {
      method: 'GET',
      path: /^\/receipts\/stats$/,
      handler: async (_req, res) => {
        const stats = receiptStore.getStats();
        sendJson(res, 200, stats);
      },
    },

    // Export receipts
    {
      method: 'GET',
      path: /^\/export$/,
      handler: async (req, res) => {
        const url = new URL(req.url || '/', `http://${req.headers.host}`);
        const format = url.searchParams.get('format') || 'json';
        
        const receipts = receiptStore.query({ limit: 10000 });
        
        if (format === 'csv') {
          res.writeHead(200, {
            'Content-Type': 'text/csv',
            'Content-Disposition': 'attachment; filename="receipts.csv"',
          });
          
          const headers = ['action_id', 'tool_name', 'tool_category', 'status', 'timestamp', 'duration_ms'];
          res.write(headers.join(',') + '\n');
          
          for (const receipt of receipts) {
            const row = headers.map(h => (receipt as any)[h] || '');
            res.write(row.join(',') + '\n');
          }
          
          res.end();
        } else {
          res.writeHead(200, {
            'Content-Type': 'application/json',
            'Content-Disposition': 'attachment; filename="receipts.json"',
          });
          res.end(JSON.stringify(receipts, null, 2));
        }
      },
    },

    // Configuration
    {
      method: 'GET',
      path: /^\/config$/,
      handler: async (_req, res) => {
        sendJson(res, 200, {
          targetHosts: process.env.TARGET_HOSTS || '*',
          receiptFormat: process.env.RECEIPT_FORMAT || 'json',
          includeBody: process.env.RECEIPT_INCLUDE_BODY !== 'false',
          logLevel: process.env.LOG_LEVEL || 'info',
        });
      },
    },

    // Dashboard (simple HTML)
    {
      method: 'GET',
      path: /^\/$/,
      handler: async (_req, res) => {
        const stats = receiptStore.getStats();
        const proxyStats = (proxyServer as any).getStats?.() || {};
        
        const html = generateDashboardHtml(stats, proxyStats);
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(html);
      },
    },
  ];

  const server = http.createServer(async (req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const url = new URL(req.url || '/', `http://${req.headers.host}`);
    const path = url.pathname;
    const method = req.method || 'GET';

    // Find matching route
    for (const route of routes) {
      if (route.method !== method) continue;
      
      const match = path.match(route.path);
      if (match) {
        const params: Record<string, string> = {};
        if (match[1]) params.id = match[1];
        
        try {
          await route.handler(req, res, params);
          return;
        } catch (error) {
          logger.error('Admin API error:', error);
          sendJson(res, 500, { error: 'Internal server error' });
          return;
        }
      }
    }

    // Not found
    sendJson(res, 404, { error: 'Not found' });
  });

  return server;
}

function sendJson(res: ServerResponse, status: number, data: unknown): void {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

function generateDashboardHtml(stats: Record<string, unknown>, proxyStats: Record<string, unknown>): string {
  return `<!DOCTYPE html>
<html>
<head>
  <title>F.A.I.L. Kit Proxy Dashboard</title>
  <style>
    body { font-family: system-ui, sans-serif; background: #0a0a0f; color: #e5e5e5; padding: 2rem; }
    h1 { color: #3b82f6; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin: 2rem 0; }
    .card { background: #12121a; border: 1px solid #1e1e2e; border-radius: 0.5rem; padding: 1rem; }
    .card h3 { font-size: 0.75rem; color: #6b7280; text-transform: uppercase; margin: 0 0 0.5rem; }
    .card .value { font-size: 2rem; font-weight: bold; color: #3b82f6; }
    table { width: 100%; border-collapse: collapse; margin-top: 2rem; }
    th, td { text-align: left; padding: 0.75rem; border-bottom: 1px solid #1e1e2e; }
    th { color: #6b7280; font-size: 0.75rem; text-transform: uppercase; }
    a { color: #3b82f6; text-decoration: none; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <h1>🎯 F.A.I.L. Kit Proxy</h1>
  <p>Universal HTTP proxy with automatic receipt generation</p>
  
  <div class="grid">
    <div class="card">
      <h3>Total Receipts</h3>
      <div class="value">${stats.total || 0}</div>
    </div>
    <div class="card">
      <h3>Requests Proxied</h3>
      <div class="value">${proxyStats.requestsProxied || 0}</div>
    </div>
    <div class="card">
      <h3>Avg Duration</h3>
      <div class="value">${stats.averageDuration || 0}ms</div>
    </div>
    <div class="card">
      <h3>Errors</h3>
      <div class="value">${proxyStats.errors || 0}</div>
    </div>
  </div>
  
  <h2>API Endpoints</h2>
  <table>
    <tr><th>Endpoint</th><th>Description</th></tr>
    <tr><td><a href="/receipts">/receipts</a></td><td>List all receipts</td></tr>
    <tr><td><a href="/receipts/stats">/receipts/stats</a></td><td>Receipt statistics</td></tr>
    <tr><td><a href="/stats">/stats</a></td><td>Proxy statistics</td></tr>
    <tr><td><a href="/export">/export</a></td><td>Export receipts (JSON)</td></tr>
    <tr><td><a href="/export?format=csv">/export?format=csv</a></td><td>Export receipts (CSV)</td></tr>
    <tr><td><a href="/config">/config</a></td><td>Current configuration</td></tr>
  </table>
  
  <h2>Usage</h2>
  <pre style="background: #12121a; padding: 1rem; border-radius: 0.5rem;">
# Configure your application to use this proxy:
export HTTP_PROXY=http://localhost:8080
export HTTPS_PROXY=http://localhost:8080

# Or in Node.js:
const { setGlobalDispatcher, ProxyAgent } = require('undici');
setGlobalDispatcher(new ProxyAgent('http://localhost:8080'));
  </pre>
</body>
</html>`;
}
