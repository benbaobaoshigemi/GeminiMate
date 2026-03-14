export interface ILogger {
    debug(message: string, context?: Record<string, unknown>): void;
    info(message: string, context?: Record<string, unknown>): void;
    warn(message: string, context?: Record<string, unknown>): void;
    error(message: string, context?: Record<string, unknown>): void;
    createChild(prefix: string): ILogger;
}

export type Result<T, E = Error> = { success: true; data: T } | { success: false; error: E };

export type Brand<K, T> = K & { __brand: T };
export type ConversationId = Brand<string, 'ConversationId'>;
export type FolderId = Brand<string, 'FolderId'>;
export type TurnId = Brand<string, 'TurnId'>;

export const StorageKeys = {
    FOLDER_DATA: 'gvFolderData',
    LATEX_FIXER_ENABLED: 'geminimate_latex_enabled',
    MARKDOWN_REPAIR_ENABLED: 'geminimate_markdown_enabled',
    MERMAID_RENDER_ENABLED: 'geminimate_mermaid_enabled',
    SVG_RENDER_ENABLED: 'geminimate_svg_render_enabled',
    THOUGHT_TRANSLATION_ENABLED: 'geminimate_thought_translation_enabled',
    THOUGHT_TRANSLATION_MODE: 'geminimate_thought_translation_mode',
    YOUTUBE_RECOMMENDATION_BLOCKER_ENABLED: 'geminimate_youtube_recommendation_blocker_enabled',
    FORMULA_COPY_ENABLED: 'geminimate_formula_copy_enabled',
    FORMULA_COPY_FORMAT: 'geminimate_formula_copy_format',
    WATERMARK_REMOVER_ENABLED: 'geminiWatermarkRemoverEnabled',
    QUOTE_REPLY_ENABLED: 'gvQuoteReplyEnabled',
    BOTTOM_CLEANUP_ENABLED: 'geminimate_bottom_cleanup_enabled',
    DEBUG_MODE: 'geminimate_debug_mode',
    DEBUG_LOGS: 'geminimate_debug_logs',
    DEBUG_FILE_LOG_ENABLED: 'geminimate_debug_file_log_enabled',
    DEBUG_CACHE_CAPTURE_ENABLED: 'geminimate_debug_cache_capture_enabled',
    LANGUAGE: 'geminimate_language',
    TIMELINE_ENABLED: 'geminimate_timeline_enabled',
    TIMELINE_WIDTH: 'geminimate_timeline_width',
    TIMELINE_AUTO_HIDE: 'geminimate_timeline_auto_hide',
    TIMELINE_SEARCH_INCLUDE_REPLIES: 'geminimate_timeline_search_include_replies',
    TIMELINE_STARRED_MESSAGES: 'geminiTimelineStarred',
    TIMELINE_SCROLL_MODE: 'geminiTimelineScrollMode',
    GEMINI_CHAT_WIDTH: 'geminimate_chat_width',
    GEMINI_EDIT_INPUT_WIDTH: 'geminimate_edit_input_width',
    GEMINI_SIDEBAR_WIDTH: 'geminimate_sidebar_width',
    GEMINI_SIDEBAR_AUTO_HIDE: 'geminimate_sidebar_auto_hide',
    GEMINI_ZOOM_LEVEL: 'geminimate_zoom_level',
    GEMINI_FONT_SIZE_SCALE: 'geminimate_font_size_scale',
    GEMINI_FONT_WEIGHT: 'geminimate_font_weight',
    GEMINI_FONT_FAMILY: 'geminimate_font_family',
    GEMINI_SANS_PRESET: 'geminimate_sans_preset',
    GEMINI_SERIF_PRESET: 'geminimate_serif_preset',
    GEMINI_CUSTOM_FONTS: 'geminimate_custom_fonts',
    GEMINI_LETTER_SPACING: 'geminimate_letter_spacing',
    GEMINI_LINE_HEIGHT: 'geminimate_line_height',
    GEMINI_PARAGRAPH_INDENT_ENABLED: 'geminimate_paragraph_indent_enabled',
    GEMINI_EMPHASIS_MODE: 'geminimate_emphasis_mode',
    WORD_RESPONSE_EXPORT_ENABLED: 'geminimate_word_response_export_enabled',
    WORD_RESPONSE_EXPORT_MODE: 'geminimate_word_response_export_mode',
    WORD_RESPONSE_EXPORT_PURE_BODY: 'geminimate_word_response_export_pure_body',
    WORD_RESPONSE_EXPORT_FONT_SIZE_SCALE: 'geminimate_word_response_export_font_size_scale',
    WORD_RESPONSE_EXPORT_LINE_HEIGHT_SCALE: 'geminimate_word_response_export_line_height_scale',
    WORD_RESPONSE_EXPORT_LETTER_SPACING_SCALE: 'geminimate_word_response_export_letter_spacing_scale',
    GV_FOLDER_FILTER_USER_ONLY: 'gvFolderFilterUserOnly',
    GV_FOLDER_TREE_INDENT: 'gvFolderTreeIndent',
    GV_ACCOUNT_ISOLATION_ENABLED: 'gvAccountIsolationEnabled',
    GV_ACCOUNT_ISOLATION_ENABLED_GEMINI: 'gvAccountIsolationEnabledGemini',
    GV_ACCOUNT_PROFILE_MAP: 'gvAccountProfileMap',
} as const;
