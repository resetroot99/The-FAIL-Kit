/**
 * F.A.I.L. Kit Universal Proxy
 *
 * Intercepts HTTP/HTTPS requests and generates forensic receipts automatically.
 * No code changes required - just point HTTP_PROXY to this service.
 */

import http from 'http';
import https from 'https';
import { createProxyServer } from './proxy';
import { createAdminServer } from './admin';
import { logger, LogLevel } from './logger';
import { ReceiptStore } from './receipt-store';

// Configuration
const config = {
  proxyPort: parseInt(process.env.PROXY_PORT || '8080', 10),
  sslPort: parseInt(process.env.PROXY_SSL_PORT || '8443', 10),
  adminPort: parseInt(process.env.ADMIN_PORT || '9090', 10),
  receiptDir: process.env.RECEIPT_DIR || './receipts',
  logLevel: (process.env.LOG_LEVEL || 'info') as LogLevel,
  targetHosts: (process.env.TARGET_HOSTS || '*').split(',').map(h => h.trim()),
  receiptFormat: (process.env.RECEIPT_FORMAT || 'json') as 'json' | 'yaml',
  includeBody: process.env.RECEIPT_INCLUDE_BODY !== 'false',
  hashAlgorithm: (process.env.RECEIPT_HASH_ALGORITHM || 'sha256') as 'sha256' | 'sha512',
  receiptWebhook: process.env.RECEIPT_WEBHOOK,
};

// Initialize components
logger.setLevel(config.logLevel);
const receiptStore = new ReceiptStore(config.receiptDir, {
  format: config.receiptFormat,
  webhook: config.receiptWebhook,
});

// Create proxy server
const proxyServer = createProxyServer({
  targetHosts: config.targetHosts,
  receiptStore,
  includeBody: config.includeBody,
  hashAlgorithm: config.hashAlgorithm,
});

// Create admin server
const adminServer = createAdminServer(receiptStore, proxyServer);

// Start servers
proxyServer.listen(config.proxyPort, () => {
  logger.info(`F.A.I.L. Kit Proxy started on port ${config.proxyPort}`);
  logger.info(`Target hosts: ${config.targetHosts.join(', ')}`);
  logger.info(`Receipt directory: ${config.receiptDir}`);
});

adminServer.listen(config.adminPort, () => {
  logger.info(`Admin API started on port ${config.adminPort}`);
});

// Graceful shutdown
const shutdown = () => {
  logger.info('Shutting down...');
  
  proxyServer.close(() => {
    logger.info('Proxy server closed');
  });
  
  adminServer.close(() => {
    logger.info('Admin server closed');
    process.exit(0);
  });
  
  // Force exit after 10 seconds
  setTimeout(() => {
    logger.error('Forced shutdown');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Unhandled errors
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception:', error);
  shutdown();
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled rejection:', reason);
});

export { config, receiptStore };
