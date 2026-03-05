document.addEventListener('DOMContentLoaded', () => {
    const radios = document.querySelectorAll('input[name="mode"]');

    // Load saved setting
    chrome.storage.local.get(['geminiFixedMode'], (result) => {
        const mode = result.geminiFixedMode || 'repair'; // Default to repair
        document.getElementById(mode).checked = true;
    });

    // Save setting on change and notify content script
    radios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            const mode = e.target.value;
            chrome.storage.local.set({ geminiFixedMode: mode }, () => {
                console.log('Settings saved:', mode);
                // Notify open tabs
                chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                    if (tabs[0] && tabs[0].id) {
                        chrome.tabs.sendMessage(tabs[0].id, {
                            action: 'updateMode',
                            mode: mode
                        });
                    }
                });
            });
        });
    });
});
