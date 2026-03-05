export const keyboardShortcutService = {
    subscribe: (callback: (action: string) => void) => {
        // Dummy unsubscribe function since shortcuts are not implemented
        return () => { };
    }
};
