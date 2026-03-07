import{t as M,J as F}from"./vendor-export-Bi8-UUDe.js";function _(){const p=navigator.userAgent.toLowerCase(),e=navigator.vendor.toLowerCase().includes("apple"),n=p.includes("safari"),i=!p.includes("chrome")&&!p.includes("chromium");return e&&n&&i}const E="image_render_event_error";function O(p){if(!p||typeof p!="object")return!1;const t=p;return t.type==="error"&&typeof t.preventDefault=="function"&&typeof t.stopPropagation=="function"}function R(p,t){const e=p.querySelectorAll(t);for(const n of Array.from(e))if(!n.closest("model-thoughts, .thoughts-container, .thoughts-content"))return n;return null}class T{static DEBUG=!1;static extractUserContent(t){const e={text:"",html:"",hasImages:!1,hasFormulas:!1,hasTables:!1,hasCode:!1},n=t.querySelectorAll("user-query-file-preview img, .preview-image");e.hasImages=n.length>0;const i=t.querySelectorAll(".query-text-line"),r=[];i.forEach(c=>{const d=this.normalizeText(c.textContent||"");d&&r.push(d)}),e.text=r.join(`
`);const a=[],o=[];n.forEach((c,d)=>{const h=c.src,m=c.alt||`Uploaded image ${d+1}`;a.push(`<img src="${h}" alt="${m}" />`),o.push(`![${m}](${h})`)});const s=[];return o.length>0&&s.push(o.join(`

`)),r.length>0&&s.push(r.join(`
`)),e.text=s.join(`

`),r.forEach(c=>{a.push(`<p>${this.escapeHtml(c)}</p>`)}),e.html=a.join(`
`),e}static extractAssistantContent(t){this.DEBUG&&console.log("[DOMContentExtractor] extractAssistantContent called, element:",t);const e={text:"",html:"",hasImages:!1,hasFormulas:!1,hasTables:!1,hasCode:!1};let n=R(t,"message-content");n||(n=R(t,".markdown-main-panel, .markdown, .model-response-text")),n||(t.classList.contains("markdown")||t.tagName.toLowerCase()==="message-content")&&(n=t),n||(console.warn("[DOMContentExtractor] Response container not found, using element directly"),n=t),this.DEBUG&&console.log("[DOMContentExtractor] Using container:",n.tagName,n.className);const i=[],r=[],a=n.querySelector(".markdown, .markdown-main-panel");this.DEBUG&&(console.log("[DOMContentExtractor] messageContent tagName:",n.tagName),console.log("[DOMContentExtractor] messageContent className:",n.className),console.log("[DOMContentExtractor] markdownDiv found?",!!a)),a?(this.DEBUG&&(console.log("[DOMContentExtractor] markdownDiv tagName:",a.tagName),console.log("[DOMContentExtractor] markdownDiv className:",a.className),console.log("[DOMContentExtractor] markdownDiv innerHTML preview:",a.innerHTML.substring(0,300))),this.processNodes(a,i,r,e)):(this.DEBUG&&console.log("[DOMContentExtractor] No markdown div found, using fallback"),this.processNodes(n,i,r,e)),this.DEBUG&&(console.log("[DOMContentExtractor] Searching for code blocks in:",t.tagName,t.className),console.log("[DOMContentExtractor] Element HTML preview:",t.outerHTML.substring(0,200)));const s=((d,h)=>{const m=[];m.push(...Array.from(d.querySelectorAll(h)));const l=b=>{const g=b.shadowRoot;g&&(console.log("[DOMContentExtractor] Searching in Shadow DOM of",b.tagName),m.push(...Array.from(g.querySelectorAll(h)))),Array.from(b.children).forEach(l)};return l(d),m})(n,'pre > code, [data-test-id="code-content"]');this.DEBUG&&console.log("[DOMContentExtractor] Found",s.length,"raw code elements with alternative selector"),s.forEach((d,h)=>{if(d.processedByGV||d.closest&&d.closest("code-block"))return;this.DEBUG&&console.log(`[DOMContentExtractor] Processing raw code element ${h+1}/${s.length}`);const m=this.extractCodeFromCodeElement(d);m.text&&(d.processedByGV=!0,e.hasCode=!0,i.push(m.html),r.push(`
${m.text}
`))}),e.html=i.join(`
`);let c=r.join("").replace(/\n{3,}/g,`

`).trim();if(!c){const d=n||R(t,"message-content")||t;try{const h=d.innerText||d.textContent||"";c=this.normalizeText(h)}catch{}}return e.text=c,e}static processNodes(t,e,n,i){const r=Array.from(t.children);this.DEBUG&&console.log(`[DOMContentExtractor] processNodes: ${r.length} children in`,t.tagName,t.className);const a=t.shadowRoot;a&&(this.DEBUG&&console.log("[DOMContentExtractor] Found Shadow DOM! Processing shadow children"),this.processNodes(a,e,n,i));for(const o of r){const s=o.tagName.toLowerCase();if(this.DEBUG&&console.log("[DOMContentExtractor] Processing child:",s,o.className),this.shouldSkipElement(o)){this.DEBUG&&console.log("[DOMContentExtractor] Skipping element:",s);continue}if(s==="img"){const m=o,l=m.getAttribute("src")||m.src||"";if(l&&l!=="about:blank"){i.hasImages=!0;const g=(m.getAttribute("alt")||"").trim()||"Image";e.push(`<img src="${this.escapeHtmlAttribute(l)}" alt="${this.escapeHtmlAttribute(g)}" />`);const u=g.replace(/\]/g,"\\]");n.push(`
![${u}](${l})
`)}continue}if(o.classList.contains("math-block")||o.hasAttribute("data-math")){const m=o.getAttribute("data-math")||"";if(m){this.DEBUG&&console.log("[DOMContentExtractor] Found math-block, latex:",m),i.hasFormulas=!0;const l=o.cloneNode(!0);l.hasAttribute("data-math")||l.setAttribute("data-math",m),e.push(l.outerHTML),n.push(`
$$
${m}
$$
`);continue}}const c=o.querySelector("code-block");if(s==="code-block"||o.classList.contains("code-block")||c){this.DEBUG&&console.log("[DOMContentExtractor] Found code block!");const m=c||o,l=this.extractCodeBlock(m);this.DEBUG&&console.log("[DOMContentExtractor] Code content:",l.text),l.text&&(i.hasCode=!0,e.push(l.html),n.push(`
${l.text}
`));continue}const d=o.querySelector("table-block");if(s==="table-block"||d||o.querySelector("table")){this.DEBUG&&console.log("[DOMContentExtractor] Found table block!");const m=d||o,l=this.extractTable(m);this.DEBUG&&console.log("[DOMContentExtractor] Table content:",l.text),l.text&&(i.hasTables=!0,e.push(l.html),n.push(`
${l.text}
`));continue}{const m=o.querySelectorAll(".attachment-container.search-images .image-container[data-full-size-image-uri]");if(m.length>0){for(const l of Array.from(m)){const b=l.getAttribute("data-full-size-image-uri")||"",g=l.querySelector("img.image");if(!g)continue;const u=g.src||"";if(!u||u==="about:blank")continue;const x=g.alt||"Search result image",v=l.querySelector("a.source")?.href||"",I=l.querySelector(".source .label")?.textContent?.trim()||"";i.hasImages=!0,e.push(`<img src="${this.escapeHtmlAttribute(u)}" alt="${this.escapeHtmlAttribute(x)}" />`);const C=x.replace(/\]/g,"\\]"),N=b||v,S=I||v||"";N?n.push(`
![${C}](${u})
*Source: [${S||N}](${N})*
`):n.push(`
![${C}](${u})
`)}this.DEBUG&&console.log("[DOMContentExtractor] Extracted",m.length,"search result images");continue}}{const m=o.querySelectorAll("generated-image img, single-image img, .attachment-container.generated-images img");if(m.length>0){for(const l of Array.from(m)){const b=l,g=b.src||b.getAttribute("src")||"";if(!g||g==="about:blank")continue;const u=b.alt||"Generated image";i.hasImages=!0,e.push(`<img src="${this.escapeHtmlAttribute(g)}" alt="${this.escapeHtmlAttribute(u)}" />`);const x=u.replace(/\]/g,"\\]");n.push(`
![${x}](${g})
`)}this.DEBUG&&console.log("[DOMContentExtractor] Extracted",m.length,"generated images");continue}}if(s==="hr"){e.push("<hr>"),n.push(`
---
`);continue}if(s==="p"){const m=this.processInlineContent(o);m.hasFormulas&&(i.hasFormulas=!0),e.push(`<p>${m.html}</p>`),n.push(`${m.text}
`);continue}if(/^h[1-6]$/.test(s)){const m=this.extractTextWithInlineFormulas(o),l=s[1];e.push(`<h${l}>${m.html}</h${l}>`),n.push(`
${"#".repeat(parseInt(l))} ${m.text}
`);continue}if(s==="ul"||s==="ol"){const m=this.extractList(o);e.push(m.html),n.push(`
${m.text}
`);continue}if(s==="response-element"||s==="div"||s==="section"||s==="article"||s==="generated-image"||s==="single-image"||o.classList.contains("horizontal-scroll-wrapper")||o.classList.contains("table-block-component")){this.DEBUG&&console.log("[DOMContentExtractor] Recursing into container:",s,o.className),this.processNodes(o,e,n,i);continue}const h=this.normalizeText(o.textContent||"");h&&(e.push(`<span>${this.escapeHtml(h)}</span>`),n.push(h))}}static shouldSkipElement(t){return!!(t.tagName==="BUTTON"||t.tagName==="MAT-ICON"||t.tagName==="SOURCES-CAROUSEL-INLINE"||t.tagName==="SOURCE-INLINE-CHIPS"||t.tagName==="SOURCE-INLINE-CHIP"||t.tagName==="SHARE-BUTTON"||t.tagName==="COPY-BUTTON"||t.tagName==="DOWNLOAD-GENERATED-IMAGE-BUTTON"||t.tagName==="MODEL-THOUGHTS"||t.classList.contains("model-thoughts")||t.classList.contains("copy-button")||t.classList.contains("action-button")||t.classList.contains("table-footer")||t.classList.contains("export-sheets-button")||t.classList.contains("thoughts-header")||t.classList.contains("source-inline-chip-container")||t.classList.contains("nanobanana-indicator")||t.classList.contains("generated-image-controls")||t.classList.contains("hide-from-message-actions"))}static processInlineContent(t){let e=!1;const n=[],i=[],r=a=>{if(a.nodeType===Node.TEXT_NODE){const o=a.textContent||"";o.trim()&&(n.push(this.escapeHtml(o)),i.push(o))}else if(a.nodeType===Node.ELEMENT_NODE){const o=a;if(this.shouldSkipElement(o))return;if(o.classList.contains("math-inline")||o.hasAttribute("data-math")){const s=o.getAttribute("data-math")||"";if(s){e=!0;const c=o.cloneNode(!0);c.hasAttribute("data-math")||c.setAttribute("data-math",s),n.push(c.outerHTML),i.push(`$${s}$`);return}}if(o.tagName==="I"||o.tagName==="EM"){const s=this.normalizeText(o.textContent||"");n.push(`<em>${this.escapeHtml(s)}</em>`),i.push(`*${s}*`);return}if(o.tagName==="B"||o.tagName==="STRONG"){const s=this.normalizeText(o.textContent||"");n.push(`<strong>${this.escapeHtml(s)}</strong>`),i.push(`**${s}**`);return}if(o.tagName==="CODE"&&!o.closest("pre")){const s=this.normalizeText(o.textContent||"");n.push(`<code>${this.escapeHtml(s)}</code>`),i.push(`\`${s}\``);return}if(o.tagName==="IMG"){const s=o,c=s.src||s.getAttribute("src")||"";if(c&&c!=="about:blank"){const d=s.alt||"Image";n.push(`<img src="${this.escapeHtmlAttribute(c)}" alt="${this.escapeHtmlAttribute(d)}" />`);const h=d.replace(/\]/g,"\\]");i.push(`![${h}](${c})`)}return}Array.from(o.childNodes).forEach(r)}};return Array.from(t.childNodes).forEach(r),{html:n.join(""),text:i.join(""),hasFormulas:e}}static extractTextWithInlineFormulas(t){const e=this.processInlineContent(t);return{html:e.html,text:e.text}}static extractCodeBlock(t){const n=t.querySelector('code[role="text"], code')?.textContent||"";let i="";const r=t.querySelector(".code-block-decoration");return r&&(i=this.normalizeText(r.textContent||"").toLowerCase()),{html:`<pre><code class="language-${i}">${this.escapeHtml(n)}</code></pre>`,text:`\`\`\`${i}
${n}
\`\`\``}}static extractCodeFromCodeElement(t){const e=t.textContent||"";let n="";const r=(t.getAttribute("class")||"").toLowerCase().match(/language-([a-z0-9]+)/i);if(r)n=r[1];else{const a=t.closest("code-block");if(a){const o=a.querySelector(".code-block-decoration");o&&(n=this.normalizeText(o.textContent||"").toLowerCase())}}return{html:`<pre><code class="language-${n}">${this.escapeHtml(e)}</code></pre>`,text:`\`\`\`${n}
${e}
\`\`\``}}static extractTable(t){let e=null;if(t.tagName&&t.tagName.toLowerCase()==="table"?e=t:e=t.querySelector("table"),!e)return{html:"",text:""};const n=e.cloneNode(!0);this.stripExportArtifacts(n);const i=[],r=Array.from(e.querySelectorAll("thead tr td, thead tr th"));r.length>0&&i.push(r.map(s=>this.normalizeText(s.textContent||""))),e.querySelectorAll("tbody tr").forEach(s=>{const c=Array.from(s.querySelectorAll("td, th"));i.push(c.map(d=>this.normalizeText(d.textContent||"")))});const o=[];if(i.length>0){o.push("| "+i[0].join(" | ")+" |"),o.push("| "+i[0].map(()=>"---").join(" | ")+" |");for(let s=1;s<i.length;s++)o.push("| "+i[s].join(" | ")+" |")}else{const s=e.querySelector("tbody tr");if(s){const c=Array.from(s.querySelectorAll("td, th")).map(d=>this.normalizeText(d.textContent||""));c.length>0&&(o.push("| "+c.join(" | ")+" |"),o.push("| "+c.map(()=>"---").join(" | ")+" |"),Array.from(e.querySelectorAll("tbody tr")).slice(1).forEach(h=>{const m=Array.from(h.querySelectorAll("td, th")).map(l=>this.normalizeText(l.textContent||""));o.push("| "+m.join(" | ")+" |")}))}}return{html:n.outerHTML,text:o.join(`
`)}}static extractList(t,e=0){const n=t.tagName==="OL",i=Array.from(t.querySelectorAll(":scope > li")),r="  ".repeat(e),a=[];i.forEach((s,c)=>{const d=document.createElement("div");Array.from(s.childNodes).forEach(u=>{if(u.nodeType===Node.TEXT_NODE)d.appendChild(u.cloneNode(!0));else if(u.nodeType===Node.ELEMENT_NODE){const x=u;x.tagName!=="UL"&&x.tagName!=="OL"&&d.appendChild(x.cloneNode(!0))}});const l=this.processInlineContent(d).text||this.normalizeText(d.textContent||""),b=n?`${c+1}. `:"- ";a.push(r+b+l),s.querySelectorAll(":scope > ul, :scope > ol").forEach(u=>{const x=this.extractList(u,e+1);x.text&&a.push(x.text)})});const o=t.cloneNode(!0);return this.stripExportArtifacts(o),{html:o.outerHTML,text:a.join(`
`)}}static stripExportArtifacts(t){const e=["button","mat-icon","model-thoughts","sources-carousel-inline","source-inline-chips","source-inline-chip","share-button","copy-button","download-generated-image-button",".model-thoughts",".copy-button",".action-button",".table-footer",".export-sheets-button",".thoughts-header",".source-inline-chip-container",".nanobanana-indicator",".generated-image-controls",".hide-from-message-actions"].join(",");t.querySelectorAll(e).forEach(n=>n.remove())}static normalizeText(t){return t.replace(/\s+/g," ").trim()}static escapeHtml(t){const e=document.createElement("div");return e.textContent=t,e.innerHTML}static escapeHtmlAttribute(t){return String(t).replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/'/g,"&#39;")}}class Y{static PRINT_STYLES_ID="gv-deep-research-pdf-print-styles";static PRINT_CONTAINER_ID="gv-deep-research-pdf-print-container";static PRINT_BODY_CLASS="gv-deep-research-pdf-printing";static PRINT_SAFARI_BODY_CLASS="gv-deep-research-pdf-safari-printing";static CLEANUP_FALLBACK_DELAY_MS=6e4;static INLINE_FETCH_TIMEOUT_MS=2e3;static INLINE_DECODE_TIMEOUT_MS=1e3;static cleanupFallbackTimer=null;static originalDocumentTitle=null;static async export(t){this.cleanup();const e=this.createPrintContainer(t);document.body.appendChild(e),this.injectPrintStyles(),document.body.classList.add(this.PRINT_BODY_CLASS),this.originalDocumentTitle=document.title;const n=this.normalizeTitle(t.title)||"Deep Research Report";document.title=n;const i=_(),r=this.inlineImages(e).catch(()=>{});if(i){document.body.classList.add(this.PRINT_SAFARI_BODY_CLASS),this.forceStyleFlush(e),this.triggerPrint(),this.registerCleanupHandlers();return}await r,await this.delay(100),this.triggerPrint(),this.registerCleanupHandlers()}static triggerPrint(){try{window.print()}catch{}}static forceStyleFlush(t){try{t.getBoundingClientRect()}catch{}}static delay(t){return new Promise(e=>{this.setTimeoutUnref(e,t)})}static setTimeoutUnref(t,e){const n=setTimeout(t,e);return typeof n=="object"&&n!==null&&"unref"in n&&typeof n.unref=="function"&&n.unref(),n}static registerCleanupHandlers(){const t=()=>{this.cleanup()};try{window.addEventListener("afterprint",t,{once:!0})}catch{}this.cleanupFallbackTimer!==null&&clearTimeout(this.cleanupFallbackTimer),this.cleanupFallbackTimer=this.setTimeoutUnref(()=>{this.cleanup()},this.CLEANUP_FALLBACK_DELAY_MS)}static cleanup(){this.cleanupFallbackTimer!==null&&(clearTimeout(this.cleanupFallbackTimer),this.cleanupFallbackTimer=null);try{document.body.classList.remove(this.PRINT_BODY_CLASS),document.body.classList.remove(this.PRINT_SAFARI_BODY_CLASS)}catch{}const t=document.getElementById(this.PRINT_CONTAINER_ID);t&&t.remove();const e=document.getElementById(this.PRINT_STYLES_ID);if(e&&e.remove(),this.originalDocumentTitle!==null){try{document.title=this.originalDocumentTitle}catch{}this.originalDocumentTitle=null}try{window.dispatchEvent(new CustomEvent("gv-print-cleanup"))}catch{}}static createPrintContainer(t){const e=document.createElement("div");e.id=this.PRINT_CONTAINER_ID,e.className="gv-print-only gv-deep-research-print-only";const n=this.sanitizePrintableHtml(t.html),i=this.extractPlainTextFromHtml(t.html)||t.markdown.trim(),r=n||this.formatPlainTextAsHtml(i||"No content"),a=this.normalizeTitle(t.title)||"Deep Research Report",o=this.formatDate(t.exportedAt);return e.innerHTML=`
      <div class="gv-dr-print-document">
        <div class="gv-dr-print-cover-page">
          <div class="gv-dr-print-cover-content">
            <h1 class="gv-dr-print-cover-title">${this.escapeHTML(a)}</h1>
            <div class="gv-dr-print-meta">
              <p>${this.escapeHTML(o)}</p>
              <p><a href="${this.escapeAttribute(t.url)}">${this.escapeHTML(t.url)}</a></p>
              <p>Deep Research Report</p>
            </div>
          </div>
        </div>
        <div class="gv-dr-print-content">
          <div class="gv-dr-print-report">${r}</div>
        </div>
        <div class="gv-dr-print-footer">
          <p>Exported from <a href="https://github.com/Nagi-ovo/gemini-voyager">Gemini Voyager</a></p>
          <p>Generated on ${this.escapeHTML(o)}</p>
        </div>
      </div>
    `,e}static sanitizePrintableHtml(t){const e=t.trim();if(!e)return"";const n=document.createElement("div");return n.innerHTML=e,n.querySelectorAll("script, style, template").forEach(r=>r.remove()),Array.from(n.querySelectorAll("*")).forEach(r=>{Array.from(r.attributes).forEach(o=>{o.name.toLowerCase().startsWith("on")&&r.removeAttribute(o.name)})}),n.innerHTML.trim()}static extractPlainTextFromHtml(t){const e=t.trim();if(!e)return"";const n=document.createElement("div");return n.innerHTML=e,n.querySelectorAll("script, style, template").forEach(i=>i.remove()),this.normalizeWhitespace(n.textContent||"")}static normalizeWhitespace(t){return t.replace(/\r/g,"").replace(/[ \t]+\n/g,`
`).replace(/\n{3,}/g,`

`).trim()}static formatPlainTextAsHtml(t){return t.trim()?this.escapeHTML(t).split(`

`).map(n=>`<p>${n.replace(/\n/g,"<br>")}</p>`).join(`
`):""}static normalizeTitle(t){return t.trim().replace(/\s+-\s+Gemini$/i,"").replace(/\s+-\s+Google Gemini$/i,"").replace(/\s+/g," ").trim()}static formatDate(t){try{return new Date(t).toLocaleString("en-US",{year:"numeric",month:"long",day:"numeric",hour:"2-digit",minute:"2-digit"})}catch{return t}}static injectPrintStyles(){if(document.getElementById(this.PRINT_STYLES_ID))return;const t=document.createElement("style");t.id=this.PRINT_STYLES_ID,t.textContent=`
      .gv-deep-research-print-only {
        display: none;
      }

      @media print {
        body.${this.PRINT_BODY_CLASS} > *:not(#${this.PRINT_CONTAINER_ID}) {
          display: none !important;
          visibility: hidden !important;
        }

        body.${this.PRINT_BODY_CLASS} #${this.PRINT_CONTAINER_ID} {
          display: block !important;
          visibility: visible !important;
        }

        body.${this.PRINT_BODY_CLASS} #${this.PRINT_CONTAINER_ID},
        body.${this.PRINT_BODY_CLASS} #${this.PRINT_CONTAINER_ID} * {
          visibility: visible !important;
        }

        html,
        body {
          background: #fff !important;
        }

        body.${this.PRINT_BODY_CLASS} {
          background: #fff !important;
        }

        body.${this.PRINT_BODY_CLASS} #${this.PRINT_CONTAINER_ID} * {
          display: revert !important;
        }

        /* Preserve KaTeX layout primitives after the global display override above.
           Without these, sub/sup scripts (e.g. x_1) may become misaligned in PDF print. */
        body.${this.PRINT_BODY_CLASS} #${this.PRINT_CONTAINER_ID} .katex-display,
        body.${this.PRINT_BODY_CLASS} #${this.PRINT_CONTAINER_ID} .katex-display > .katex,
        body.${this.PRINT_BODY_CLASS} #${this.PRINT_CONTAINER_ID} .katex-display > .katex > .katex-html {
          display: block !important;
        }

        body.${this.PRINT_BODY_CLASS} #${this.PRINT_CONTAINER_ID} .katex .base,
        body.${this.PRINT_BODY_CLASS} #${this.PRINT_CONTAINER_ID} .katex .strut,
        body.${this.PRINT_BODY_CLASS} #${this.PRINT_CONTAINER_ID} .katex .vlist > span > span,
        body.${this.PRINT_BODY_CLASS} #${this.PRINT_CONTAINER_ID} .katex .mspace,
        body.${this.PRINT_BODY_CLASS} #${this.PRINT_CONTAINER_ID} .katex .mfrac .frac-line,
        body.${this.PRINT_BODY_CLASS} #${this.PRINT_CONTAINER_ID} .katex .rule,
        body.${this.PRINT_BODY_CLASS} #${this.PRINT_CONTAINER_ID} .katex .hline,
        body.${this.PRINT_BODY_CLASS} #${this.PRINT_CONTAINER_ID} .katex .hdashline,
        body.${this.PRINT_BODY_CLASS} #${this.PRINT_CONTAINER_ID} .katex .overline .overline-line,
        body.${this.PRINT_BODY_CLASS} #${this.PRINT_CONTAINER_ID} .katex .underline .underline-line,
        body.${this.PRINT_BODY_CLASS} #${this.PRINT_CONTAINER_ID} .katex .nulldelimiter,
        body.${this.PRINT_BODY_CLASS} #${this.PRINT_CONTAINER_ID} .katex .clap > .fix,
        body.${this.PRINT_BODY_CLASS} #${this.PRINT_CONTAINER_ID} .katex .llap > .fix,
        body.${this.PRINT_BODY_CLASS} #${this.PRINT_CONTAINER_ID} .katex .rlap > .fix,
        body.${this.PRINT_BODY_CLASS} #${this.PRINT_CONTAINER_ID} .katex .mtable .vertical-separator,
        body.${this.PRINT_BODY_CLASS} #${this.PRINT_CONTAINER_ID} .katex .mtable .arraycolsep,
        body.${this.PRINT_BODY_CLASS} #${this.PRINT_CONTAINER_ID} .katex .cd-vert-arrow,
        body.${this.PRINT_BODY_CLASS} #${this.PRINT_CONTAINER_ID} .katex .cd-label-left,
        body.${this.PRINT_BODY_CLASS} #${this.PRINT_CONTAINER_ID} .katex .cd-label-right {
          display: inline-block !important;
        }

        body.${this.PRINT_BODY_CLASS} #${this.PRINT_CONTAINER_ID} .katex .vlist-t {
          display: inline-table !important;
        }

        body.${this.PRINT_BODY_CLASS} #${this.PRINT_CONTAINER_ID} .katex .vlist-r {
          display: table-row !important;
        }

        body.${this.PRINT_BODY_CLASS} #${this.PRINT_CONTAINER_ID} .katex .vlist,
        body.${this.PRINT_BODY_CLASS} #${this.PRINT_CONTAINER_ID} .katex .vlist-s {
          display: table-cell !important;
        }

        body.${this.PRINT_BODY_CLASS} #${this.PRINT_CONTAINER_ID} .katex .vlist > span,
        body.${this.PRINT_BODY_CLASS} #${this.PRINT_CONTAINER_ID} .katex .katex-html > .newline,
        body.${this.PRINT_BODY_CLASS} #${this.PRINT_CONTAINER_ID} .katex .overlay,
        body.${this.PRINT_BODY_CLASS} #${this.PRINT_CONTAINER_ID} .katex svg,
        body.${this.PRINT_BODY_CLASS} #${this.PRINT_CONTAINER_ID} .katex .stretchy {
          display: block !important;
        }

        body.${this.PRINT_BODY_CLASS} #${this.PRINT_CONTAINER_ID} .katex .vbox,
        body.${this.PRINT_BODY_CLASS} #${this.PRINT_CONTAINER_ID} .katex .hbox,
        body.${this.PRINT_BODY_CLASS} #${this.PRINT_CONTAINER_ID} .katex .thinbox {
          display: inline-flex !important;
        }

        body.${this.PRINT_BODY_CLASS} #${this.PRINT_CONTAINER_ID} .gv-dr-print-report .katex {
          line-height: 1.2 !important;
        }

        body.${this.PRINT_BODY_CLASS} #${this.PRINT_CONTAINER_ID} {
          font-family: Georgia, 'Times New Roman', serif;
          color: #000;
          background: #fff;
        }

        @page {
          margin: 2cm;
          size: A4;
        }

        body.${this.PRINT_BODY_CLASS} .gv-dr-print-cover-page {
          min-height: calc(297mm - 4cm);
          position: relative;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          page-break-after: always;
          margin: 0;
          padding: 0;
          border: none;
          text-align: center;
        }

        body.${this.PRINT_BODY_CLASS} .gv-dr-print-cover-content {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 80%;
          max-width: 80%;
          box-sizing: border-box;
        }

        body.${this.PRINT_BODY_CLASS} .gv-dr-print-cover-title {
          font-size: 36pt;
          font-weight: 800;
          letter-spacing: -0.02em;
          margin: 0 0 1.5em 0;
          color: oklch(0.7227 0.1920 149.5793);
          line-height: 1.2;
          word-wrap: break-word;
        }

        body.${this.PRINT_BODY_CLASS} .gv-dr-print-meta {
          font-size: 12pt;
          color: #666;
          line-height: 2;
        }

        body.${this.PRINT_BODY_CLASS} .gv-dr-print-meta p {
          margin: 0.3em 0;
        }

        body.${this.PRINT_BODY_CLASS} .gv-dr-print-meta a {
          color: #666;
          text-decoration: none;
        }

        body.${this.PRINT_BODY_CLASS} .gv-dr-print-meta a:after {
          content: none !important;
        }

        body.${this.PRINT_BODY_CLASS} .gv-dr-print-content {
          margin: 2em 0;
          line-height: 1.65;
          font-size: 11pt;
        }

        body.${this.PRINT_BODY_CLASS} .gv-dr-print-report p {
          margin: 0.5em 0;
        }

        body.${this.PRINT_BODY_CLASS} .gv-dr-print-report img {
          max-width: 100%;
          height: auto;
          display: block;
          margin: 0.75em 0;
          page-break-inside: avoid;
        }

        body.${this.PRINT_BODY_CLASS} .gv-dr-print-report pre,
        body.${this.PRINT_BODY_CLASS} .gv-dr-print-report code {
          font-family: 'Courier New', monospace;
          font-size: 9pt;
          background: #f5f5f5;
          border-radius: 3px;
        }

        body.${this.PRINT_BODY_CLASS} .gv-dr-print-report pre {
          padding: 0.75em;
          border-left: 3px solid #d1d5db;
          overflow-x: auto;
          white-space: pre-wrap;
          word-wrap: break-word;
        }

        body.${this.PRINT_BODY_CLASS} .gv-dr-print-report .math-inline,
        body.${this.PRINT_BODY_CLASS} .gv-dr-print-report .math-block,
        body.${this.PRINT_BODY_CLASS} .gv-dr-print-report [data-math] {
          page-break-inside: avoid;
        }

        body.${this.PRINT_BODY_CLASS} .gv-dr-print-footer {
          margin-top: 2em;
          padding-top: 1em;
          border-top: 1px solid #ccc;
          font-size: 9pt;
          color: #666;
          text-align: center;
        }

        body.${this.PRINT_BODY_CLASS} .gv-dr-print-footer p {
          margin: 0.25em 0;
        }

        body.${this.PRINT_BODY_CLASS} .gv-dr-print-report sources-carousel-inline,
        body.${this.PRINT_BODY_CLASS} .gv-dr-print-report source-inline-chips,
        body.${this.PRINT_BODY_CLASS} .gv-dr-print-report source-inline-chip,
        body.${this.PRINT_BODY_CLASS} .gv-dr-print-report .source-inline-chip-container {
          display: none !important;
        }

        body.${this.PRINT_BODY_CLASS} .gv-dr-print-report a {
          color: #2563eb;
          text-decoration: none;
        }

        body.${this.PRINT_BODY_CLASS} .gv-dr-print-report a[href]:after {
          content: " (" attr(href) ")";
          font-size: 9pt;
          color: #666;
        }

        body.${this.PRINT_BODY_CLASS}.${this.PRINT_SAFARI_BODY_CLASS} .gv-dr-print-cover-page {
          min-height: auto !important;
          position: static !important;
          display: block !important;
          padding: 0 0 1.25em 0 !important;
          border-bottom: 1px solid #e5e7eb !important;
          text-align: left !important;
        }

        body.${this.PRINT_BODY_CLASS}.${this.PRINT_SAFARI_BODY_CLASS} .gv-dr-print-cover-content {
          position: static !important;
          top: auto !important;
          left: auto !important;
          transform: none !important;
          width: 100% !important;
          max-width: 100% !important;
        }

        body.${this.PRINT_BODY_CLASS}.${this.PRINT_SAFARI_BODY_CLASS} .gv-dr-print-content {
          break-before: auto !important;
          page-break-before: auto !important;
        }
      }
    `,document.head.appendChild(t)}static async inlineImages(t){const e=Array.from(t.querySelectorAll("img"));if(e.length===0)return;const n=async i=>{const r=typeof AbortController<"u"?new AbortController:null,a=this.setTimeoutUnref(()=>{try{r?.abort()}catch{}},this.INLINE_FETCH_TIMEOUT_MS);try{const o={credentials:"include",mode:"cors"};r&&(o.signal=r.signal);const s=await fetch(i,o);if(!s.ok)return null;const c=await s.blob();return await new Promise((h,m)=>{try{const l=new FileReader;l.onerror=()=>m(new Error("readAsDataURL failed")),l.onload=()=>h(String(l.result||"")),l.readAsDataURL(c)}catch(l){m(l)}})}catch{return null}finally{clearTimeout(a)}};await Promise.all(e.map(async i=>{const r=i.getAttribute("src")||"";if(!/^(https?:\/\/|blob:)/i.test(r))return;const a=await n(r);if(a)try{i.src=a}catch{}})),await Promise.all(e.map(async i=>{const r=i.decode;if(typeof r=="function")try{await Promise.race([r.call(i).catch(()=>{}),this.delay(this.INLINE_DECODE_TIMEOUT_MS)])}catch{}}))}static escapeHTML(t){const e=document.createElement("div");return e.textContent=t,e.innerHTML}static escapeAttribute(t){return this.escapeHTML(t).replace(/"/g,"&quot;")}}const U="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==",z="-100000px",H="img, video, iframe, canvas, svg image",G=720;function j(p){if(p instanceof Event)return!0;if(!(p instanceof Error))return!1;const t=p.message.toLowerCase();return t.includes("image")||t.includes("fetch")||t.includes("decode")||t.includes("resource")||t.includes("taint")||t.includes("canvas")}async function P(p){const t=await M(p,{cacheBust:!0,pixelRatio:1.2,backgroundColor:"#ffffff",skipFonts:!0,imagePlaceholder:U,onImageErrorHandler:()=>{}});if(!t){const e=p.getBoundingClientRect(),n=Math.round(e.width),i=Math.round(e.height);throw new Error(`Image render failed (${n}x${i})`)}return t}function q(p,t){const e=p.cloneNode(!0);return e.querySelectorAll(t).forEach(n=>n.remove()),e}function W(p){let t=p,e=0;for(;t&&e<12;){const i=Math.round(t.getBoundingClientRect().width);if(Number.isFinite(i)&&i>24)return i;t=t.parentElement,e+=1}const n=Math.round(globalThis.innerWidth||0);if(n>24){const i=Math.round(n*.8);return Math.max(360,Math.min(i,1200))}return G}async function J(p,t){const e=document.createElement("div");e.style.position="fixed",e.style.left=z,e.style.top="0",e.style.opacity="0",e.style.pointerEvents="none";const n=document.createElement("div");n.style.display="block",n.style.width=`${W(p)}px`,n.style.background="#ffffff";const i=q(p,t);n.appendChild(i),e.appendChild(n),document.body.appendChild(e);try{return await P(n)}finally{e.remove()}}async function V(p){await new Promise(t=>setTimeout(t,p))}async function X(p,t={}){const e=Math.max(1,t.maxAttempts??1),n=Math.max(0,t.retryDelayMs??0),i=t.shouldRetry??(()=>!1);let r;for(let o=1;o<=e;o++)try{return await P(p)}catch(s){if(r=s,!(o<e&&i(s)))break;n>0&&await V(n*o)}if(!t.enableSanitizedFallback||!(t.shouldFallback??j)(r))throw r;return await J(p,t.sanitizeSelector??H)}class D{static PRIMARY_RENDER_MAX_ATTEMPTS=3;static PRIMARY_RENDER_RETRY_DELAY_MS=260;static async export(t,e,n){const i=n.filename.toLowerCase().endsWith(".png")?n.filename:`${n.filename}.png`,r=await this.renderConversationBlob(t,e,n);this.downloadBlob(r,i)}static async exportDocument(t,e){const n=e.filename.toLowerCase().endsWith(".png")?e.filename:`${e.filename}.png`,i=await this.renderDocumentBlob(t);this.downloadBlob(i,n)}static async renderConversationBlob(t,e,n){const i=this.createRenderContainer(t,e,n.fontSize);return await this.renderContainerToBlob(i)}static async renderDocumentBlob(t){const e=this.createDocumentRenderContainer(t);return await this.renderContainerToBlob(e)}static createRenderContainer(t,e,n){const i=document.createElement("div");i.className="gv-image-export-container",Object.assign(i.style,{position:"fixed",left:"-10000px",top:"0",width:"620px",background:"#ffffff",color:"#111827",zIndex:"-1",pointerEvents:"none"});const r=e.title||"Conversation",a=this.formatDate(e.exportedAt),o=`
      <header class="gv-image-export-header">
        <h1 class="gv-image-export-title">${this.escapeHTML(r)}</h1>
        <div class="gv-image-export-meta">
          <div>${this.escapeHTML(a)}</div>
          <div><a href="${this.escapeAttr(e.url)}">${this.escapeHTML(e.url)}</a></div>
          <div>${e.count} conversation turns</div>
        </div>
      </header>
    `,s=t.map((f,v)=>{const I=v+1,C=f.starred?" ⭐":"",N=f.userElement?T.extractUserContent(f.userElement).html:this.formatPlainTextAsHtml(f.user),S=f.assistantElement?T.extractAssistantContent(f.assistantElement).html:this.formatPlainTextAsHtml(f.assistant);if(!f.omitEmptySections)return`
          <article class="gv-image-export-turn">
            <div class="gv-image-export-turn-header">Turn ${I}${C}</div>
            <section class="gv-image-export-block">
              <div class="gv-image-export-label">User</div>
              <div class="gv-image-export-content">${N||"<em>No content</em>"}</div>
            </section>
            <section class="gv-image-export-block">
              <div class="gv-image-export-label">Assistant</div>
              <div class="gv-image-export-content">${S||"<em>No content</em>"}</div>
            </section>
          </article>
        `;const k=!!f.userElement||!!f.user.trim(),B=!!f.assistantElement||!!f.assistant.trim();return`
          <article class="gv-image-export-turn">
            <div class="gv-image-export-turn-header">Turn ${I}${C}</div>
            ${k?`
            <section class="gv-image-export-block">
              <div class="gv-image-export-label">User</div>
              <div class="gv-image-export-content">${N||"<em>No content</em>"}</div>
            </section>
            `:""}
            ${B?`
            <section class="gv-image-export-block">
              <div class="gv-image-export-label">Assistant</div>
              <div class="gv-image-export-content">${S||"<em>No content</em>"}</div>
            </section>
            `:""}
          </article>
        `}).join(`
`),c=`
      <footer class="gv-image-export-footer">
        <div>Exported from Gemini Voyager</div>
        <div>Generated on ${this.escapeHTML(a)}</div>
      </footer>
    `,d=n??20,h=Math.round(d*2.5),m=Math.max(d-2,10),l=Math.round(d*1.2),b=Math.max(d-2,10),g=Math.max(d-4,10),u=document.createElement("style");u.textContent=`
      .gv-image-export-doc {
        font-family: Georgia, 'Times New Roman', serif;
        font-size: ${d}px;
        line-height: 1.9;
        padding: 26px;
      }

      .gv-image-export-header {
        margin-bottom: 18px;
        padding-bottom: 14px;
        border-bottom: 1px solid rgba(0,0,0,0.12);
      }

      .gv-image-export-title {
        margin: 0;
        font-size: ${h}px;
        line-height: 1.2;
        color: #111827;
        word-break: break-word;
      }

      .gv-image-export-meta {
        margin-top: 10px;
        color: #6b7280;
        font-size: ${m}px;
        display: grid;
        gap: 8px;
      }

      .gv-image-export-turn {
        margin: 24px 0;
        padding: 20px 0;
        border-bottom: 1px solid rgba(0,0,0,0.08);
      }

      .gv-image-export-turn-header {
        font-weight: 700;
        font-size: ${l}px;
        color: #374151;
        margin-bottom: 14px;
      }

      .gv-image-export-block {
        margin: 16px 0;
      }

      .gv-image-export-label {
        font-weight: 700;
        font-size: ${d}px;
        margin-bottom: 10px;
        color: #111827;
      }

      .gv-image-export-content {
        font-size: ${d}px;
        padding-left: 16px;
        border-left: 3px solid rgba(0,0,0,0.10);
      }

      .gv-image-export-content img {
        max-width: 100%;
        height: auto;
        display: block;
        margin: 12px 0;
      }

      .gv-image-export-content pre {
        background: rgba(0,0,0,0.05);
        padding: 14px 16px;
        border-radius: 8px;
        overflow-x: auto;
        white-space: pre-wrap;
        word-break: break-word;
        font-size: ${b}px;
        line-height: 1.8;
      }

      .gv-image-export-footer {
        margin-top: 24px;
        padding-top: 14px;
        border-top: 1px solid rgba(0,0,0,0.12);
        color: #6b7280;
        font-size: ${g}px;
        display: grid;
        gap: 8px;
      }
    `;const x=document.createElement("div");return x.className="gv-image-export-doc",x.innerHTML=`${o}${s}${c}`,i.appendChild(u),i.appendChild(x),i}static createDocumentRenderContainer(t){const e=document.createElement("div");e.className="gv-image-export-container",Object.assign(e.style,{position:"fixed",left:"-10000px",top:"0",width:"620px",background:"#ffffff",color:"#111827",zIndex:"-1",pointerEvents:"none"});const n=this.formatDate(t.exportedAt),i=t.html.trim()||this.formatPlainTextAsHtml(t.markdown),r=`
      <header class="gv-image-export-header">
        <h1 class="gv-image-export-title">${this.escapeHTML(t.title||"Deep Research Report")}</h1>
        <div class="gv-image-export-meta">
          <div>${this.escapeHTML(n)}</div>
          <div><a href="${this.escapeAttr(t.url)}">${this.escapeHTML(t.url)}</a></div>
        </div>
      </header>
    `,a=`
      <footer class="gv-image-export-footer">
        <div>Exported from Gemini Voyager</div>
        <div>Generated on ${this.escapeHTML(n)}</div>
      </footer>
    `,o=document.createElement("style");o.textContent=`
      .gv-image-export-doc {
        font-family: Georgia, 'Times New Roman', serif;
        font-size: 20px;
        line-height: 1.9;
        padding: 26px;
      }

      .gv-image-export-header {
        margin-bottom: 18px;
        padding-bottom: 14px;
        border-bottom: 1px solid rgba(0,0,0,0.12);
      }

      .gv-image-export-title {
        margin: 0;
        font-size: 50px;
        line-height: 1.2;
        color: #111827;
        word-break: break-word;
      }

      .gv-image-export-meta {
        margin-top: 10px;
        color: #6b7280;
        font-size: 18px;
        display: grid;
        gap: 8px;
      }

      .gv-image-export-report-content {
        margin: 18px 0 24px;
        color: #1a1a1a;
        font-size: 20px;
      }

      .gv-image-export-report-content p {
        margin: 12px 0;
      }

      .gv-image-export-report-content img {
        max-width: 100%;
        height: auto;
        display: block;
        margin: 12px 0;
      }

      .gv-image-export-report-content pre {
        background: rgba(0,0,0,0.05);
        padding: 14px 16px;
        border-radius: 8px;
        overflow-x: auto;
        white-space: pre-wrap;
        word-break: break-word;
        font-size: 18px;
        line-height: 1.8;
      }

      .gv-image-export-footer {
        margin-top: 24px;
        padding-top: 14px;
        border-top: 1px solid rgba(0,0,0,0.12);
        color: #6b7280;
        font-size: 16px;
        display: grid;
        gap: 8px;
      }
    `;const s=document.createElement("div");return s.className="gv-image-export-doc",s.innerHTML=`${r}<main class="gv-image-export-report-content">${i}</main>${a}`,e.appendChild(o),e.appendChild(s),e}static async inlineImages(t){const e=Array.from(t.querySelectorAll("img"));if(e.length===0)return;const n=async r=>{try{return await new Promise((a,o)=>{const s=new FileReader;s.onerror=()=>o(new Error("readAsDataURL failed")),s.onload=()=>a(String(s.result||"")),s.readAsDataURL(r)})}catch{return null}},i=async r=>{if(!/^https?:\/\//i.test(r))return null;try{const a=await fetch(r,{credentials:"include",mode:"cors"});if(a.ok){const o=await a.blob(),s=await n(o);if(s)return s}}catch{}try{const a=await new Promise(o=>{try{chrome.runtime?.sendMessage?.({type:"gv.fetchImage",url:r},s=>{if(s&&s.ok&&s.base64){const c=String(s.contentType||"application/octet-stream");o(`data:${c};base64,${s.base64}`)}else o(null)})}catch{o(null)}});if(a)return a}catch{}return null};await Promise.all(e.map(async r=>{let a=r.getAttribute("src")||"";if(/^https?:\/\//i.test(a)&&(a.includes("googleusercontent.com")||a.includes("ggpht.com"))){const s=/=[swh]\d+[^?#]*/;a=s.test(a)?a.replace(s,"=s0"):a+"=s0"}const o=await i(a);if(o)try{r.src=o}catch{}})),await Promise.all(e.map(r=>r.decode?.().catch(()=>{})))}static async renderWithSafariFallback(t){const e=t.querySelector(".gv-image-export-doc")||t,n=_()?1:this.PRIMARY_RENDER_MAX_ATTEMPTS;return await X(e,{maxAttempts:n,retryDelayMs:this.PRIMARY_RENDER_RETRY_DELAY_MS,shouldRetry:i=>this.shouldRetryPrimaryRender(i),enableSanitizedFallback:_(),sanitizeSelector:"img",shouldFallback:()=>!0})}static async renderContainerToBlob(t){document.body.appendChild(t);try{return await this.inlineImages(t),await this.renderWithSafariFallback(t)}finally{try{t.remove()}catch{}}}static shouldRetryPrimaryRender(t){if(O(t))return!0;if(t instanceof Error){const e=t.message.toLowerCase();return e.includes("image")||e.includes("decode")||e.includes("network")}return!1}static downloadBlob(t,e){const n=URL.createObjectURL(t),i=document.createElement("a");i.href=n,i.download=e,document.body.appendChild(i),i.click(),setTimeout(()=>{try{document.body.removeChild(i)}catch{}URL.revokeObjectURL(n)},0)}static escapeHTML(t){const e=document.createElement("div");return e.textContent=t,e.innerHTML}static escapeAttr(t){return String(t).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;")}static formatPlainTextAsHtml(t){const e=this.escapeHTML(t||"");return e.trim()?e.split(/\n\n+/).map(i=>i.replace(/\n/g,"<br>")).map(i=>`<p>${i}</p>`).join(""):"<em>No content</em>"}static formatDate(t){try{return new Date(t).toLocaleString("en-US",{year:"numeric",month:"long",day:"numeric",hour:"2-digit",minute:"2-digit"})}catch{return t}}}class y{static async fetchAsDataURL(t){try{const e=await fetch(t,{credentials:"include",mode:"cors"});if(!e.ok||!e.body)return null;const n=await e.blob();return await new Promise((i,r)=>{try{const a=new FileReader;a.onerror=()=>r(new Error("readAsDataURL failed")),a.onload=()=>i(String(a.result||"")),a.readAsDataURL(n)}catch(a){r(a)}})}catch{return null}}static extractImageUrls(t){const e=/!\[[^\]]*\]\(((?:https?:\/\/|blob:)[^\s)]+)\)/g,n=new Set;let i;for(;(i=e.exec(t))!==null;)n.add(i[1]);return Array.from(n)}static rewriteImageUrls(t,e){const n=/!\[([^\]]*)\]\(((?:https?:\/\/|blob:)[^\s)]+)\)/g;return t.replace(n,(i,r,a)=>{const o=e.get(a);return o?`![${r}](${o})`:i})}static degradeImageMarkdownForSafari(t){const e=/!\[([^\]]*)\]\(((?:https?:\/\/|blob:)[^\s)]+)\)/g;return t.replace(e,(n,i)=>`[Image unavailable in Safari export: ${String(i||"").trim()||"image"}]`)}static format(t,e){const n=[];return n.push(this.formatHeader(e)),n.push(""),n.push("---"),n.push(""),t.forEach((i,r)=>{n.push(this.formatTurn(i,r+1)),n.push("")}),n.push("---"),n.push(""),n.push(this.formatFooter(e)),n.join(`
`)}static formatHeader(t){const e=[],n=t.title||this.extractTitleFromURL(t.url);return e.push(`# ${this.escapeMarkdown(n)}`),e.push(""),e.push(`**Date**: ${this.formatDate(t.exportedAt)}`),e.push(`**Turns**: ${t.count}`),e.push(`**Source**: [Gemini Chat](${t.url})`),e.join(`
`)}static formatTurn(t,e){const n=[];if(n.push(`## Turn ${e}${t.starred?" ⭐":""}`),n.push(""),!t.omitEmptySections){if(n.push("### 👤 User"),n.push(""),t.userElement){const c=T.extractUserContent(t.userElement);c.hasImages&&(n.push("*[This turn includes uploaded images]*"),n.push("")),n.push(c.text||"_No content_")}else n.push(this.formatContent(t.user)||"_No content_");if(n.push(""),n.push("### 🤖 Assistant"),n.push(""),t.assistantElement){const c=T.extractAssistantContent(t.assistantElement),d=this.formatContent(t.assistant);n.push(c.text||d||"_No content_")}else n.push(this.formatContent(t.assistant)||"_No content_");return n.join(`
`)}let i=!1;const r=this.formatContent(t.user);if(!!t.userElement||!!r){if(n.push("### 👤 User"),n.push(""),t.userElement){const c=T.extractUserContent(t.userElement);c.hasImages&&(n.push("*[This turn includes uploaded images]*"),n.push("")),n.push(c.text||r||"_No content_")}else n.push(r||"_No content_");n.push(""),i=!0}const o=this.formatContent(t.assistant);if(!!t.assistantElement||!!o){if(n.push("### 🤖 Assistant"),n.push(""),t.assistantElement){const c=T.extractAssistantContent(t.assistantElement);n.push(c.text||o||"_No content_")}else n.push(o||"_No content_");i=!0}return i||n.push("_No content_"),n.join(`
`)}static formatContent(t){return t?t.trim():""}static formatFooter(t){return["*Exported from [Gemini Voyager](https://github.com/Nagi-ovo/gemini-voyager)*",`*Generated on ${this.formatDate(t.exportedAt)}*`].join(`  
`)}static extractTitleFromURL(t){try{const i=new URL(t).pathname.match(/\/(app|chat)\/([^/]+)/);return i?`Gemini Conversation ${i[2].substring(0,8)}`:"Gemini Conversation"}catch{return"Gemini Conversation"}}static formatDate(t){try{return new Date(t).toLocaleString("en-US",{year:"numeric",month:"long",day:"numeric",hour:"2-digit",minute:"2-digit"})}catch{return t}}static escapeMarkdown(t){return t.replace(/([\\`*_{}[\]()#+\-.!])/g,"\\$1")}static generateFilename(){const t=c=>String(c).padStart(2,"0"),e=new Date,n=e.getFullYear(),i=t(e.getMonth()+1),r=t(e.getDate()),a=t(e.getHours()),o=t(e.getMinutes()),s=t(e.getSeconds());return`gemini-chat-${n}${i}${r}-${a}${o}${s}.md`}static download(t,e){const n=new Blob([t],{type:"text/markdown;charset=utf-8"}),i=URL.createObjectURL(n),r=document.createElement("a");r.href=i,r.download=e||this.generateFilename(),document.body.appendChild(r),r.click(),setTimeout(()=>{try{document.body.removeChild(r)}catch{}URL.revokeObjectURL(i)},0)}}class Z{static PRINT_STYLES_ID="gv-pdf-print-styles";static PRINT_CONTAINER_ID="gv-pdf-print-container";static PRINT_BODY_CLASS="gv-pdf-printing";static CLEANUP_FALLBACK_DELAY_MS=6e4;static INLINE_FETCH_TIMEOUT_MS=2e3;static INLINE_DECODE_TIMEOUT_MS=1e3;static cleanupFallbackTimer=null;static originalDocumentTitle=null;static async export(t,e,n){await this.exportInternal(t,e,!1,n?.fontSize)}static async exportDocument(t){const e={url:t.url,exportedAt:t.exportedAt,count:1,title:t.title},n=document.createElement("div");n.innerHTML=t.html.trim();const a=[{user:"",assistant:this.extractPlainTextFromHtml(t.html)||t.markdown.trim()||"No content",starred:!1,omitEmptySections:!0,assistantElement:n}];await this.exportInternal(a,e,!0)}static async exportInternal(t,e,n,i){this.cleanup();const r=this.createPrintContainer(t,e,n);document.body.appendChild(r);const a=document.getElementById(this.PRINT_STYLES_ID);a&&a.remove(),this.injectPrintStyles(i),document.body.classList.add(this.PRINT_BODY_CLASS),this.originalDocumentTitle=document.title;const o=this.getPrintDialogTitle(e,n);o&&(document.title=o);const s=_(),c=this.inlineImages(r).catch(()=>{});if(s){this.forceStyleFlush(r),this.triggerPrint(),this.registerCleanupHandlers();return}await c,await this.delay(100),this.triggerPrint(),this.registerCleanupHandlers()}static triggerPrint(){try{window.print()}catch{}}static forceStyleFlush(t){try{t.getBoundingClientRect()}catch{}}static delay(t){return new Promise(e=>{this.setTimeoutUnref(e,t)})}static registerCleanupHandlers(){const t=()=>{this.cleanup()};try{window.addEventListener("afterprint",t,{once:!0})}catch{}this.cleanupFallbackTimer!==null&&clearTimeout(this.cleanupFallbackTimer),this.cleanupFallbackTimer=this.setTimeoutUnref(()=>{this.cleanup()},this.CLEANUP_FALLBACK_DELAY_MS)}static setTimeoutUnref(t,e){const n=setTimeout(t,e);return typeof n=="object"&&n!==null&&"unref"in n&&typeof n.unref=="function"&&n.unref(),n}static createPrintContainer(t,e,n){const i=document.createElement("div");return i.id=this.PRINT_CONTAINER_ID,i.className="gv-print-only",i.innerHTML=`
      <div class="gv-print-document">
        ${this.renderHeader(e,n)}
        ${this.renderContent(t)}
        ${this.renderFooter(e)}
      </div>
    `,i}static extractPlainTextFromHtml(t){const e=t.trim();if(!e)return"";const n=document.createElement("div");return n.innerHTML=e,n.querySelectorAll("script, style, template").forEach(i=>i.remove()),this.normalizeWhitespace(n.textContent||"")}static normalizeWhitespace(t){return t.replace(/\r/g,"").replace(/[ \t]+\n/g,`
`).replace(/\n{3,}/g,`

`).trim()}static async inlineImages(t){const e=Array.from(t.querySelectorAll("img"));if(e.length===0)return;const n=async i=>{const r=typeof AbortController<"u"?new AbortController:null,a=this.setTimeoutUnref(()=>{try{r?.abort()}catch{}},this.INLINE_FETCH_TIMEOUT_MS);try{const o={credentials:"include",mode:"cors"};r&&(o.signal=r.signal);const s=await fetch(i,o);if(!s.ok)return null;const c=await s.blob();return await new Promise((h,m)=>{try{const l=new FileReader;l.onerror=()=>m(new Error("readAsDataURL failed")),l.onload=()=>h(String(l.result||"")),l.readAsDataURL(c)}catch(l){m(l)}})}catch{return null}finally{clearTimeout(a)}};await Promise.all(e.map(async i=>{let r=i.getAttribute("src")||"";if(!/^(https?:\/\/|blob:)/i.test(r))return;if((r.includes("googleusercontent.com")||r.includes("ggpht.com"))&&!r.startsWith("blob:")){const o=/=[swh]\d+[^?#]*/;r=o.test(r)?r.replace(o,"=s0"):r+"=s0"}const a=await n(r);if(a)try{i.src=a}catch{}})),await Promise.all(e.map(async i=>{const r=i.decode;if(typeof r=="function")try{await Promise.race([r.call(i).catch(()=>{}),this.delay(this.INLINE_DECODE_TIMEOUT_MS)])}catch{}}))}static getConversationTitle(){try{const n=document.querySelector(".gv-folder-conversation.gv-folder-conversation-selected .gv-conversation-title")||document.querySelector(".gv-folder-conversation-selected .gv-conversation-title");if(n?.textContent?.trim())return n.textContent.trim()}catch(n){console.debug("[PDF Export] Failed to get title from Folder Manager:",n)}try{const n=this.extractConversationIdFromURL(window.location.href);if(n){const i=this.extractTitleFromNativeSidebarByConversationId(n);if(i)return i}}catch(n){console.debug("[PDF Export] Failed to get title from native sidebar by id:",n)}const t=document.querySelector("title");if(t){const n=t.textContent?.trim();if(this.isMeaningfulConversationTitle(n))return n}try{const n=["mat-list-item.mdc-list-item--activated [mat-line]",'mat-list-item[aria-current="page"] [mat-line]',".conversation-list-item.active .conversation-title",".active-conversation .title"];for(const i of n){const a=document.querySelector(i)?.textContent?.trim();if(this.isMeaningfulConversationTitle(a))return a}}catch(n){console.debug("[PDF Export] Failed to get title from sidebar:",n)}const e=this.extractConversationIdFromURL(window.location.href);return e?`Conversation ${e.slice(0,8)}`:"Untitled Conversation"}static isMeaningfulConversationTitle(t){const e=(t||"").trim();return!(!e||e==="Untitled Conversation"||e==="Gemini"||e==="Google Gemini"||e==="Google AI Studio"||e==="New chat"||e.startsWith("Gemini -")||e.startsWith("Google AI Studio -"))}static isGemLabel(t){const e=(t||"").trim().toLowerCase();return e==="gem"||e==="gems"}static extractConversationIdFromURL(t){try{const e=new URL(t),n=e.pathname.match(/\/app\/([^/?#]+)/);if(n?.[1])return n[1];const i=e.pathname.match(/\/gem\/[^/]+\/([^/?#]+)/);if(i?.[1])return i[1]}catch{}return null}static extractTitleFromLinkText(t){if(!t)return null;const e=(t.innerText||"").trim();if(!e)return null;const n=e.split(`
`).map(i=>i.trim()).filter(Boolean).filter(i=>!this.isGemLabel(i)).filter(i=>i.length>=2);return n.length===0?null:n.reduce((i,r)=>r.length>i.length?r:i,n[0])||null}static extractTitleFromConversationElement(t){const e=t.closest('[data-test-id="conversation"]')||t,i=e.querySelector('.gds-label-l, .conversation-title-text, [data-test-id="conversation-title"], h3')?.textContent?.trim();if(this.isMeaningfulConversationTitle(i)&&!this.isGemLabel(i))return i;const r=e.querySelector('a[href*="/app/"], a[href*="/gem/"]'),a=r?.getAttribute("aria-label")?.trim();if(this.isMeaningfulConversationTitle(a)&&!this.isGemLabel(a))return a;const o=r?.getAttribute("title")?.trim();if(this.isMeaningfulConversationTitle(o)&&!this.isGemLabel(o))return o;const s=this.extractTitleFromLinkText(r);if(this.isMeaningfulConversationTitle(s))return s;const d=e.querySelector(".gds-body-m, .gds-label-m, .subtitle")?.textContent?.trim();if(this.isMeaningfulConversationTitle(d)&&!this.isGemLabel(d))return d;const h=e.textContent?.trim()||"";if(!h)return null;const m=h.split(`
`).map(l=>l.trim()).filter(Boolean)[0]||h;return this.isMeaningfulConversationTitle(m)&&!this.isGemLabel(m)?m.slice(0,80):null}static extractTitleFromNativeSidebarByConversationId(t){const e=this.escapeCssAttributeValue(t),n=document.querySelector(`[data-test-id="conversation"][jslog*="c_${e}"]`);if(n){const r=this.extractTitleFromConversationElement(n);if(r)return r}const i=document.querySelector(`[data-test-id="conversation"] a[href*="${e}"]`);if(i){const r=this.extractTitleFromConversationElement(i);if(r)return r}return null}static renderHeader(t,e){const n=this.normalizeConversationTitle(t.title),i=this.normalizeConversationTitle(this.getConversationTitle()),r=e?n||i||"Untitled Conversation":i||n||"Untitled Conversation",a=this.extractTitleFromURL(t.url),o=this.formatDate(t.exportedAt),s=t.count;return`
      <div class="gv-print-header gv-print-cover-page">
        <div class="gv-print-cover-content">
          <h1 class="gv-print-cover-title">${this.escapeHTML(r)}</h1>
          <div class="gv-print-meta">
            <p>${o}</p>
            <p><a href="${this.escapeAttribute(t.url)}">${this.escapeHTML(a)}</a></p>
            <p>${s} conversation turns</p>
          </div>
        </div>
      </div>
    `}static renderContent(t){return`
      <div class="gv-print-content">
        ${t.map((e,n)=>this.renderTurn(e,n+1)).join(`
`)}
      </div>
    `}static renderTurn(t,e){const n=t.starred?"gv-print-turn-starred":"",i=t.userElement?T.extractUserContent(t.userElement).html||"<em>No content</em>":this.formatContent(t.user)||"<em>No content</em>",r=t.assistantElement?T.extractAssistantContent(t.assistantElement).html||"<em>No content</em>":this.formatContent(t.assistant)||"<em>No content</em>";if(!t.omitEmptySections)return`
      <div class="gv-print-turn ${n}">
        <div class="gv-print-turn-header">
          <span class="gv-print-turn-number">Turn ${e}</span>
          ${t.starred?'<span class="gv-print-star">⭐</span>':""}
        </div>

        <div class="gv-print-turn-user">
          <div class="gv-print-turn-label">👤 User</div>
          <div class="gv-print-turn-text">${i}</div>
        </div>

        <div class="gv-print-turn-assistant">
          <div class="gv-print-turn-label">🤖 Assistant</div>
          <div class="gv-print-turn-text">${r}</div>
        </div>
      </div>
    `;const a=!!t.userElement||!!t.user.trim(),o=!!t.assistantElement||!!t.assistant.trim();return`
      <div class="gv-print-turn ${n}">
        <div class="gv-print-turn-header">
          <span class="gv-print-turn-number">Turn ${e}</span>
          ${t.starred?'<span class="gv-print-star">⭐</span>':""}
        </div>

        ${a?`
        <div class="gv-print-turn-user">
          <div class="gv-print-turn-label">👤 User</div>
          <div class="gv-print-turn-text">${i}</div>
        </div>
        `:""}

        ${o?`
          <div class="gv-print-turn-assistant">
            <div class="gv-print-turn-label">🤖 Assistant</div>
            <div class="gv-print-turn-text">${r}</div>
          </div>
        `:""}
      </div>
    `}static formatContent(t){if(!t)return"<em>No content</em>";let e=this.escapeHTML(t);return e=e.split(`

`).map(n=>`<p>${n.replace(/\n/g,"<br>")}</p>`).join(""),e}static renderFooter(t){return`
      <div class="gv-print-footer">
        <p>Exported from <a href="https://github.com/Nagi-ovo/gemini-voyager">Gemini Voyager</a> • ${t.count} conversation turns</p>
        <p>Generated on ${this.formatDate(t.exportedAt)}</p>
      </div>
    `}static injectPrintStyles(t){if(document.getElementById(this.PRINT_STYLES_ID))return;const e=t??11,n=Math.max(e-2,6),i=Math.max(e-2,6),r=document.createElement("style");r.id=this.PRINT_STYLES_ID,r.textContent=`
      /* Hide print container on screen */
      .gv-print-only {
        display: none;
      }

      /* Show print container when printing */
      @media print {
        /* Hide everything except print container */
        body.${this.PRINT_BODY_CLASS} > *:not(#${this.PRINT_CONTAINER_ID}) {
          display: none !important;
          visibility: hidden !important;
        }

        body.${this.PRINT_BODY_CLASS} #${this.PRINT_CONTAINER_ID} {
          display: block !important;
          visibility: visible !important;
        }

        body.${this.PRINT_BODY_CLASS} #${this.PRINT_CONTAINER_ID},
        body.${this.PRINT_BODY_CLASS} #${this.PRINT_CONTAINER_ID} * {
          visibility: visible !important;
        }

        /* Force white print canvas to avoid dark-theme background leaks on trailing pages */
        html,
        body {
          background: #fff !important;
        }

        body.${this.PRINT_BODY_CLASS} {
          background: #fff !important;
        }

        /* Gemini immersive-mode print CSS may force descendants to display:none */
        body.${this.PRINT_BODY_CLASS} #${this.PRINT_CONTAINER_ID} * {
          display: revert !important;
        }

        /* Preserve KaTeX layout primitives after the global display override above.
           Without these, sub/sup scripts (e.g. x_1) may become misaligned in PDF print. */
        body.${this.PRINT_BODY_CLASS} #${this.PRINT_CONTAINER_ID} .katex-display,
        body.${this.PRINT_BODY_CLASS} #${this.PRINT_CONTAINER_ID} .katex-display > .katex,
        body.${this.PRINT_BODY_CLASS} #${this.PRINT_CONTAINER_ID} .katex-display > .katex > .katex-html {
          display: block !important;
        }

        body.${this.PRINT_BODY_CLASS} #${this.PRINT_CONTAINER_ID} .katex .base,
        body.${this.PRINT_BODY_CLASS} #${this.PRINT_CONTAINER_ID} .katex .strut,
        body.${this.PRINT_BODY_CLASS} #${this.PRINT_CONTAINER_ID} .katex .vlist > span > span,
        body.${this.PRINT_BODY_CLASS} #${this.PRINT_CONTAINER_ID} .katex .mspace,
        body.${this.PRINT_BODY_CLASS} #${this.PRINT_CONTAINER_ID} .katex .mfrac .frac-line,
        body.${this.PRINT_BODY_CLASS} #${this.PRINT_CONTAINER_ID} .katex .rule,
        body.${this.PRINT_BODY_CLASS} #${this.PRINT_CONTAINER_ID} .katex .hline,
        body.${this.PRINT_BODY_CLASS} #${this.PRINT_CONTAINER_ID} .katex .hdashline,
        body.${this.PRINT_BODY_CLASS} #${this.PRINT_CONTAINER_ID} .katex .overline .overline-line,
        body.${this.PRINT_BODY_CLASS} #${this.PRINT_CONTAINER_ID} .katex .underline .underline-line,
        body.${this.PRINT_BODY_CLASS} #${this.PRINT_CONTAINER_ID} .katex .nulldelimiter,
        body.${this.PRINT_BODY_CLASS} #${this.PRINT_CONTAINER_ID} .katex .clap > .fix,
        body.${this.PRINT_BODY_CLASS} #${this.PRINT_CONTAINER_ID} .katex .llap > .fix,
        body.${this.PRINT_BODY_CLASS} #${this.PRINT_CONTAINER_ID} .katex .rlap > .fix,
        body.${this.PRINT_BODY_CLASS} #${this.PRINT_CONTAINER_ID} .katex .mtable .vertical-separator,
        body.${this.PRINT_BODY_CLASS} #${this.PRINT_CONTAINER_ID} .katex .mtable .arraycolsep,
        body.${this.PRINT_BODY_CLASS} #${this.PRINT_CONTAINER_ID} .katex .cd-vert-arrow,
        body.${this.PRINT_BODY_CLASS} #${this.PRINT_CONTAINER_ID} .katex .cd-label-left,
        body.${this.PRINT_BODY_CLASS} #${this.PRINT_CONTAINER_ID} .katex .cd-label-right {
          display: inline-block !important;
        }

        body.${this.PRINT_BODY_CLASS} #${this.PRINT_CONTAINER_ID} .katex .vlist-t {
          display: inline-table !important;
        }

        body.${this.PRINT_BODY_CLASS} #${this.PRINT_CONTAINER_ID} .katex .vlist-r {
          display: table-row !important;
        }

        body.${this.PRINT_BODY_CLASS} #${this.PRINT_CONTAINER_ID} .katex .vlist,
        body.${this.PRINT_BODY_CLASS} #${this.PRINT_CONTAINER_ID} .katex .vlist-s {
          display: table-cell !important;
        }

        body.${this.PRINT_BODY_CLASS} #${this.PRINT_CONTAINER_ID} .katex .vlist > span,
        body.${this.PRINT_BODY_CLASS} #${this.PRINT_CONTAINER_ID} .katex .katex-html > .newline,
        body.${this.PRINT_BODY_CLASS} #${this.PRINT_CONTAINER_ID} .katex .overlay,
        body.${this.PRINT_BODY_CLASS} #${this.PRINT_CONTAINER_ID} .katex svg,
        body.${this.PRINT_BODY_CLASS} #${this.PRINT_CONTAINER_ID} .katex .stretchy {
          display: block !important;
        }

        body.${this.PRINT_BODY_CLASS} #${this.PRINT_CONTAINER_ID} .katex .vbox,
        body.${this.PRINT_BODY_CLASS} #${this.PRINT_CONTAINER_ID} .katex .hbox,
        body.${this.PRINT_BODY_CLASS} #${this.PRINT_CONTAINER_ID} .katex .thinbox {
          display: inline-flex !important;
        }

        body.${this.PRINT_BODY_CLASS} #${this.PRINT_CONTAINER_ID} .gv-print-turn-text .katex {
          line-height: 1.2 !important;
        }

        /* Keep key layouts after the global descendant display override above */
        body.${this.PRINT_BODY_CLASS} #${this.PRINT_CONTAINER_ID} .gv-print-cover-page {
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
        }

        body.${this.PRINT_BODY_CLASS} #${this.PRINT_CONTAINER_ID} .gv-print-turn-header {
          display: flex !important;
        }

        body.${this.PRINT_BODY_CLASS} #${this.PRINT_CONTAINER_ID} .gv-print-turn-text img {
          display: block !important;
        }

        /* Reset page styles */
        @page {
          margin: 2cm;
          size: A4;
        }

        /* Document container */
        .gv-print-document {
          font-family: Georgia, 'Times New Roman', serif;
          font-size: ${e}pt;
          line-height: 1.6;
          color: #000;
          background: #fff;
          max-width: 100%;
        }

        /* Cover Page Header */
        .gv-print-cover-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          page-break-after: always;
          margin: 0;
          padding: 0;
          border: none;
        }

        .gv-print-cover-content {
          text-align: center;
          max-width: 80%;
        }

        .gv-print-cover-title {
          font-size: 36pt;
          font-weight: 800;
          letter-spacing: -0.02em;
          margin: 0 0 1.5em 0;
          color: oklch(0.7227 0.1920 149.5793);
          line-height: 1.2;
          word-wrap: break-word;
        }

        .gv-print-meta {
          font-size: 12pt;
          color: #666;
          line-height: 2;
          margin-top: 0.5em;
        }

        .gv-print-meta p {
          margin: 0.3em 0;
        }

        .gv-print-meta a {
          color: #666;
          text-decoration: none;
        }

        .gv-print-meta a:after {
          content: none !important;
        }

        /* Content */
        .gv-print-content {
          margin: 2em 0;
        }

        /* Turn */
        .gv-print-turn {
          margin-bottom: 2em;
          page-break-inside: avoid;
        }

        .gv-print-turn-header {
          display: flex;
          align-items: center;
          gap: 0.5em;
          margin-bottom: 0.5em;
          font-size: 12pt;
          font-weight: bold;
          color: #555;
        }

        .gv-print-turn-starred .gv-print-turn-header {
          color: #d97706;
        }

        .gv-print-star {
          font-size: 14pt;
        }

        /* Turn sections */
        .gv-print-turn-user,
        .gv-print-turn-assistant {
          margin: 1em 0;
        }

        .gv-print-turn-label {
          font-weight: 600;
          font-size: ${e}pt;
          margin-bottom: 0.5em;
          color: #222;
        }

        .gv-print-turn-text {
          padding-left: 1em;
          border-left: 3px solid #e5e7eb;
          color: #1a1a1a;
        }

        /* Constrain images to avoid oversized visuals */
        .gv-print-turn-text img {
          max-width: 60%;
          height: auto;
          display: block;
          margin: 0.5em 0;
          page-break-inside: avoid;
        }

        .gv-print-turn-assistant .gv-print-turn-text {
          border-left-color: #93c5fd;
        }

        .gv-print-turn-text p {
          margin: 0.5em 0;
        }

        .gv-print-turn-text em {
          color: #666;
        }

        /* Code blocks (if any) */
        .gv-print-turn-text code,
        .gv-print-turn-text pre {
          font-family: 'Courier New', monospace;
          font-size: ${n}pt;
          background: #f5f5f5;
          padding: 0.2em 0.4em;
          border-radius: 3px;
        }

        .gv-print-turn-text pre {
          padding: 0.75em;
          border-left: 3px solid #d1d5db;
          overflow-x: auto;
          white-space: pre-wrap;
          word-wrap: break-word;
        }

        /* Math formulas */
        .gv-print-turn-text .math-inline,
        .gv-print-turn-text .math-block,
        .gv-print-turn-text [data-math] {
          page-break-inside: avoid;
        }

        .gv-print-turn-text .math-block {
          display: block;
          margin: 1em 0;
          text-align: center;
          overflow-x: auto;
        }

        .gv-print-turn-text .math-inline {
          display: inline;
        }

        /* Footer */
        .gv-print-footer {
          margin-top: 2em;
          padding-top: 1em;
          border-top: 1px solid #ccc;
          font-size: ${i}pt;
          color: #666;
          text-align: center;
        }

        .gv-print-footer p {
          margin: 0.25em 0;
        }

        /* Links */
        a {
          color: #2563eb;
          text-decoration: none;
        }

        /* Hide Gemini inline source/citation chips (render as link icons) */
        sources-carousel-inline,
        source-inline-chips,
        source-inline-chip,
        .source-inline-chip-container {
          display: none !important;
        }

        a[href]:after {
          content: " (" attr(href) ")";
          font-size: ${i}pt;
          color: #666;
        }

        /* Utilities */
        strong {
          font-weight: 600;
        }
      }
    `,document.head.appendChild(r)}static cleanup(){if(this.cleanupFallbackTimer!==null){try{clearTimeout(this.cleanupFallbackTimer)}catch{}this.cleanupFallbackTimer=null}const t=document.getElementById(this.PRINT_CONTAINER_ID);t&&t.remove();try{document.body.classList.remove(this.PRINT_BODY_CLASS)}catch{}if(this.originalDocumentTitle!==null){try{document.title=this.originalDocumentTitle}catch{}this.originalDocumentTitle=null}try{window.dispatchEvent(new CustomEvent("gv-print-cleanup"))}catch{}}static extractTitleFromURL(t){try{const i=new URL(t).pathname.match(/\/(app|chat)\/([^/]+)/);return i?`Gemini Conversation ${i[2].substring(0,8)}`:"Gemini Conversation"}catch{return"Gemini Conversation"}}static formatDate(t){try{return new Date(t).toLocaleString("en-US",{year:"numeric",month:"long",day:"numeric",hour:"2-digit",minute:"2-digit"})}catch{return t}}static normalizeConversationTitle(t){if(!t)return"";const e=t.trim().replace(/\s+-\s+Gemini$/i,"").replace(/\s+-\s+Google Gemini$/i,"").replace(/\s+/g," ").trim();return this.isMeaningfulConversationTitle(e)?e:""}static getPrintDialogTitle(t,e){const n=this.normalizeConversationTitle(t.title),i=this.normalizeConversationTitle(this.getConversationTitle());if(e)return n||i||"Gemini Conversation";const r=i||n;return r?`${r} - Gemini`:"Gemini Conversation"}static escapeHTML(t){const e=document.createElement("div");return e.textContent=t,e.innerHTML}static escapeCssAttributeValue(t){const e=globalThis.CSS?.escape;return typeof e=="function"?e(t):t.replace(/\\/g,"\\\\").replace(/"/g,'\\"')}static escapeAttribute(t){return this.escapeHTML(t).replace(/"/g,"&quot;")}}class K{static REPORT_JSON_FORMAT="gemini-voyager.report.v1";static CHAT_JSON_FORMAT="gemini-voyager.chat.v1";static async export(t,e,n){try{if((n.layout??"conversation")==="document")return await this.exportDocument(t,e,n);switch(n.format){case"json":return this.exportJSON(t,e,n);case"markdown":return await this.exportMarkdown(t,e,n);case"pdf":return await this.exportPDF(t,e,n);case"image":return await this.exportImage(t,e,n);default:return{success:!1,format:n.format,error:`Unsupported format: ${n.format}`}}}catch(i){return{success:!1,format:n.format,error:this.normalizeError(i)}}}static normalizeError(t){return t instanceof Error?t.message:typeof Event<"u"&&t instanceof Event||O(t)?E:String(t)}static async exportDocument(t,e,n){const i=this.extractDocumentContent(t);switch(n.format){case"json":return this.exportDocumentJSON(i,e,n);case"markdown":return await this.exportDocumentMarkdown(i,e,n);case"pdf":return await this.exportDocumentPDF(i,e,n);case"image":return await this.exportDocumentImage(i,e,n);default:return{success:!1,format:n.format,error:`Unsupported format: ${n.format}`}}}static exportJSON(t,e,n){const i=t.map(o=>{let s=o.user,c=o.assistant;if(o.userElement){const d=T.extractUserContent(o.userElement);d.text&&(s=d.text)}if(o.assistantElement){const d=T.extractAssistantContent(o.assistantElement);d.text&&(c=d.text)}return{user:s,assistant:c,starred:o.starred}}),r={format:this.CHAT_JSON_FORMAT,url:e.url,exportedAt:e.exportedAt,count:e.count,title:e.title,items:i},a=n.filename||this.generateFilename("json",e.title);return this.downloadJSON(r,a),{success:!0,format:"json",filename:a}}static async exportMarkdown(t,e,n){let i=y.format(t,e);n.includeImageSource===!1&&(i=i.replace(/\n\*Source: \[[^\]]*\]\([^)]*\)\*\n/g,`
`));const r=n.filename||this.generateFilename("md",e.title);return{success:!0,format:"markdown",filename:await this.downloadMarkdownOrZip(i,r,"chat.md")}}static async exportPDF(t,e,n){return await Z.export(t,e,{fontSize:n.fontSize}),{success:!0,format:"pdf",filename:n.filename||this.generateFilename("pdf",e.title)}}static async exportImage(t,e,n){const i=n.filename||this.generateFilename("png",e.title);return await D.export(t,e,{filename:i,fontSize:n.fontSize}),{success:!0,format:"image",filename:i}}static exportDocumentJSON(t,e,n){const i={format:this.REPORT_JSON_FORMAT,url:e.url,exportedAt:e.exportedAt,title:e.title,content:{markdown:t.markdown,html:t.html}},r=n.filename||this.generateFilename("json",e.title);return this.downloadJSON(i,r),{success:!0,format:"json",filename:r}}static async exportDocumentMarkdown(t,e,n){const i=this.composeDocumentMarkdown(t.markdown,e),r=n.filename||this.generateFilename("md",e.title),a=r.toLowerCase().endsWith(".md")&&r.split("/").pop()||"report.md";return{success:!0,format:"markdown",filename:await this.downloadMarkdownOrZip(i,r,a)}}static async exportDocumentPDF(t,e,n){return await Y.export({title:e.title||"Deep Research Report",url:e.url,exportedAt:e.exportedAt,markdown:t.markdown,html:t.html}),{success:!0,format:"pdf",filename:n.filename||this.generateFilename("pdf",e.title)}}static async exportDocumentImage(t,e,n){const i=n.filename||this.generateFilename("png",e.title);return await D.exportDocument({title:e.title||"Deep Research Report",url:e.url,exportedAt:e.exportedAt,markdown:t.markdown,html:t.html},{filename:i}),{success:!0,format:"image",filename:i}}static extractDocumentContent(t){const e=t.find(i=>i.assistantElement||i.assistant.trim())||t.find(i=>i.userElement||i.user.trim());if(!e)return{markdown:"",html:""};if(e.assistantElement){const i=T.extractAssistantContent(e.assistantElement);return{markdown:i.text||e.assistant,html:i.html||this.formatPlainTextAsHtml(i.text||e.assistant)}}if(e.userElement){const i=T.extractUserContent(e.userElement);return{markdown:i.text||e.user,html:i.html||this.formatPlainTextAsHtml(i.text||e.user)}}const n=e.assistant||e.user||"";return{markdown:n,html:this.formatPlainTextAsHtml(n)}}static composeDocumentMarkdown(t,e){const n=[],i=e.title?.trim()||"Deep Research Report",r=t.trim()||"_No content_";return this.hasLeadingMarkdownHeading(r)||(n.push(`# ${i}`),n.push("")),n.push(r),n.push(""),n.push("---"),n.push(""),n.push(`Source: ${e.url}`),n.push(`Exported at: ${e.exportedAt}`),n.join(`
`)}static hasLeadingMarkdownHeading(t){return/^#{1,6}\s+\S/m.test(t)&&/^#{1,6}\s+\S/.test(t)}static formatPlainTextAsHtml(t){return t.trim()?t.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").split(`

`).map(n=>`<p>${n.replace(/\n/g,"<br>")}</p>`).join(`
`):""}static async downloadMarkdownOrZip(t,e,n){const i=e.toLowerCase().endsWith(".md")?e:`${e}.md`;if(_()){const u=y.degradeImageMarkdownForSafari(t);return y.download(u,i),i}const r=y.extractImageUrls(t);if(r.length===0)return y.download(t,i),i;const a=new F,o=a.folder("assets"),s=new Map,c=await Promise.all(r.map(async u=>{const x=this.toOriginalSizeUrl(u),f=await this.fetchImageForMarkdownPackaging(x);return f?{url:u,blob:f.blob,contentType:f.contentType}:null}));let d=1;for(const u of c){if(!u)continue;const x=this.pickImageExtension(u.contentType,u.url),f=`img-${String(d++).padStart(3,"0")}.${x}`,v=await this.blobToBase64Payload(u.blob);v&&(o?.file(f,v,{base64:!0}),s.set(u.url,`assets/${f}`))}const h=y.rewriteImageUrls(t,s);a.file(n,h);const m=await a.generateAsync({type:"blob"}),l=i.replace(/\.md$/i,".zip"),b=URL.createObjectURL(m),g=document.createElement("a");return g.href=b,g.download=l,document.body.appendChild(g),g.click(),setTimeout(()=>{try{document.body.removeChild(g)}catch{}URL.revokeObjectURL(b)},0),l}static toOriginalSizeUrl(t){if(!(t.includes("googleusercontent.com")||t.includes("ggpht.com")))return t;const n=/=[swh]\d+[^?#]*/;return n.test(t)?t.replace(n,"=s0"):t.includes("=")?t+"-s0":t+"=s0"}static pickImageExtension(t,e){const n={"image/png":"png","image/jpeg":"jpg","image/jpg":"jpg","image/webp":"webp","image/gif":"gif","image/svg+xml":"svg"};if(t&&n[t])return n[t];const i=e.split("?")[0].match(/\.(png|jpg|jpeg|gif|webp|svg)$/i);return i?i[1].toLowerCase()==="jpeg"?"jpg":i[1].toLowerCase():"bin"}static blobToBase64Payload(t){return new Promise(e=>{try{const n=new FileReader;n.onload=()=>{const i=String(n.result||""),r=i.indexOf(",");e(r>=0?i.slice(r+1):null)},n.onerror=()=>e(null),n.readAsDataURL(t)}catch{e(null)}})}static async fetchImageForMarkdownPackaging(t){try{const i=await fetch(t,{credentials:"include",mode:"cors"});if(i.ok)return{blob:await i.blob(),contentType:i.headers.get("Content-Type")}}catch{}try{const i=await fetch(t,{credentials:"omit",mode:"cors"});if(i.ok)return{blob:await i.blob(),contentType:i.headers.get("Content-Type")}}catch{}const e=i=>{if(!(i&&i.ok&&typeof i.base64=="string"))return null;const r=String(i.contentType||"application/octet-stream"),a=atob(i.base64),o=a.length,s=new Uint8Array(o);for(let c=0;c<o;c++)s[c]=a.charCodeAt(c);return{blob:new Blob([s],{type:r}),contentType:r}},n=async i=>{const r=chrome.runtime?.sendMessage;return typeof r!="function"?null:await new Promise(a=>{try{r({type:i,url:t},o=>{a(o??null)})}catch{a(null)}})};try{const i=await n("gv.fetchImage"),r=e(i);if(r)return r}catch{}if(t.startsWith("blob:"))return null;try{const i=await n("gv.fetchImageViaPage"),r=e(i);if(r)return r}catch{}return null}static downloadJSON(t,e){const n=new Blob([JSON.stringify(t,null,2)],{type:"application/json;charset=utf-8"}),i=URL.createObjectURL(n),r=document.createElement("a");r.href=i,r.download=e,document.body.appendChild(r),r.click(),setTimeout(()=>{try{document.body.removeChild(r)}catch{}URL.revokeObjectURL(i)},0)}static generateFilename(t,e){const n=this.sanitizeFilenamePart(e);if(n)return`${n}.${t}`;const i=m=>String(m).padStart(2,"0"),r=new Date,a=r.getFullYear(),o=i(r.getMonth()+1),s=i(r.getDate()),c=i(r.getHours()),d=i(r.getMinutes()),h=i(r.getSeconds());return`gemini-chat-${a}${o}${s}-${c}${d}${h}.${t}`}static sanitizeFilenamePart(t){if(!t)return"";const e=t.trim().replace(/\s+/g," ");return e?e.replace(/[\\/:*?"<>|]/g,"").replace(/\s+/g,"-").replace(/\.+$/g,"").slice(0,80):""}static getAvailableFormats(){return[{format:"json",label:"JSON",description:"Machine-readable format for developers"},{format:"markdown",label:"Markdown",description:"Clean, portable text format (recommended)",recommended:!0},{format:"pdf",label:"PDF",description:"Print-friendly format via Save as PDF"},{format:"image",label:"Image",description:"Single PNG image for sharing"}]}}const $=11,Q=20,w=8,L=16,tt=14,et=28;class st{overlay=null;selectedFormat="markdown";fontSize=$;show(t){this.overlay=this.createDialog(t),document.body.appendChild(this.overlay),this.overlay.querySelector(".gv-export-dialog")?.focus()}hide(){this.overlay&&(this.overlay.remove(),this.overlay=null)}createDialog(t){const e=document.createElement("div");e.className="gv-export-dialog-overlay";const n=document.createElement("div");n.className="gv-export-dialog",n.tabIndex=-1;const i=document.createElement("div");i.className="gv-export-dialog-title",i.textContent=t.translations.title;const r=document.createElement("div");r.className="gv-export-dialog-subtitle",r.textContent=t.translations.selectFormat;const a=document.createElement("div");a.className="gv-export-format-list",K.getAvailableFormats().forEach(l=>{const b=t.translations.formatDescriptions[l.format]||l.description,g=this.createFormatOption({...l,description:b},t.translations.safariCmdpHint,t.translations.safariMarkdownHint);a.appendChild(g)});const s=this.createFontSizeSection(t),c=document.createElement("div");c.className="gv-export-dialog-buttons";const d=document.createElement("button");d.className="gv-export-dialog-btn gv-export-dialog-btn-secondary",d.textContent=t.translations.cancel,d.addEventListener("click",()=>{t.onCancel(),this.hide()});const h=document.createElement("button");if(h.className="gv-export-dialog-btn gv-export-dialog-btn-primary",h.textContent=t.translations.export,h.addEventListener("click",()=>{const l=this.selectedFormat==="pdf"||this.selectedFormat==="image";t.onExport(this.selectedFormat,l?this.fontSize:void 0),this.hide()}),c.appendChild(d),c.appendChild(h),n.appendChild(i),n.appendChild(r),t.translations.warning.trim()){const l=document.createElement("div");l.className="gv-export-dialog-warning",l.textContent=t.translations.warning,n.appendChild(l)}n.appendChild(a),n.appendChild(s),n.appendChild(c),e.appendChild(n),e.addEventListener("click",l=>{l.target===e&&(t.onCancel(),this.hide())});const m=l=>{l.key==="Escape"&&(t.onCancel(),this.hide(),document.removeEventListener("keydown",m))};return document.addEventListener("keydown",m),e}createFormatOption(t,e,n){const i=document.createElement("label");i.className="gv-export-format-option";const r=document.createElement("input");r.type="radio",r.name="export-format",r.value=t.format,r.checked=t.format==="markdown",r.checked&&(this.selectedFormat=t.format),r.addEventListener("change",()=>{r.checked&&(this.selectedFormat=t.format,this.updateFontSizeSection())});const a=document.createElement("div");a.className="gv-export-format-content";const o=document.createElement("div");if(o.className="gv-export-format-label",o.textContent=t.label,t.recommended){const d=document.createElement("span");d.className="gv-export-format-badge",d.textContent="Recommended",o.appendChild(d)}const s=document.createElement("div");s.className="gv-export-format-description";let c=t.description;return _()&&(t.format==="pdf"?c=`${t.description} ${e}`:(t.format==="markdown"||t.format==="image")&&(c=`${t.description} ${n}`)),s.textContent=c,a.appendChild(o),a.appendChild(s),i.appendChild(r),i.appendChild(a),i}createFontSizeSection(t){const e=document.createElement("div");e.className="gv-export-fontsize-section",e.style.display="none";const n=document.createElement("div");n.className="gv-export-fontsize-header";const i=document.createElement("span");i.className="gv-export-fontsize-label",i.textContent=t.translations.fontSizeLabel;const r=document.createElement("span");r.className="gv-export-fontsize-value",r.textContent=`${this.fontSize}pt`,n.appendChild(i),n.appendChild(r);const a=document.createElement("input");a.type="range",a.className="gv-export-fontsize-slider",a.min=String(w),a.max=String(L),a.step="1",a.value=String(this.fontSize);const o=document.createElement("div");return o.className="gv-export-fontsize-preview",o.textContent=t.translations.fontSizePreview,o.style.fontSize=`${this.fontSize}pt`,a.addEventListener("input",()=>{this.fontSize=Number(a.value);const s=this.selectedFormat==="image"?"px":"pt";r.textContent=`${this.fontSize}${s}`,o.style.fontSize=`${this.fontSize}${s}`}),e.appendChild(n),e.appendChild(a),e.appendChild(o),e}updateFontSizeSection(){if(!this.overlay)return;const t=this.overlay.querySelector(".gv-export-fontsize-section");if(!t)return;const e=this.selectedFormat==="pdf",n=this.selectedFormat==="image";if(!e&&!n){t.style.display="none";return}t.style.display="block";const i=t.querySelector(".gv-export-fontsize-slider"),r=t.querySelector(".gv-export-fontsize-value"),a=t.querySelector(".gv-export-fontsize-preview");e?(this.fontSize=$,i&&(i.min=String(w),i.max=String(L),i.value=String(this.fontSize)),r&&(r.textContent=`${this.fontSize}pt`),a&&(a.style.fontSize=`${this.fontSize}pt`)):(this.fontSize=Q,i&&(i.min=String(tt),i.max=String(et),i.value=String(this.fontSize)),r&&(r.textContent=`${this.fontSize}px`),a&&(a.style.fontSize=`${this.fontSize}px`))}}function ct(p,t){const e=typeof p=="string"?p.trim():String(p||"").trim();if(e===E)return t("export_error_refresh_retry");const n=t("export_error_generic"),i=e||"unknown error";return n.includes("{error}")?n.replace("{error}",i):`${n} ${i}`.trim()}const nt=".gv-export-toast",it=300,rt=2200;let A=null;function ot(){const p=document.querySelector(nt);if(p instanceof HTMLDivElement)return p;const t=document.createElement("div");return t.className="gv-notification gv-notification-info gv-export-toast",document.body.appendChild(t),t}function lt(p,t){if(!p)return;const e=ot();e.textContent=p,e.classList.add("show"),A&&(clearTimeout(A),A=null);const n=Math.max(t?.autoDismissMs??rt,0);A=setTimeout(()=>{e.classList.remove("show"),setTimeout(()=>{e.classList.contains("show")||e.remove()},it)},n)}export{K as C,st as E,D as I,_ as i,ct as r,lt as s};
