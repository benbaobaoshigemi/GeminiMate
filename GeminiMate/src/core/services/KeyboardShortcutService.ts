export const keyboardShortcutService = {
    subscribe: (_callback: (action: string) => void) => {
        // Dummy unsubscribe function since shortcuts are not implemented
        return () => { };
    }
};
