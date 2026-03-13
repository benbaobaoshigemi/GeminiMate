document.addEventListener('DOMContentLoaded', () => {
    const latexToggle = document.getElementById('fix-latex-toggle');
    const mdToggle = document.getElementById('fix-markdown-toggle');

    // Load saved states
    chrome.storage.local.get(['geminiFixerLatexEnabled', 'geminiFixerMarkdownEnabled'], (result) => {
        if (result.geminiFixerLatexEnabled !== undefined) {
            latexToggle.checked = result.geminiFixerLatexEnabled;
        }
        if (result.geminiFixerMarkdownEnabled !== undefined) {
            mdToggle.checked = result.geminiFixerMarkdownEnabled;
        }
    });

    // All state changes go through storage — content.js listens via onChanged
    latexToggle.addEventListener('change', () => {
        chrome.storage.local.set({ geminiFixerLatexEnabled: latexToggle.checked });
    });

    mdToggle.addEventListener('change', () => {
        chrome.storage.local.set({ geminiFixerMarkdownEnabled: mdToggle.checked });
    });
});
