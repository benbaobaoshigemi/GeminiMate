export async function initI18n(): Promise<void> {
    // No-op for now since GeminiMate doesn't require full internationalization
}

export function getTranslationSync(key: string): string {
    // Provide basic English defaults for Timeline
    const dict: Record<string, string> = {
        'timelinePreviewSearch': 'Search messages...',
        'timelinePreviewNoResults': 'No matches found.',
        'timelinePreviewNoMessages': 'No messages in timeline.',
    };
    return dict[key] ?? key;
}
