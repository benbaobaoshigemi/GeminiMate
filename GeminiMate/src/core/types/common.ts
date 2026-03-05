export interface ILogger {
    debug(message: string, context?: Record<string, unknown>): void;
    info(message: string, context?: Record<string, unknown>): void;
    warn(message: string, context?: Record<string, unknown>): void;
    error(message: string, context?: Record<string, unknown>): void;
    createChild(prefix: string): ILogger;
}

export const StorageKeys = {
    LATEX_FIXER_ENABLED: 'geminimate_latex_enabled',
    MARKDOWN_REPAIR_ENABLED: 'geminimate_markdown_enabled',
    FORMULA_COPY_ENABLED: 'geminimate_formula_copy_enabled',
    FORMULA_COPY_FORMAT: 'geminimate_formula_copy_format',
    WATERMARK_REMOVER_ENABLED: 'geminiWatermarkRemoverEnabled',
    QUOTE_REPLY_ENABLED: 'gvQuoteReplyEnabled',
    DEBUG_MODE: 'geminimate_debug_mode',
    DEBUG_LOGS: 'geminimate_debug_logs',
    LANGUAGE: 'geminimate_language',
    TIMELINE_ENABLED: 'geminimate_timeline_enabled',
    TIMELINE_WIDTH: 'geminimate_timeline_width',
    TIMELINE_STARRED_MESSAGES: 'geminiTimelineStarred',
} as const;
