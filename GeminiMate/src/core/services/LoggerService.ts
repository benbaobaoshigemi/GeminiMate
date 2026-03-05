import type { ILogger } from '../types/common';
import { debugService } from './DebugService';

export const LogLevel = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3,
    NONE: 4,
} as const;

export type LogLevel = (typeof LogLevel)[keyof typeof LogLevel];

const LogLevelNames: Record<LogLevel, string> = {
    [LogLevel.DEBUG]: 'DEBUG',
    [LogLevel.INFO]: 'INFO',
    [LogLevel.WARN]: 'WARN',
    [LogLevel.ERROR]: 'ERROR',
    [LogLevel.NONE]: 'NONE',
};

export interface LoggerConfig {
    level: LogLevel;
    prefix: string;
    enableTimestamp: boolean;
    enableContext: boolean;
}

export class LoggerService implements ILogger {
    private static instance: LoggerService;
    private config: LoggerConfig;

    private constructor(config: Partial<LoggerConfig> = {}) {
        this.config = {
            level:
                config.level ?? (import.meta.env.MODE === 'production' ? LogLevel.WARN : LogLevel.DEBUG),
            prefix: config.prefix ?? '[GeminiMate]',
            enableTimestamp: config.enableTimestamp ?? true,
            enableContext: config.enableContext ?? true,
        };
    }

    static getInstance(config?: Partial<LoggerConfig>): LoggerService {
        if (!LoggerService.instance) {
            LoggerService.instance = new LoggerService(config);
        }
        return LoggerService.instance;
    }

    createChild(prefix: string): ILogger {
        return new LoggerService({
            ...this.config,
            prefix: `${this.config.prefix}:${prefix}`,
        });
    }

    debug(message: string, context?: Record<string, unknown>): void {
        this.log(LogLevel.DEBUG, message, context);
    }

    info(message: string, context?: Record<string, unknown>): void {
        this.log(LogLevel.INFO, message, context);
    }

    warn(message: string, context?: Record<string, unknown>): void {
        this.log(LogLevel.WARN, message, context);
    }

    error(message: string, context?: Record<string, unknown>): void {
        this.log(LogLevel.ERROR, message, context);
    }

    private log(level: LogLevel, message: string, context?: Record<string, unknown>): void {
        if (level < this.config.level) {
            return;
        }

        const timestamp = this.config.enableTimestamp ? new Date().toISOString() : '';
        const prefix = this.config.prefix;
        const levelStr = LogLevelNames[level];
        const parts = [timestamp, prefix, `[${levelStr}]`, message].filter(Boolean);
        const logMessage = parts.join(' ');
        const logFn = this.getLogFunction(level);

        if (this.config.enableContext && context) {
            logFn(logMessage, context);
        } else {
            logFn(logMessage);
        }

        debugService.log('execution', 'logger', {
            level: levelStr,
            message,
            prefix,
            context: context ?? null,
        });
    }

    private getLogFunction(level: LogLevel): (...args: unknown[]) => void {
        switch (level) {
            case LogLevel.DEBUG:
                return console.debug.bind(console);
            case LogLevel.INFO:
                return console.info.bind(console);
            case LogLevel.WARN:
                return console.warn.bind(console);
            case LogLevel.ERROR:
                return console.error.bind(console);
            default:
                return console.log.bind(console);
        }
    }
}

export const logger = LoggerService.getInstance();
