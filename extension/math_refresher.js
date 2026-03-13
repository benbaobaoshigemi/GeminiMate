(function () {
    // Debounce render to avoid performance hits
    if (window.geminiMathJaxTimer) clearTimeout(window.geminiMathJaxTimer);
    window.geminiMathJaxTimer = setTimeout(() => {
        if (window.MathJax) {
            try {
                if (window.MathJax.typesetPromise) {
                    window.MathJax.typesetPromise().catch(e => console.log('MathJax typeset failed', e));
                } else if (window.MathJax.Hub) {
                    window.MathJax.Hub.Queue(["Typeset", window.MathJax.Hub]);
                }
            } catch (e) { console.error('GeminiExt: MathJax error', e); }
        } else if (window.renderMathInElement) {
            // KaTeX Auto-render
            try {
                window.renderMathInElement(document.body);
            } catch (e) { console.error('GeminiExt: KaTeX error', e); }
        }
    }, 100);
})();
