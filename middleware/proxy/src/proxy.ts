/**
 * F.A.I.L. Kit Proxy Server
 *
 * HTTP/HTTPS interception proxy with automatic receipt generation.
 */

import http, { IncomingMessage, ServerResponse } from 'http';
import https from 'https';
import { URL } from 'url';
import { generateReceipt, Receipt } from './receipt-generator';
import { ReceiptStore } from './receipt-store';
import { logger } from './logger';

interface ProxyOptions {
  targetHosts: string[];
  receiptStore: ReceiptStore;
  includeBody: boolean;
  hashAlgorithm: 'sha256' | 'sha512';
}

interface ProxyStats {
  requestsTotal: number;
  requestsProxied: number;
  requestsSkipped: number;
  receiptsGenerated: number;
  errors: number;
  bytesTransferred: number;
  startTime: Date;
}

/**
 * Create the proxy server
 */
export function createProxyServer(options: ProxyOptions): http.Server {
  const stats: ProxyStats = {
    requestsTotal: 0,
    requestsProxied: 0,
    requestsSkipped: 0,
    receiptsGenerated: 0,
    errors: 0,
    bytesTransferred: 0,
    startTime: new Date(),
  };

  const server = http.createServer(async (clientReq, clientRes) => {
    stats.requestsTotal++;
    const startTime = Date.now();

    // Health check endpoint
    if (clientReq.url === '/health') {
      clientRes.writeHead(200, { 'Content-Type': 'application/json' });
      clientRes.end(JSON.stringify({ status: 'healthy', uptime: Date.now() - stats.startTime.getTime() }));
      return;
    }

    // Stats endpoint
    if (clientReq.url === '/stats') {
      clientRes.writeHead(200, { 'Content-Type': 'application/json' });
      clientRes.end(JSON.stringify(stats));
      return;
    }

    try {
      // Parse target URL
      const targetUrl = parseTargetUrl(clientReq);
      if (!targetUrl) {
        clientRes.writeHead(400, { 'Content-Type': 'text/plain' });
        clientRes.end('Bad Request: Invalid proxy request');
        return;
      }

      // Check if this host should be intercepted
      const shouldIntercept = shouldInterceptHost(targetUrl.hostname, options.targetHosts);
      if (!shouldIntercept) {
        stats.requestsSkipped++;
        // Forward without interception
        await forwardRequest(clientReq, clientRes, targetUrl, false, null, options);
        return;
      }

      stats.requestsProxied++;

      // Collect request body
      const requestBody = await collectBody(clientReq);

      // Forward request and collect response
      const { response, responseBody, error } = await forwardAndCollect(
        clientReq,
        clientRes,
        targetUrl,
        requestBody
      );

      // Generate receipt
      if (!error) {
        const receipt = generateReceipt({
          request: {
            method: clientReq.method || 'GET',
            url: targetUrl.href,
            headers: clientReq.headers as Record<string, string>,
            body: options.includeBody ? requestBody : undefined,
          },
          response: {
            statusCode: response?.statusCode || 0,
            headers: response?.headers as Record<string, string> || {},
            body: options.includeBody ? responseBody : undefined,
          },
          duration: Date.now() - startTime,
          hashAlgorithm: options.hashAlgorithm,
        });

        await options.receiptStore.save(receipt);
        stats.receiptsGenerated++;
        stats.bytesTransferred += (requestBody?.length || 0) + (responseBody?.length || 0);

        logger.debug('Receipt generated', {
          actionId: receipt.action_id,
          tool: receipt.tool_name,
          status: receipt.status,
        });
      }
    } catch (error) {
      stats.errors++;
      logger.error('Proxy error:', error);
      
      if (!clientRes.headersSent) {
        clientRes.writeHead(502, { 'Content-Type': 'text/plain' });
        clientRes.end('Bad Gateway: Proxy error');
      }
    }
  });

  // Handle CONNECT method for HTTPS
  server.on('connect', (req, clientSocket, head) => {
    stats.requestsTotal++;

    const [hostname, port] = (req.url || '').split(':');
    const targetPort = parseInt(port, 10) || 443;

    const shouldIntercept = shouldInterceptHost(hostname, options.targetHosts);

    if (shouldIntercept) {
      logger.debug('CONNECT intercept', { hostname, port: targetPort });
    }

    // Create connection to target
    const serverSocket = require('net').connect(targetPort, hostname, () => {
      clientSocket.write('HTTP/1.1 200 Connection Established\r\n\r\n');
      serverSocket.write(head);
      serverSocket.pipe(clientSocket);
      clientSocket.pipe(serverSocket);
      
      stats.requestsProxied++;
    });

    serverSocket.on('error', (err: Error) => {
      logger.error('CONNECT error:', err);
      clientSocket.end('HTTP/1.1 500 Connection Error\r\n\r\n');
      stats.errors++;
    });
  });

  // Attach stats to server
  (server as any).stats = stats;
  (server as any).getStats = () => stats;

  return server;
}

/**
 * Parse target URL from proxy request
 */
function parseTargetUrl(req: IncomingMessage): URL | null {
  try {
    const reqUrl = req.url || '';
    
    // Absolute URL
    if (reqUrl.startsWith('http://') || reqUrl.startsWith('https://')) {
      return new URL(reqUrl);
    }
    
    // Relative URL with Host header
    const host = req.headers.host;
    if (host) {
      const protocol = (req.socket as any).encrypted ? 'https' : 'http';
      return new URL(reqUrl, `${protocol}://${host}`);
    }
    
    return null;
  } catch {
    return null;
  }
}

/**
 * Check if host should be intercepted
 */
function shouldInterceptHost(hostname: string, targetHosts: string[]): boolean {
  if (targetHosts.includes('*')) return true;
  
  for (const target of targetHosts) {
    if (target.startsWith('*.')) {
      const domain = target.slice(2);
      if (hostname.endsWith(domain)) return true;
    } else if (hostname === target) {
      return true;
    }
  }
  
  return false;
}

/**
 * Collect request body
 */
async function collectBody(req: IncomingMessage): Promise<Buffer | undefined> {
  return new Promise((resolve) => {
    const chunks: Buffer[] = [];
    
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => {
      if (chunks.length > 0) {
        resolve(Buffer.concat(chunks));
      } else {
        resolve(undefined);
      }
    });
    req.on('error', () => resolve(undefined));
  });
}

/**
 * Forward request and collect response
 */
async function forwardAndCollect(
  clientReq: IncomingMessage,
  clientRes: ServerResponse,
  targetUrl: URL,
  requestBody: Buffer | undefined
): Promise<{
  response?: IncomingMessage;
  responseBody?: Buffer;
  error?: Error;
}> {
  return new Promise((resolve) => {
    const isHttps = targetUrl.protocol === 'https:';
    const lib = isHttps ? https : http;

    const options: http.RequestOptions = {
      hostname: targetUrl.hostname,
      port: targetUrl.port || (isHttps ? 443 : 80),
      path: targetUrl.pathname + targetUrl.search,
      method: clientReq.method,
      headers: { ...clientReq.headers },
    };

    // Remove proxy-specific headers
    delete options.headers!['proxy-connection'];

    const proxyReq = lib.request(options, (proxyRes) => {
      const responseChunks: Buffer[] = [];

      // Forward headers
      clientRes.writeHead(proxyRes.statusCode || 200, proxyRes.headers);

      proxyRes.on('data', (chunk) => {
        responseChunks.push(chunk);
        clientRes.write(chunk);
      });

      proxyRes.on('end', () => {
        clientRes.end();
        resolve({
          response: proxyRes,
          responseBody: Buffer.concat(responseChunks),
        });
      });
    });

    proxyReq.on('error', (error) => {
      resolve({ error });
    });

    if (requestBody) {
      proxyReq.write(requestBody);
    }
    proxyReq.end();
  });
}

/**
 * Forward request without interception
 */
async function forwardRequest(
  clientReq: IncomingMessage,
  clientRes: ServerResponse,
  targetUrl: URL,
  _collect: boolean,
  _receipt: any,
  _options: ProxyOptions
): Promise<void> {
  return new Promise((resolve) => {
    const isHttps = targetUrl.protocol === 'https:';
    const lib = isHttps ? https : http;

    const options: http.RequestOptions = {
      hostname: targetUrl.hostname,
      port: targetUrl.port || (isHttps ? 443 : 80),
      path: targetUrl.pathname + targetUrl.search,
      method: clientReq.method,
      headers: { ...clientReq.headers },
    };

    delete options.headers!['proxy-connection'];

    const proxyReq = lib.request(options, (proxyRes) => {
      clientRes.writeHead(proxyRes.statusCode || 200, proxyRes.headers);
      proxyRes.pipe(clientRes);
      proxyRes.on('end', () => resolve());
    });

    proxyReq.on('error', () => {
      if (!clientRes.headersSent) {
        clientRes.writeHead(502);
        clientRes.end('Bad Gateway');
      }
      resolve();
    });

    clientReq.pipe(proxyReq);
  });
}
