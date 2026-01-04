/**
 * F.A.I.L. Kit Proxy Logger
 *
 * Structured logging for the proxy server.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  timestamp: string;
  message: string;
  data?: Record<string, unknown>;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

class Logger {
  private level: LogLevel = 'info';
  private format: 'json' | 'text' = 'json';

  setLevel(level: LogLevel): void {
    this.level = level;
  }

  setFormat(format: 'json' | 'text'): void {
    this.format = format;
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[this.level];
  }

  private formatEntry(entry: LogEntry): string {
    if (this.format === 'json') {
      return JSON.stringify(entry);
    }

    const timestamp = entry.timestamp.split('T')[1].split('.')[0];
    const levelStr = entry.level.toUpperCase().padEnd(5);
    let message = `${timestamp} [${levelStr}] ${entry.message}`;
    
    if (entry.data) {
      message += ' ' + JSON.stringify(entry.data);
    }
    
    return message;
  }

  private log(level: LogLevel, message: string, data?: Record<string, unknown>): void {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      level,
      timestamp: new Date().toISOString(),
      message,
      data,
    };

    const formatted = this.formatEntry(entry);

    switch (level) {
      case 'error':
        console.error(formatted);
        break;
      case 'warn':
        console.warn(formatted);
        break;
      default:
        console.log(formatted);
    }
  }

  debug(message: string, data?: Record<string, unknown>): void {
    this.log('debug', message, data);
  }

  info(message: string, data?: Record<string, unknown>): void {
    this.log('info', message, data);
  }

  warn(message: string, data?: Record<string, unknown>): void {
    this.log('warn', message, data);
  }

  error(message: string, error?: unknown): void {
    let data: Record<string, unknown> | undefined;
    
    if (error instanceof Error) {
      data = {
        error: error.message,
        stack: error.stack,
      };
    } else if (error) {
      data = { error: String(error) };
    }
    
    this.log('error', message, data);
  }
}

export const logger = new Logger();
