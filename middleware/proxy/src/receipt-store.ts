/**
 * F.A.I.L. Kit Receipt Store
 *
 * Persistent storage for generated receipts.
 */

import fs from 'fs';
import path from 'path';
import { Receipt } from './receipt-generator';
import { logger } from './logger';

interface StoreOptions {
  format: 'json' | 'yaml';
  webhook?: string;
  maxReceipts?: number;
  rotateDaily?: boolean;
}

interface ReceiptQuery {
  toolName?: string;
  toolCategory?: string;
  status?: Receipt['status'];
  startTime?: Date;
  endTime?: Date;
  limit?: number;
  offset?: number;
}

export class ReceiptStore {
  private directory: string;
  private options: StoreOptions;
  private receipts: Map<string, Receipt> = new Map();
  private receiptCount = 0;

  constructor(directory: string, options: Partial<StoreOptions> = {}) {
    this.directory = directory;
    this.options = {
      format: options.format || 'json',
      webhook: options.webhook,
      maxReceipts: options.maxReceipts || 10000,
      rotateDaily: options.rotateDaily ?? true,
    };

    this.ensureDirectory();
    this.loadExistingReceipts();
  }

  private ensureDirectory(): void {
    if (!fs.existsSync(this.directory)) {
      fs.mkdirSync(this.directory, { recursive: true });
      logger.info('Created receipt directory', { path: this.directory });
    }
  }

  private loadExistingReceipts(): void {
    try {
      const files = fs.readdirSync(this.directory);
      const receiptFiles = files.filter(f => f.endsWith('.json') || f.endsWith('.yaml'));
      
      for (const file of receiptFiles.slice(-1000)) {
        try {
          const content = fs.readFileSync(path.join(this.directory, file), 'utf8');
          const receipt = JSON.parse(content) as Receipt;
          this.receipts.set(receipt.action_id, receipt);
          this.receiptCount++;
        } catch {
          // Skip invalid files
        }
      }
      
      logger.info('Loaded existing receipts', { count: this.receipts.size });
    } catch (error) {
      logger.warn('Could not load existing receipts', { error: String(error) });
    }
  }

  /**
   * Save a receipt
   */
  async save(receipt: Receipt): Promise<void> {
    // Check rotation
    if (this.receiptCount >= (this.options.maxReceipts || 10000)) {
      await this.rotate();
    }

    // Store in memory
    this.receipts.set(receipt.action_id, receipt);
    this.receiptCount++;

    // Determine filename
    const date = receipt.timestamp.split('T')[0];
    const filename = this.options.rotateDaily
      ? `${date}/${receipt.action_id}.${this.options.format}`
      : `${receipt.action_id}.${this.options.format}`;
    
    const filepath = path.join(this.directory, filename);
    const dir = path.dirname(filepath);

    // Ensure subdirectory exists
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Write to file
    const content = this.options.format === 'json'
      ? JSON.stringify(receipt, null, 2)
      : this.toYaml(receipt);

    await fs.promises.writeFile(filepath, content);

    // Send to webhook if configured
    if (this.options.webhook) {
      this.sendToWebhook(receipt).catch(error => {
        logger.warn('Webhook send failed', { error: String(error) });
      });
    }
  }

  /**
   * Get a receipt by ID
   */
  get(actionId: string): Receipt | undefined {
    return this.receipts.get(actionId);
  }

  /**
   * Query receipts
   */
  query(query: ReceiptQuery): Receipt[] {
    let results = Array.from(this.receipts.values());

    if (query.toolName) {
      results = results.filter(r => r.tool_name === query.toolName);
    }

    if (query.toolCategory) {
      results = results.filter(r => r.tool_category === query.toolCategory);
    }

    if (query.status) {
      results = results.filter(r => r.status === query.status);
    }

    if (query.startTime) {
      const start = query.startTime.toISOString();
      results = results.filter(r => r.timestamp >= start);
    }

    if (query.endTime) {
      const end = query.endTime.toISOString();
      results = results.filter(r => r.timestamp <= end);
    }

    // Sort by timestamp descending
    results.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

    // Apply pagination
    const offset = query.offset || 0;
    const limit = query.limit || 100;
    return results.slice(offset, offset + limit);
  }

  /**
   * Get statistics
   */
  getStats(): Record<string, unknown> {
    const receipts = Array.from(this.receipts.values());
    
    const byCategory: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    const byTool: Record<string, number> = {};
    let totalDuration = 0;

    for (const receipt of receipts) {
      byCategory[receipt.tool_category] = (byCategory[receipt.tool_category] || 0) + 1;
      byStatus[receipt.status] = (byStatus[receipt.status] || 0) + 1;
      byTool[receipt.tool_name] = (byTool[receipt.tool_name] || 0) + 1;
      totalDuration += receipt.duration_ms;
    }

    return {
      total: receipts.length,
      byCategory,
      byStatus,
      byTool,
      averageDuration: receipts.length > 0 ? Math.round(totalDuration / receipts.length) : 0,
      oldestTimestamp: receipts.length > 0 ? receipts[0].timestamp : null,
      newestTimestamp: receipts.length > 0 ? receipts[receipts.length - 1].timestamp : null,
    };
  }

  /**
   * Rotate old receipts
   */
  private async rotate(): Promise<void> {
    logger.info('Rotating old receipts');
    
    const receipts = Array.from(this.receipts.entries());
    receipts.sort((a, b) => a[1].timestamp.localeCompare(b[1].timestamp));
    
    // Remove oldest 20%
    const toRemove = Math.floor(receipts.length * 0.2);
    for (let i = 0; i < toRemove; i++) {
      this.receipts.delete(receipts[i][0]);
    }
    
    this.receiptCount = this.receipts.size;
    logger.info('Rotation complete', { removed: toRemove, remaining: this.receiptCount });
  }

  /**
   * Send receipt to webhook
   */
  private async sendToWebhook(receipt: Receipt): Promise<void> {
    if (!this.options.webhook) return;

    const https = require('https');
    const http = require('http');
    const url = new URL(this.options.webhook);
    const lib = url.protocol === 'https:' ? https : http;

    return new Promise((resolve, reject) => {
      const req = lib.request(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-FailKit-Receipt': receipt.action_id,
        },
      }, (res: any) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve();
        } else {
          reject(new Error(`Webhook returned ${res.statusCode}`));
        }
      });

      req.on('error', reject);
      req.write(JSON.stringify(receipt));
      req.end();
    });
  }

  /**
   * Convert receipt to YAML
   */
  private toYaml(receipt: Receipt): string {
    const lines: string[] = [];
    
    const addLine = (key: string, value: unknown, indent = 0) => {
      const prefix = '  '.repeat(indent);
      if (value === undefined || value === null) return;
      
      if (typeof value === 'object' && !Array.isArray(value)) {
        lines.push(`${prefix}${key}:`);
        for (const [k, v] of Object.entries(value)) {
          addLine(k, v, indent + 1);
        }
      } else {
        lines.push(`${prefix}${key}: ${JSON.stringify(value)}`);
      }
    };

    for (const [key, value] of Object.entries(receipt)) {
      addLine(key, value);
    }

    return lines.join('\n');
  }
}
