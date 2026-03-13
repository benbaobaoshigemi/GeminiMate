/**
 * Gemini LaTeX & Markdown Proofreader - Extension v1.3 (Surgical Mode + Settings + Mixed Content)
 */

(function () {
    const CONFIG = {
        name: "Gemini Correction Extension v1.3",
        selectors: {
            messageContainer: 'message-content',
            contentToClone: '.markdown',
        }
    };

    let CURRENT_MODE = 'repair'; // 'repair' or 'erase'

    // Load initial setting
    if (chrome.storage && chrome.storage.local) {
        chrome.storage.local.get(['geminiFixedMode'], (result) => {
            if (result.geminiFixedMode) {
                CURRENT_MODE = result.geminiFixedMode;
                console.log(`🚀 ${CONFIG.name} Initialized in [${CURRENT_MODE.toUpperCase()}] mode`);
                // Force re-scan on load
                document.querySelectorAll(CONFIG.selectors.messageContainer).forEach(msg => {
                    msg.dataset.needsSync = "true";
                });
            }
        });
    }

    // Listen for mode changes from popup
    if (chrome.runtime && chrome.runtime.onMessage) {
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            if (request.action === 'updateMode') {
                CURRENT_MODE = request.mode;
                console.log(`🔄 Switched to [${CURRENT_MODE.toUpperCase()}] mode`);
                // Reset surgical flags to force re-processing
                document.querySelectorAll(CONFIG.selectors.messageContainer).forEach(msg => {
                    msg.dataset.geminiSurgicalFixed = "false";
                    msg.dataset.needsSync = "true";
                });
                runScan();
            }
        });
    }

    // Handle Trusted Types
    let ttPolicy = null;
    if (window.trustedTypes) {
        try {
            ttPolicy = window.trustedTypes.createPolicy('gemini-cleaner-ext', {
                createHTML: (s) => s
            });
        } catch (e) { }
    }

    console.log(`🚀 ${CONFIG.name} Loaded (Surgical Mode)`);

    /**
     * Block-Level LaTeX Fix: Fixes sticky boundaries ($$formula) and adds markers.
     */
    function blockFixLatex(container) {
        const blocks = container.querySelectorAll('p, li, blockquote, td, span');
        let changed = false;

        blocks.forEach(block => {
            if (block.closest('.math-inline, .math-block, code, pre')) return;
            if (!block.textContent.includes('$')) return;
            if (block.querySelector('table, div, h1, h2, h3')) return;

            const originalHTML = block.innerHTML;
            let fixedHTML = originalHTML;

            // Fix sticky end: text$$ -> text $$
            // RESTRICTED TO BLOCK MATH ($$) to avoid breaking inline math ($x$)
            fixedHTML = fixedHTML.replace(/([^\s\$])(\${2,})(?!\d)/g, (match, text, delimiter) => {
                changed = true;
                return `${text}<span style="border-bottom: 2px dashed #b2ff59" title="LaTeX Boundary Repaired"> ${delimiter}</span>`;
            });

            // Fix sticky start: $$text -> $$ text
            // RESTRICTED TO BLOCK MATH ($$)
            fixedHTML = fixedHTML.replace(/(\${2,})([^\s\$])/g, (match, delimiter, text) => {
                changed = true;
                return `<span style="border-bottom: 2px dashed #b2ff59" title="LaTeX Boundary Repaired">${delimiter} </span>${text}`;
            });

            if (fixedHTML !== originalHTML) {
                block.innerHTML = ttPolicy ? ttPolicy.createHTML(fixedHTML) : fixedHTML;
            }
        });
        return changed;
    }

    /**
     * Block-Level Hydration: Fixes **bold** patterns even if split across nodes or math.
     * Logic depends on CURRENT_MODE.
     */
    function blockHydrateBold(container) {
        const blocks = container.querySelectorAll('p, li, blockquote, td, span, div');
        let changed = false;

        blocks.forEach(block => {
            // Safety: Skip active code blocks
            if (block.closest('pre, code')) return;

            // Optimization: Skip if no double-asterisk present
            if (!block.textContent.includes('**')) return;

            // Relaxed Safety: We no longer skip blocks with divs/tables aggressively.
            // We just ensure we don't break them by replacing carefully inside text.
            // But relying on innerHTML replace for **...** is generally safe unless ** spans tags weirdly.

            const originalHTML = block.innerHTML;
            const regex = /\*\*([\s\S]+?)\*\*/g;

            const fixedHTML = originalHTML.replace(regex, (match, content) => {
                if (!content.trim()) return match;

                if (CURRENT_MODE === 'erase') {
                    // Erase mode: Remove markers, keep content plain
                    return content;
                } else {
                    // Repair mode: Hydrate into bold
                    const trimmed = content.replace(/^[\s\xa0]+|[\s\xa0]+$/g, '');
                    return `<b style="border-bottom: 2px dashed #ffab40" title="Block Hydrated Bold">${trimmed}</b>`;
                }
            });

            if (fixedHTML !== originalHTML) {
                block.innerHTML = ttPolicy ? ttPolicy.createHTML(fixedHTML) : fixedHTML;
                changed = true;
            }
        });

        return changed;
    }

    /**
     * Inline LaTeX Fix: Inserts spaces between CJK characters and '$' to prevent sticky rendering issues.
     * e.g. "发生$E=mc^2$" -> "发生 $E=mc^2$"
     */
    function inlineFixLatex(container) {
        // We target text nodes primarily to avoid messing up HTML attributes
        // But for simplicity/speed in this extension context, working on innerHTML of blocks is often easier
        // provided we are careful not to destroy tags.
        // However, "inline" means we should be careful about block boundaries.

        // We reuse the logic from blockFixLatex to iterate blocks, but specific for inline CJK.
        const blocks = container.querySelectorAll('p, li, blockquote, td, span, div');
        let changed = false;

        blocks.forEach(block => {
            if (block.closest('.math-inline, .math-block, code, pre')) return;
            // Optimization: traverse only if both '$' and CJK exist, or just '$'
            if (!block.textContent.includes('$')) return;

            // To safely edit text without breaking HTML, strictly we should use TreeWalker.
            // But simple regex on innerHTML is risky if attributes contain '$'. 
            // Let's try to be safer by only replacing in text content if possible, 
            // OR use a regex that avoids tags.

            // Regex explanation:
            // Group 1: CJK character ([\u4e00-\u9fa5])
            // Group 2: The dollar sign \$
            // Negative Lookahead: (?!\$) ensures we don't match block math '$$' start

            const originalHTML = block.innerHTML;
            let fixedHTML = originalHTML;

            // 1. LHS Sticky: char$content$ -> char $content$
            //    Finds: Non-Space + $ + Content(no $) + $ + (Not $)
            //    This implicitly excludes $$ blocks because 'Content' cannot start/end with $ in this regex
            fixedHTML = fixedHTML.replace(/([^\s-])(\$)([^$]+)(\$)(?!\$)/g, '$1 $2$3$4');

            // 2. RHS Sticky: $content$char -> $content$ char
            //    Finds: (Not $) + $ + Content(no $) + $ + Non-Space
            fixedHTML = fixedHTML.replace(/(?<!\$)(\$)([^$]+)(\$)([^\s-])/g, '$1$2$3 $4');

            if (fixedHTML !== originalHTML) {
                block.innerHTML = ttPolicy ? ttPolicy.createHTML(fixedHTML) : fixedHTML;
            }
        });

        return changed;
    }

    /**
     * Surgically fix bold spaces in EXISTING tags.
     * Logic depends on CURRENT_MODE.
     */
    function surgicalFixBold(container) {
        const bolds = container.querySelectorAll('b, strong');
        let changed = false;

        bolds.forEach(el => {
            if (CURRENT_MODE === 'erase') {
                // Erase mode: Safely Unwrap the bold tag (preserving children like Math)
                const parent = el.parentNode;
                if (parent) {
                    while (el.firstChild) {
                        parent.insertBefore(el.firstChild, el);
                    }
                    parent.removeChild(el);
                    changed = true;
                }
            } else {
                // Repair mode: Trim spaces
                // Only handle simple bold tags for trimming to avoid breaking structure
                if (el.children.length > 0) return;

                const originalText = el.textContent;
                const fixedText = originalText.replace(/^[\s\xa0]+/, '').replace(/[\s\xa0]+$/, '');

                if (fixedText !== originalText) {
                    el.textContent = fixedText;
                    el.style.borderBottom = "2px dashed #40c4ff";
                    el.title = "Surgically Trimmed Bold";
                    changed = true;
                }
            }
        });
        return changed;
    }

    function isMessageComplete(messageElement) {
        return !messageElement.hasAttribute('aria-busy') || messageElement.getAttribute('aria-busy') === 'false';
    }

    function processMessage(messageElement) {
        if (!isMessageComplete(messageElement)) return;
        const content = messageElement.querySelector(CONFIG.selectors.contentToClone);
        if (!content) return;

        // Force re-processing if flag was reset by mode switch
        if (messageElement.dataset.geminiSurgicalFixed === "true" && messageElement.dataset.needsSync !== "true") return;

        // console.log(`🛠 Surgical Refinement [${CURRENT_MODE}]: ${messageElement.id || '(msg)'}`);

        const latexChanged = blockFixLatex(content);
        // Fix inline sticky CJK before bold processing
        const inlineLatexChanged = inlineFixLatex(content);

        // Important: Order matters. Hydrate first to catch **..**, then FixBold to handle tags. 
        // Or if Erase mode: Hydrate removes **, FixBold removes <b>.
        const hydratedChanged = blockHydrateBold(content);
        const boldChanged = surgicalFixBold(content);

        if (latexChanged || inlineLatexChanged || boldChanged || hydratedChanged) {
            messageElement.dataset.geminiSurgicalFixed = "true";
            return true;
        }
        messageElement.dataset.needsSync = "false";
        return false;
    }

    // Inject script to force MathJax re-render in the main world
    function triggerMathJaxRefresh() {
        try {
            const script = document.createElement('script');
            // Use chrome.runtime.getURL to load the resource from the extension
            // This bypasses 'unsafe-inline' CSP blocks if the extension origin is whitelisted
            script.src = chrome.runtime.getURL('math_refresher.js');
            script.onload = function () {
                this.remove();
            };
            (document.head || document.documentElement).appendChild(script);
        } catch (e) {
            console.error('GeminiExt: Failed to inject math_refresher.js', e);
        }
    }

    function runScan() {
        let anyChanged = false;
        document.querySelectorAll(CONFIG.selectors.messageContainer).forEach(msg => {
            if (processMessage(msg)) anyChanged = true;
        });
        if (anyChanged) {
            triggerMathJaxRefresh();
        }
    }

    let scanTimeout;
    const observer = new MutationObserver((mutations) => {
        let shouldScan = false;
        mutations.forEach(m => {
            if (m.target.closest && m.target.closest(CONFIG.selectors.contentToClone)) {
                const msg = m.target.closest(CONFIG.selectors.messageContainer);
                if (msg) {
                    msg.dataset.needsSync = "true";
                    shouldScan = true;
                }
            }
        });
        if (shouldScan) {
            clearTimeout(scanTimeout);
            scanTimeout = setTimeout(runScan, 300);
        }
    });

    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    setTimeout(runScan, 1000);
    console.log(`🛠 Gemini Extension Surgical Watcher active [${CURRENT_MODE}].`);
})();
