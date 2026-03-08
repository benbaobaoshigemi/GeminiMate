const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/vendor-mermaid-BXcf6h2-.js","assets/vendor-react-B-sxFqXu.js"])))=>i.map(i=>d[i]);
const _={FOLDER_DATA:"gvFolderData",LATEX_FIXER_ENABLED:"geminimate_latex_enabled",MARKDOWN_REPAIR_ENABLED:"geminimate_markdown_enabled",MERMAID_RENDER_ENABLED:"geminimate_mermaid_enabled",SVG_RENDER_ENABLED:"geminimate_svg_render_enabled",THOUGHT_TRANSLATION_ENABLED:"geminimate_thought_translation_enabled",THOUGHT_TRANSLATION_MODE:"geminimate_thought_translation_mode",FORMULA_COPY_ENABLED:"geminimate_formula_copy_enabled",FORMULA_COPY_FORMAT:"geminimate_formula_copy_format",WATERMARK_REMOVER_ENABLED:"geminiWatermarkRemoverEnabled",QUOTE_REPLY_ENABLED:"gvQuoteReplyEnabled",BOTTOM_CLEANUP_ENABLED:"geminimate_bottom_cleanup_enabled",DEBUG_MODE:"geminimate_debug_mode",DEBUG_LOGS:"geminimate_debug_logs",DEBUG_FILE_LOG_ENABLED:"geminimate_debug_file_log_enabled",DEBUG_CACHE_CAPTURE_ENABLED:"geminimate_debug_cache_capture_enabled",LANGUAGE:"geminimate_language",TIMELINE_ENABLED:"geminimate_timeline_enabled",TIMELINE_WIDTH:"geminimate_timeline_width",TIMELINE_AUTO_HIDE:"geminimate_timeline_auto_hide",TIMELINE_STARRED_MESSAGES:"geminiTimelineStarred",TIMELINE_SCROLL_MODE:"geminiTimelineScrollMode",GEMINI_CHAT_WIDTH:"geminimate_chat_width",GEMINI_EDIT_INPUT_WIDTH:"geminimate_edit_input_width",GEMINI_SIDEBAR_WIDTH:"geminimate_sidebar_width",GEMINI_SIDEBAR_AUTO_HIDE:"geminimate_sidebar_auto_hide",GEMINI_ZOOM_LEVEL:"geminimate_zoom_level",GEMINI_FONT_SIZE_SCALE:"geminimate_font_size_scale",GEMINI_FONT_WEIGHT:"geminimate_font_weight",GEMINI_FONT_FAMILY:"geminimate_font_family",GEMINI_SANS_PRESET:"geminimate_sans_preset",GEMINI_SERIF_PRESET:"geminimate_serif_preset",GEMINI_CUSTOM_FONTS:"geminimate_custom_fonts",GEMINI_LETTER_SPACING:"geminimate_letter_spacing",GEMINI_LINE_HEIGHT:"geminimate_line_height",GEMINI_PARAGRAPH_INDENT_ENABLED:"geminimate_paragraph_indent_enabled",GEMINI_EMPHASIS_MODE:"geminimate_emphasis_mode",WORD_RESPONSE_EXPORT_ENABLED:"geminimate_word_response_export_enabled",WORD_RESPONSE_EXPORT_MODE:"geminimate_word_response_export_mode",WORD_RESPONSE_EXPORT_PURE_BODY:"geminimate_word_response_export_pure_body",WORD_RESPONSE_EXPORT_FONT_SIZE_SCALE:"geminimate_word_response_export_font_size_scale",WORD_RESPONSE_EXPORT_LINE_HEIGHT_SCALE:"geminimate_word_response_export_line_height_scale",WORD_RESPONSE_EXPORT_LETTER_SPACING_SCALE:"geminimate_word_response_export_letter_spacing_scale",GV_FOLDER_FILTER_USER_ONLY:"gvFolderFilterUserOnly",GV_FOLDER_TREE_INDENT:"gvFolderTreeIndent",GV_ACCOUNT_ISOLATION_ENABLED:"gvAccountIsolationEnabled",GV_ACCOUNT_ISOLATION_ENABLED_GEMINI:"gvAccountIsolationEnabledGemini",GV_ACCOUNT_PROFILE_MAP:"gvAccountProfileMap"},_e=2e3,ye=`${_.DEBUG_LOGS}:`,He=e=>{if(e!==void 0)try{return JSON.parse(JSON.stringify(e))}catch{return String(e)}};class k{static instance;enabled=!1;initialized=!1;context="unknown";logsStorageKey=`${ye}unknown`;logs=[];flushTimer=null;storageListener=null;static getInstance(){return k.instance||(k.instance=new k),k.instance}async init(t){if(this.context=t,this.logsStorageKey=`${ye}${this.normalizeContext(t)}`,!this.initialized){this.initialized=!0;try{const n=await chrome.storage.local.get([_.DEBUG_MODE,this.logsStorageKey,_.DEBUG_LOGS]);this.enabled=n[_.DEBUG_MODE]===!0;const r=n[this.logsStorageKey]??n[_.DEBUG_LOGS];this.logs=Array.isArray(r)?r.slice(-_e).map(o=>He(o)):[]}catch(n){console.warn("[GeminiMate][Debug] Failed to initialize debug service from storage",n),this.enabled=!1,this.logs=[]}this.storageListener=(n,r)=>{if(r!=="local")return;const o=n[_.DEBUG_MODE];o&&(this.enabled=o.newValue===!0,console.info("[GeminiMate][Debug] Debug mode changed",{enabled:this.enabled}),this.enabled&&this.log("debug","mode-enabled",{context:this.context}))},chrome.storage.onChanged.addListener(this.storageListener),console.info("[GeminiMate][Debug] Debug service initialized",{context:this.context,enabled:this.enabled})}}isEnabled(){return this.enabled}log(t,n,r){if(!this.enabled)return;const o={id:`${Date.now()}-${Math.random().toString(36).slice(2,8)}`,ts:new Date().toISOString(),source:t,action:n,context:this.context,detail:He(r)};this.logs.push(o),this.logs.length>_e&&(this.logs=this.logs.slice(-_e)),this.forwardToBackground(o),this.scheduleFlush()}async clearLogs(){this.logs=[];try{const t=await chrome.storage.local.get(null),n=Object.keys(t).filter(r=>r.startsWith(ye));n.length>0&&await chrome.storage.local.remove(n),await chrome.storage.local.set({[_.DEBUG_LOGS]:[]})}catch(t){console.warn("[GeminiMate][Debug] Failed to clear debug logs",t)}}scheduleFlush(){this.flushTimer===null&&(this.flushTimer=setTimeout(()=>{this.flushTimer=null,this.flush()},250))}async flush(){try{await chrome.storage.local.set({[this.logsStorageKey]:this.logs})}catch(t){console.warn("[GeminiMate][Debug] Failed to flush debug logs",t)}}normalizeContext(t){const n=t.trim().toLowerCase().replace(/[^a-z0-9_-]+/g,"-");return n.length>0?n:"unknown"}forwardToBackground(t){try{if(!chrome?.runtime?.id)return;const n={type:"gm.debug.ingest",entry:t};chrome.runtime.sendMessage(n)}catch{}}}const Mt=k.getInstance(),Rt="modulepreload",Dt=function(e){return"/"+e},ze={},It=function(t,n,r){let o=Promise.resolve();if(n&&n.length>0){let d=function(l){return Promise.all(l.map(g=>Promise.resolve(g).then(c=>({status:"fulfilled",value:c}),c=>({status:"rejected",reason:c}))))};document.getElementsByTagName("link");const i=document.querySelector("meta[property=csp-nonce]"),s=i?.nonce||i?.getAttribute("nonce");o=d(n.map(l=>{if(l=Dt(l),l in ze)return;ze[l]=!0;const g=l.endsWith(".css"),c=g?'[rel="stylesheet"]':"";if(document.querySelector(`link[href="${l}"]${c}`))return;const h=document.createElement("link");if(h.rel=g?"stylesheet":Rt,g||(h.as="script"),h.crossOrigin="",h.href=l,s&&h.setAttribute("nonce",s),document.head.appendChild(h),g)return new Promise((p,f)=>{h.addEventListener("load",p),h.addEventListener("error",()=>f(new Error(`Unable to preload CSS for ${l}`)))})}))}function a(i){const s=new Event("vite:preloadError",{cancelable:!0});if(s.payload=i,window.dispatchEvent(s),!s.defaultPrevented)throw i}return o.then(i=>{for(const s of i||[])s.status==="rejected"&&a(s.reason);return t().catch(a)})},Ae="gm-mermaid-style",y="gm-mermaid-diagram",A="gm-mermaid-toggle",b="gm-mermaid-toggle-button",ke="gm-code-download-button",mt="gm-code-share-button",v="gm-code-action-button",T="data-gm-mermaid-host",Z="data-gm-code-download",he="data-gm-code-share",Ee="data-gm-mermaid-view",Le="data-gm-mermaid-code",ce="data-gm-mermaid-processing",xe="data-gm-mermaid-font";let re=null,Ve=!1,pe=!1,F=!1,de=!0,P=null,N=null;const fe=new Set;let X=null,me=null;const ut="'Google Sans Flex', 'Google Sans', 'Helvetica Neue', Roboto, 'PingFang SC', 'Noto Sans CJK SC', 'Microsoft YaHei', sans-serif";let E=ut;const Ke=new WeakSet,Xe=new WeakSet,Ye=new WeakSet,Ze=new WeakSet,$t=new Set(["代码段","代码","代码块","示例","示例代码","code","code snippet","snippet","example","sample","text","plain","plaintext","raw","output","result"]),kt=["%%","graph","flowchart","sequenceDiagram","classDiagram","stateDiagram","erDiagram","gantt","pie","gitGraph","journey","mindmap","timeline","zenuml","quadrantChart","requirementDiagram","requirement","sankey-beta","sankey","C4Context","C4Container","C4Component","C4Dynamic","C4Deployment","xychart-beta","xychart","block-beta","block","packet-beta","packet","architecture-beta","architecture","kanban","radar-beta","treemap"],Gt={bash:"sh",shell:"sh",sh:"sh",zsh:"sh",powershell:"ps1",ps1:"ps1",python:"py",py:"py",javascript:"js",js:"js",typescript:"ts",ts:"ts",tsx:"tsx",jsx:"jsx",json:"json",html:"html",css:"css",scss:"scss",sass:"sass",less:"less",markdown:"md",md:"md",yaml:"yml",yml:"yml",xml:"xml",sql:"sql",c:"c",cpp:"cpp","c++":"cpp",csharp:"cs",cs:"cs",java:"java",kotlin:"kt",go:"go",rust:"rs",ruby:"rb",php:"php",swift:"swift",dart:"dart",mermaid:"mmd"},Pt=`
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 3a1 1 0 0 1 1 1v8.59l2.3-2.29a1 1 0 1 1 1.4 1.41l-4 4a1 1 0 0 1-1.4 0l-4-4a1 1 0 0 1 1.4-1.41L11 12.59V4a1 1 0 0 1 1-1Zm-7 14a1 1 0 0 1 1 1v1h12v-1a1 1 0 1 1 2 0v2a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-2a1 1 0 0 1 1-1Z" fill="currentColor"/>
  </svg>
`,qt=`
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M14 4h6v6h-2V7.41l-7.29 7.3-1.42-1.42L16.59 6H14V4Z" fill="currentColor"/>
    <path d="M5 5h6v2H7v10h10v-4h2v6H5V5Z" fill="currentColor"/>
  </svg>
`,m=(e,t)=>{Mt.log("mermaid",e,t),console.info("[GM-TRACE][Mermaid]",e,t??{})},gt=e=>e.replace(/[\u00A0\u2002\u2003\u2009\u3000]/g," ").replace(/[\u200B\u200C\u200D\uFEFF]/g,""),ht=()=>ut,Ft=()=>{const e=ht();return e===E?!1:(E=e,pe=!1,!0)},Ut=async()=>{if(!document.fonts?.ready)return;const e=document.fonts.ready;await Promise.race([e,new Promise(t=>{window.setTimeout(t,1200)})])},Bt=()=>document.body.classList.contains("dark-theme")||document.body.classList.contains("dark")||document.body.getAttribute("data-theme")==="dark"||document.body.getAttribute("data-color-scheme")==="dark"||document.documentElement.classList.contains("dark")||document.documentElement.classList.contains("dark-theme")||document.documentElement.getAttribute("data-theme")==="dark"||document.documentElement.getAttribute("data-color-scheme")==="dark"||window.matchMedia("(prefers-color-scheme: dark)").matches,jt=e=>e?$t.has(e.toLowerCase()):!0,Wt=e=>{const t=gt(e).trim();if(t.length<20||!kt.some(i=>t.toLowerCase().startsWith(i.toLowerCase())))return!1;const r=t.split(`
`).filter(i=>i.trim().length>0);if(r.length<2)return!1;const o=r[r.length-1].trim();return!["-->","---","-.","==>",":::","[","(","{","|","&",","].some(i=>o.endsWith(i))},Ht=()=>{if(document.getElementById(Ae))return;const e=document.createElement("style");e.id=Ae,e.textContent=`
    .${A} {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 2px;
      margin-inline-end: 6px;
      border-radius: 999px;
      border: 1px solid rgba(148, 163, 184, 0.22);
      background: rgba(248, 250, 252, 0.88);
    }

    .code-block-decoration .buttons {
      display: inline-flex !important;
      align-items: center !important;
      justify-content: flex-end !important;
      flex-wrap: nowrap !important;
      gap: 6px !important;
      margin-left: auto !important;
    }

    .${A} {
      order: 1;
      flex: 0 0 auto;
    }

    .${mt} {
      order: 2;
      flex: 0 0 auto;
    }

    .${ke} {
      order: 3;
      flex: 0 0 auto;
    }

    .code-block-decoration .buttons > .copy-button,
    .code-block-decoration .buttons > button.copy-button {
      order: 4;
      flex: 0 0 auto;
    }

    .${b} {
      border: none;
      background: transparent;
      color: #475569;
      border-radius: 999px;
      cursor: pointer;
      font-size: 12px;
      font-weight: 600;
      line-height: 1;
      padding: 6px 10px;
      transition: all 160ms ease;
    }

    .${b}.active {
      background: rgba(59, 130, 246, 0.16);
      color: #1d4ed8;
    }

    .${v} {
      width: 32px;
      height: 32px;
      border: none;
      border-radius: 999px;
      padding: 0;
      background: transparent;
      color: var(--gem-sys-color--on-surface-variant, #5f6368);
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      vertical-align: middle;
      line-height: 1;
      transition: background-color 160ms ease, color 160ms ease, opacity 160ms ease;
    }

    .${v}:hover {
      background: rgba(148, 163, 184, 0.14);
      color: var(--gem-sys-color--on-surface, #111827);
    }

    .${v}:disabled {
      cursor: not-allowed;
      opacity: 0.45;
    }

    .${v} svg {
      width: 18px;
      height: 18px;
      display: block;
      fill: currentColor;
    }

    .${y} {
      display: none;
      padding: 16px 18px 18px;
      overflow: auto;
      text-align: center;
      cursor: zoom-in;
      border-top: 1px solid rgba(148, 163, 184, 0.16);
    }

    .${y} svg {
      max-width: 100%;
      height: auto;
      overflow: visible !important;
    }

    .${y} .label,
    .${y} .edgeLabel,
    .${y} foreignObject,
    .${y} foreignObject * {
      overflow: visible !important;
    }

    .gm-mermaid-render-error {
      padding: 20px;
      text-align: center;
      color: #64748b;
    }

    .gm-mermaid-render-error strong {
      display: block;
      margin-bottom: 8px;
      color: #334155;
    }

    .gm-mermaid-modal {
      position: fixed;
      inset: 0;
      z-index: 2147483646;
      background: rgba(2, 6, 23, 0.84);
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      transition: opacity 160ms ease;
    }

    .gm-mermaid-modal.visible {
      opacity: 1;
    }

    .gm-mermaid-modal-content {
      max-width: min(92vw, 1600px);
      max-height: 88vh;
      overflow: auto;
      background: rgba(255, 255, 255, 0.96);
      border: 1px solid rgba(148, 163, 184, 0.22);
      border-radius: 20px;
      box-shadow: 0 24px 60px rgba(15, 23, 42, 0.3);
      padding: 20px;
    }

    .gm-mermaid-modal-close {
      position: fixed;
      top: 18px;
      right: 18px;
      width: 40px;
      height: 40px;
      border: none;
      border-radius: 999px;
      cursor: pointer;
      font-size: 18px;
      color: white;
      background: rgba(15, 23, 42, 0.66);
    }

    .dark-theme .${A},
    html.dark .${A},
    body.dark .${A} {
      background: rgba(15, 23, 42, 0.72);
      border-color: rgba(148, 163, 184, 0.18);
    }

    .dark-theme .${b},
    html.dark .${b},
    body.dark .${b} {
      color: rgba(226, 232, 240, 0.88);
    }

    .dark-theme .${b}.active,
    html.dark .${b}.active,
    body.dark .${b}.active {
      color: #93c5fd;
      background: rgba(59, 130, 246, 0.2);
    }

    .dark-theme .${v},
    html.dark .${v},
    body.dark .${v} {
      color: rgba(226, 232, 240, 0.88);
    }
  `,document.head.appendChild(e)},W=e=>{const t=e.closest(".code-block, code-block");if(!t)return null;const n=[e,e.closest("pre"),t];for(const i of n){if(!i)continue;const s=i.getAttribute("data-language")||i.getAttribute("data-lang")||i.getAttribute("lang");if(s?.trim())return s.trim().toLowerCase();const l=(i instanceof HTMLElement?i.className:i.getAttribute("class")||"").match(/(?:language|lang)-([a-z0-9+#._-]+)/i);if(l?.[1])return l[1].toLowerCase()}const r=t.querySelector(".code-block-decoration");return r&&r.querySelector(":scope > span")?.textContent?.trim().toLowerCase()||null},pt=async()=>{if(re)return re;if(Ve)return null;try{return re=(await It(()=>import("./vendor-mermaid-BXcf6h2-.js").then(t=>t.m),__vite__mapDeps([0,1]))).default,re}catch(e){return Ve=!0,m("load-failed",{error:String(e)}),null}},ft=async()=>{if(pe)return!0;const e=await pt();if(!e)return!1;const t=Bt();return E=ht(),e.initialize({startOnLoad:!1,theme:t?"dark":"default",securityLevel:"loose",fontFamily:E,themeVariables:{fontFamily:E,darkMode:t,background:t?"#0b1020":"#ffffff",primaryColor:t?"#1f2937":"#eceff5",primaryTextColor:t?"#e5e7eb":"#1f2937",secondaryColor:t?"#111827":"#f8fafc",tertiaryColor:t?"#0f172a":"#ffffff",lineColor:t?"#cbd5e1":"#374151",clusterBkg:t?"#111827":"#e0f2fe",clusterBorder:t?"#94a3b8":"#0f766e",edgeLabelBackground:t?"#111827":"#f8fafc"},flowchart:{htmlLabels:!1,curve:"basis"},state:{useMaxWidth:!1},sequence:{useMaxWidth:!1},logLevel:5}),pe=!0,!0},Q=e=>e.replace(/\r\n/g,`
`).replace(/\r/g,`
`),bt=e=>e.closest(".code-block, code-block"),zt=e=>e.querySelector(".code-block-decoration"),Ge=e=>{const t=zt(e);if(!t)return null;const n=t.querySelector(":scope > .buttons");if(n instanceof HTMLElement)return n;const r=document.createElement("div");return r.className="buttons",t.appendChild(r),r},Pe=e=>e.querySelector(".code-block-decoration .buttons > .copy-button, .code-block-decoration .buttons > button.copy-button"),I=e=>e.querySelector('code[data-test-id="code-content"]')??e.querySelector(".formatted-code-block-internal-container code")??e.querySelector("pre code")??e.querySelector("code.code-container"),qe=(e,t)=>e.querySelector(".formatted-code-block-internal-container")??t?.closest(".formatted-code-block-internal-container")??t?.closest("pre")??t??null,x=e=>e.querySelector(`.${y}`),Vt=e=>{const t=e.querySelector("defs")??e.insertBefore(document.createElementNS("http://www.w3.org/2000/svg","defs"),e.firstChild);let n=t.querySelector('style[data-gm-mermaid-font="1"]');n||(n=document.createElementNS("http://www.w3.org/2000/svg","style"),n.setAttribute("data-gm-mermaid-font","1"),t.appendChild(n)),n.textContent=`
    text, tspan, .label, .nodeLabel, .edgeLabel, foreignObject, foreignObject * {
      font-family: ${E} !important;
    }
    .label, .edgeLabel, foreignObject, foreignObject * {
      overflow: visible !important;
      line-height: 1.25 !important;
    }
    foreignObject div, foreignObject span, foreignObject p {
      margin: 0 !important;
      padding: 0 !important;
      background: transparent !important;
      border: 0 !important;
      box-shadow: none !important;
      color: inherit !important;
    }
  `},Et=e=>{const t=e.cloneNode(!0);if(!(t instanceof SVGElement))return e.outerHTML;t.getAttribute("xmlns")||t.setAttribute("xmlns","http://www.w3.org/2000/svg"),t.getAttribute("xmlns:xlink")||t.setAttribute("xmlns:xlink","http://www.w3.org/1999/xlink"),t.style.setProperty("font-family",E,"important"),t.style.setProperty("overflow","visible","important");const n=t.querySelector("defs")??t.insertBefore(document.createElementNS("http://www.w3.org/2000/svg","defs"),t.firstChild),r=document.createElementNS("http://www.w3.org/2000/svg","style");return r.textContent=`
    text, tspan, .label, .nodeLabel, .edgeLabel, foreignObject, foreignObject * {
      font-family: ${E} !important;
    }
    .label, .edgeLabel, foreignObject, foreignObject * {
      overflow: visible !important;
      line-height: 1.25 !important;
    }
    foreignObject div, foreignObject span, foreignObject p {
      margin: 0 !important;
      padding: 0 !important;
      background: transparent !important;
      border: 0 !important;
      box-shadow: none !important;
      color: inherit !important;
    }
  `,n.appendChild(r),new XMLSerializer().serializeToString(t)},Je=e=>{const t=e.querySelector("svg");t instanceof SVGElement&&(t.style.setProperty("font-family",E,"important"),t.style.setProperty("overflow","visible","important"),Vt(t),t.querySelectorAll(".label, .edgeLabel, foreignObject, foreignObject *").forEach(n=>{if(n instanceof SVGElement){n.style.setProperty("overflow","visible","important");return}n instanceof HTMLElement&&(n.style.setProperty("overflow","visible","important"),n.style.setProperty("line-height","1.25","important"))}))},Qe=(e,t)=>{Ke.has(e)||(e.addEventListener("click",n=>{n.preventDefault(),n.stopPropagation(),Kt(t)}),Ke.add(e))},oe=(e,t,n)=>{Ye.has(e)||(e.addEventListener("click",r=>{r.preventDefault(),r.stopPropagation(),vt(t,n)}),Ye.add(e))},Ce=e=>{Ze.has(e)||(e.addEventListener("click",()=>{e.querySelector("svg")&&Jt(e.innerHTML)}),Ze.add(e))},et=()=>new Date().toISOString().replace(/[:.]/g,"-").replace("T","_").replace("Z",""),_t=e=>{const t=(e??"").trim().toLowerCase();return t?Gt[t]??"txt":"txt"},tt=(e,t,n)=>{const r=new Blob(e,{type:n}),o=URL.createObjectURL(r),a=document.createElement("a");a.href=o,a.download=t,a.style.display="none",document.body.appendChild(a),a.click(),a.remove(),window.setTimeout(()=>URL.revokeObjectURL(o),1e3)},Ne=e=>e.getAttribute(Ee)==="code"?"code":"diagram",ee=e=>{const t=e.querySelector(`[${Z}="1"]`);if(!t)return;const n=I(e);Q(n?.textContent||"");const r=W(n??e),a=e.getAttribute(T)==="1"&&Ne(e)==="diagram",i=x(e)?.querySelector("svg");if(a&&i instanceof SVGElement){t.disabled=!1,t.title="下载 Mermaid 图像",t.setAttribute("aria-label","下载 Mermaid 图像");return}t.disabled=!1;const s=_t(r);t.title=`下载代码 (.${s})`,t.setAttribute("aria-label",`下载代码 (.${s})`)},Kt=e=>{const t=I(e),n=Q(t?.textContent||""),r=W(t??e),o=e.getAttribute(T)==="1",a=o&&Ne(e)==="diagram",i=x(e)?.querySelector("svg");if(a&&i instanceof SVGElement){const g=Et(i),c=`geminimate-mermaid-${et()}.svg`;tt([g],c,"image/svg+xml;charset=utf-8"),m("download-diagram",{filename:c,view:"diagram"});return}if(!n.trim()){m("download-skipped-empty",{language:r,mermaidHost:o});return}const s=_t(r),d=`geminimate-code-${et()}.${s}`;tt([n],d,s==="json"?"application/json;charset=utf-8":s==="svg"?"image/svg+xml;charset=utf-8":"text/plain;charset=utf-8"),m("download-code",{filename:d,language:r,view:o?Ne(e):"code"})},we=(e,t)=>{if(!e.trim())return m("share-window-open-failed",{reason:"empty-html"}),!1;try{const n=chrome.runtime.getURL("sandbox/runner.html"),r=window.open(n,"_blank");if(!r)return m("share-window-open-failed",{reason:"window-open-blocked"}),!1;const o=a=>{a.source!==r||a.data?.type!=="RUNNER_READY"||(window.removeEventListener("message",o),r.postMessage({type:"PREVIEW_HTML",html:e,title:t},"*"),m("share-window-opened",{title:t,htmlLength:e.length}))};return window.addEventListener("message",o),!0}catch(n){return m("share-window-open-failed",{reason:"send-message-exception",error:String(n)}),!1}},Te=(e,t,n)=>`<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>${t}</title>
  </head>
  <body style="${n}">${e}</body>
</html>`,yt=e=>/<\s*svg\b/i.test(e),wt=e=>/<\s*(?:!doctype|html|head|body|script|style|div|span|main|section|article|canvas|iframe)\b/i.test(e),Xt=e=>{const t=I(e),n=Q(t?.textContent||""),r=W(t??e),o=e.getAttribute(T)==="1",a=x(e)?.querySelector("svg");if(o&&a instanceof SVGElement){const d=Et(a),l=Te(d,"Mermaid Share","margin:0;padding:24px;background:#0b1020;display:flex;justify-content:center;align-items:flex-start;");we(l,"Mermaid Share");return}if(!n.trim())return;const i=r==="svg"||yt(n),s=r==="html"||wt(n);if(m("share-detect",{language:r,isMermaidHost:o,isSvgSource:i,isHtmlSource:s,sourceLength:n.length}),s){const d=/<\s*(?:!doctype|html|head|body)\b/i.test(n)?n:Te(n,"HTML Share","margin:0;padding:24px;background:#f8fafc;color:#0f172a;");we(d,"HTML Share");return}if(i){const d=Te(n,"SVG Share","margin:0;padding:24px;background:#f8fafc;display:flex;justify-content:center;");we(d,"SVG Share");return}},Tt=(e,t,n,r)=>{const o=document.createElement("button");return o.type="button",o.className=`${v} ${r}`,o.innerHTML=t,o.title=e,o.setAttribute("aria-label",e),o.setAttribute(n,"1"),o},nt=(e,t)=>{Xe.has(e)||(e.addEventListener("click",n=>{n.preventDefault(),n.stopPropagation(),Xt(t)}),Xe.add(e))},te=e=>{const t=e.querySelector(`[${he}="1"]`);if(!t)return;const n=I(e),r=Q(n?.textContent||""),o=W(n??e),a=e.getAttribute(T)==="1",i=x(e)?.querySelector("svg")instanceof SVGElement,s=a&&i||o==="html"||o==="svg"||wt(r)||yt(r);t.disabled=!s,t.title=s?"分享到新窗口":"当前代码类型不支持分享预览",t.setAttribute("aria-label",t.title)},Oe=e=>{const t=Ge(e);if(!t)return;let n=t.querySelector(`[${he}="1"]`);if(n)nt(n,e);else{const r=Pe(e);n=Tt("分享到新窗口",qt,he,mt),nt(n,e),r?t.insertBefore(n,r):t.appendChild(n),m("download-button-inserted",{language:W(I(e)??e)})}te(e)},Me=e=>{const t=Ge(e);if(!t)return;let n=t.querySelector(`[${Z}="1"]`);if(n)Qe(n,e);else{const r=Pe(e);n=Tt("下载代码",Pt,Z,ke),Qe(n,e),r?t.insertBefore(n,r):t.appendChild(n)}ee(e),te(e)},St=e=>e.querySelector(`.${A}`),vt=(e,t)=>{const n=x(e),r=qe(e,I(e)??void 0),o=t==="diagram"&&n?"diagram":"code";e.setAttribute(Ee,o),n&&(n.style.display=o==="diagram"?"block":"none"),r&&(r.style.display=o==="diagram"?"none":""),e.querySelectorAll(`.${b}`).forEach(i=>{i.classList.toggle("active",i.dataset.view===o)}),ee(e),m("view-updated",{view:o,mermaidHost:e.getAttribute(T)==="1"})},Yt=(e,t)=>{let n=x(e);return n?(Ce(n),n):(n=document.createElement("div"),n.className=y,Ce(n),t.parentElement?.insertBefore(n,t),n)},rt=e=>{const t=Ge(e);if(!t)return;const n=St(e);if(n){const l=n.querySelector(`.${b}[data-view="diagram"]`),g=n.querySelector(`.${b}[data-view="code"]`);if(l&&g){oe(l,e,"diagram"),oe(g,e,"code");return}n.remove()}const r=document.createElement("div");r.className=A;const o=document.createElement("button");o.type="button",o.className=`${b} active`,o.dataset.view="diagram",o.textContent="图表";const a=document.createElement("button");a.type="button",a.className=b,a.dataset.view="code",a.textContent="代码",oe(o,e,"diagram"),oe(a,e,"code"),r.append(o,a);const i=t.querySelector(`[${Z}="1"]`),s=Pe(e),d=i??s;d?t.insertBefore(r,d):t.appendChild(r)},Zt=(e,t)=>{const n=t.length>240?`${t.slice(0,240)}...`:t;e.innerHTML=`
    <div class="gm-mermaid-render-error">
      <strong>Mermaid 渲染失败</strong>
      <div>${n}</div>
      <div style="margin-top:8px;font-size:12px;">你仍然可以切回代码视图或直接下载源码。</div>
    </div>
  `},Re=(e,t)=>{x(e)?.remove(),St(e)?.remove(),t?(e.querySelector(`[${he}="1"]`)?.remove(),e.querySelector(`[${Z}="1"]`)?.remove()):(ee(e),te(e));const o=qe(e,I(e)??void 0);o&&(o.style.display=""),e.removeAttribute(T),e.removeAttribute(Ee),e.removeAttribute(Le),e.removeAttribute(xe),e.removeAttribute(ce)},ue=()=>{if(me&&(document.removeEventListener("keydown",me),me=null),!X)return;const e=X;e.classList.remove("visible"),X=null,window.setTimeout(()=>e.remove(),160)},Jt=e=>{if(X)return;const t=document.createElement("div");t.className="gm-mermaid-modal";const n=document.createElement("button");n.className="gm-mermaid-modal-close",n.type="button",n.textContent="×";const r=document.createElement("div");r.className="gm-mermaid-modal-content",r.innerHTML=e,t.append(n,r),document.body.appendChild(t),X=t,n.addEventListener("click",ue),t.addEventListener("click",a=>{a.target===t&&ue()});const o=a=>{a.key==="Escape"&&ue()};me=o,document.addEventListener("keydown",o),requestAnimationFrame(()=>t.classList.add("visible"))},Qt=async(e,t)=>{const n=gt(t),r=bt(e);if(!r)return;const o=Ft(),i=(r.getAttribute(xe)??"")!==E,s=x(r),d=s?.querySelector("svg")instanceof SVGElement;if(r.getAttribute(Le)===n&&!o&&!i&&d){Oe(r),Me(r),rt(r),s&&(Ce(s),Je(s)),ee(r),te(r);return}if(r.getAttribute(ce)==="1")return;const l=qe(r,e);if(l){r.setAttribute(ce,"1");try{if(await Ut(),!await ft()){m("load-unavailable");return}const c=await pt();if(!c)return;const h=Yt(r,l);Oe(r),Me(r),rt(r),r.setAttribute(T,"1");const p=`gm-mermaid-${Math.random().toString(36).slice(2,10)}`;try{const S=await c.render(p,n),ne=typeof S=="string"?S:S.svg;h.innerHTML=ne,Je(h),m("rendered",{codeLength:n.length})}catch(S){Zt(h,String(S)),m("render-failed",{error:String(S)})}r.setAttribute(Le,n),r.setAttribute(xe,E);const f=r.getAttribute(Ee);vt(r,f==="code"?"code":"diagram")}finally{r.removeAttribute(ce)}}},Fe=()=>{if(!F)return;const e=document.querySelectorAll('code[data-test-id="code-content"], .formatted-code-block-internal-container code, .code-block pre code, code.code-container'),t=new Set;m("scan-start",{codeCount:e.length,renderEnabled:de}),e.forEach(n=>{const r=bt(n);if(!r)return;t.add(r),Oe(r),Me(r);const o=Q(n.textContent||""),a=W(n),i=r.closest('model-response, .model-response, [data-message-author-role="model"]'),s=!i||i.querySelector("message-actions")!==null;if(de&&s&&(a==="mermaid"||jt(a)&&Wt(o))){Qt(n,o);return}r.getAttribute(T)==="1"?(Re(r,!1),m("mermaid-host-rolled-back",{language:a,codeLength:o.length})):(ee(r),te(r))}),document.querySelectorAll(`[${T}="1"]`).forEach(n=>{t.has(n)||Re(n,!1)}),m("scan-end",{activeHostCount:t.size,renderEnabled:de})},en=()=>{document.querySelectorAll(".code-block, code-block").forEach(e=>{Re(e,!0)})},Ue=()=>{F&&(N!==null&&clearTimeout(N),N=window.setTimeout(()=>{N=null,Fe()},350))},ot=()=>{[120,700,1600,3e3].forEach(e=>{const t=window.setTimeout(()=>{fe.delete(t),F&&(m("warmup-scan",{delay:e}),Fe())},e);fe.add(t)})},tn=()=>{P||!document.body||(P=new MutationObserver(e=>{e.some(n=>{const r=n.target instanceof Element?n.target:n.target.parentElement;if(r?.closest(`.${y}, .${A}, .${ke}`))return!1;if(r?.closest(".code-block, code-block, model-response"))return!0;for(const o of Array.from(n.addedNodes))if((o instanceof Element?o:o.parentElement)?.closest(".code-block, code-block, model-response"))return!0;return!1})&&(m("mutation-detected",{count:e.length}),Ue())}),P.observe(document.body,{childList:!0,subtree:!0,characterData:!0}))};async function _n(){if(F){Ue(),ot();return}F=!0,Ht(),tn(),Fe(),ot(),ft(),m("start")}function yn(){P&&(P.disconnect(),P=null),N!==null&&(clearTimeout(N),N=null),fe.forEach(e=>clearTimeout(e)),fe.clear(),en(),ue(),document.getElementById(Ae)?.remove(),pe=!1,F=!1,m("stop")}function wn(e){de=e,m("render-toggle",{enabled:e}),Ue()}const De="gm-thought-translation-style",M="gm-thought-translation-layout",J="gm-thought-original",u="gm-thought-translation",V="data-gm-thought-translated",K="data-gm-thought-processing",ge="data-gm-thought-source",w="data-gm-thought-error",G="data-gm-thought-mode",Se="data-gm-thought-replacement",U="gm-thought-original-hidden",At=['[data-test-id="thoughts-content"]',".thoughts-content",".thoughts-content-expanded",".thoughts-streaming",".thoughts-container"],nn=[":scope .markdown.markdown-main-panel",":scope > .markdown.markdown-main-panel",":scope .message-container message-content .markdown.markdown-main-panel",":scope .message-container message-content .markdown",":scope message-content .markdown.markdown-main-panel",":scope message-content .markdown",":scope .thought-content"],ae=2800,rn=120,on=450,R='[data-test-id="thoughts-content"], .thoughts-content, .thoughts-content-expanded, .thoughts-streaming, .thoughts-container, .thoughts-wrapper',an=1,at="__GM_THOUGHT_NL_9F2E__";let B=!0,q=null,O=null,L="compare";const be=new Set,it=new Map,st=new Map,$=new WeakMap,z=new WeakMap,ve=new WeakMap;let ie=0;const j=new WeakMap,C=(e,t)=>{},Lt=e=>e==="replace"?"replace":"compare",Be=e=>{e.setAttribute(G,L)},Ie=(e,t)=>{if(t!=="local")return;const n=e[_.THOUGHT_TRANSLATION_MODE];n&&(L=Lt(n.newValue),document.querySelectorAll(R).forEach(r=>{Be(r)}),Y())},sn=()=>{if(document.getElementById(De))return;const e=document.createElement("style");e.id=De,e.textContent=`
    .${M} {
      display: grid !important;
      grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) !important;
      align-items: start !important;
      gap: 24px !important;
      width: 100% !important;
      max-width: 100% !important;
    }

    .${J},
    .${u} {
      min-width: 0 !important;
      width: 100% !important;
      max-width: 100% !important;
      box-sizing: border-box !important;
      overflow: visible !important;
      color: inherit;
      white-space: pre-wrap !important;
      overflow-wrap: break-word !important;
      word-break: normal !important;
    }

    .${u}::before {
      content: '\\601D\\7EF4\\94FE\\7FFB\\8BD1';
      display: block;
      margin-bottom: 12px;
      color: inherit;
      opacity: 0.72;
      font: inherit;
      font-weight: 600;
    }

    .${u} {
      padding: 0 !important;
      margin: 0 !important;
      border: 0 !important;
      border-left: 1px solid rgba(0, 0, 0, 0.12) !important;
      background: #ffffff !important;
      border-radius: 0 !important;
      padding: 0 20px 0 24px !important;
      box-shadow: none !important;
      font: inherit !important;
      font-family: inherit !important;
      font-size: inherit !important;
      line-height: inherit !important;
    }

    .${u},
    .${u} * {
      font-family: inherit !important;
      font-size: inherit !important;
      line-height: inherit !important;
      max-width: 100% !important;
      color: inherit !important;
      background: transparent !important;
    }

    .${u} .gm-thought-translation-content {
      white-space: normal !important;
    }

    .${u} .gm-thought-translation-content p {
      margin: 0 0 1em 0 !important;
    }

    .${u} .gm-thought-translation-content p:last-child {
      margin-bottom: 0 !important;
    }

    .${u}[${w}="1"] {
      color: #b42318 !important;
    }

    .${u}[${w}="1"]::before {
      content: '\\601D\\7EF4\\94FE\\7FFB\\8BD1\\5931\\8D25';
    }

    [${G}="replace"] > .${M} {
      grid-template-columns: minmax(0, 1fr) !important;
      gap: 0 !important;
    }

    [${G}="replace"] .${J} {
      display: none !important;
    }

    [${G}="replace"] .${u} {
      display: contents !important;
      border: 0 !important;
      background: transparent !important;
      padding: 0 !important;
      margin: 0 !important;
      font: inherit !important;
    }

    [${G}="replace"] .${u}::before {
      display: none !important;
    }

    .${U} {
      display: none !important;
    }

    @media (prefers-color-scheme: dark) {
      .${u} {
        background: #000000 !important;
        border-left-color: rgba(255, 255, 255, 0.14) !important;
      }
    }

    @media (max-width: 1100px) {
      .${M} {
        grid-template-columns: minmax(0, 1fr) !important;
      }

      .${u} {
        border-left: 0 !important;
        border-top: 1px solid rgba(0, 0, 0, 0.12) !important;
        padding: 20px 0 0 0 !important;
      }
    }

    @media (max-width: 1100px) and (prefers-color-scheme: dark) {
      .${u} {
        border-top-color: rgba(255, 255, 255, 0.14) !important;
      }
    }
  `,document.head.appendChild(e)},D=e=>e.replace(/\u00a0/g," ").replace(/\r/g,"").replace(/[ \t]+\n/g,`
`).replace(/\n{3,}/g,`

`).trim(),lt=["p","li","h1","h2","h3","h4","h5","h6","blockquote","figcaption","td","th"].join(", "),ln=e=>e.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;"),ct=e=>{const t=D(e);return t?`<div class="gm-thought-translation-content markdown markdown-main-panel">${t.split(/\n{2,}/).map(o=>o.trim()).filter(Boolean).map(o=>`<p>${ln(o).replace(/\n/g,"<br>")}</p>`).join("")}</div>`:""},cn=e=>`<div class="gm-thought-translation-content markdown markdown-main-panel">${e}</div>`,dt=e=>{const t=Array.from(e.querySelectorAll(lt)).filter(n=>!n.querySelector(lt));return t.length>0?t:[e]},xt=async(e,t)=>{const n=dt(e),r=await Promise.all(n.map(async i=>{const s=D(i.innerText||i.textContent||"");return s?Nt(s):""})),o=e.cloneNode(!0);if(!(o instanceof HTMLElement))return ct(t);o.classList.remove(U);const a=dt(o);return a.length!==r.length?ct(t):(a.forEach((i,s)=>{const d=D(r[s]||"");if(!d){i.textContent="";return}const l=d.split(`
`).filter(Boolean);if(l.length<=1){i.textContent=d;return}i.replaceChildren(),l.forEach((g,c)=>{c>0&&i.appendChild(document.createElement("br")),i.appendChild(document.createTextNode(g))})}),o.outerHTML)},dn=async(e,t)=>{const n=await xt(e,t);return cn(n)},Ct=e=>{const t=j.get(e);t&&(t.translatedNode?.remove(),t.originalNode.isConnected||t.anchor.parentNode?.insertBefore(t.originalNode,t.anchor),t.anchor.remove(),t.originalNode.classList.remove(U),j.delete(e))},mn=e=>{const t=e.closest(R)??e.parentElement;if(!t)throw new Error("missing_thought_container");const n=j.get(t);if(n)return n;const r=document.createComment("gm-thought-replacement-anchor"),o=e.parentNode;if(!o)throw new Error("missing_thought_parent");o.insertBefore(r,e),o.removeChild(e),e.classList.add(U);const a={anchor:r,originalNode:e,translatedNode:null};return j.set(t,a),a},un=e=>{const t=e.split(/\n{2,}/),n=[];let r="";return t.forEach(o=>{const a=r?`${r}

${o}`:o;if(a.length<=ae){r=a;return}if(r&&n.push(r),o.length<=ae){r=o;return}for(let i=0;i<o.length;i+=ae)n.push(o.slice(i,i+ae));r=""}),r&&n.push(r),n.length>0?n:[e]},gn=e=>e.matches(".thoughts-content-expanded")?!0:e.getAttribute("aria-hidden")==="true"||e.hasAttribute("hidden")?!1:e.offsetParent!==null||e.getClientRects().length>0?!0:e.closest(".thoughts-wrapper, .thoughts-container, thoughts-entry")!==null,hn=e=>{if(e.matches(".markdown.markdown-main-panel"))return e;const t=nn.flatMap(a=>Array.from(e.querySelectorAll(a))).filter(a=>!a.closest(`.${u}`));let n=null,r=0;const o=a=>{const i=typeof a.innerText=="string"&&a.innerText.length>0?a.innerText:a.textContent||"";return D(i)};return t.forEach(a=>{const i=o(a);i&&i.length>r&&(n=a,r=i.length)}),n},pn=()=>{const e=new Set;At.forEach(o=>{document.querySelectorAll(o).forEach(a=>{e.add(a)})}),document.querySelectorAll(".thoughts-container .markdown.markdown-main-panel").forEach(o=>{const a=o.closest('[data-test-id="thoughts-content"], .thoughts-content, .thoughts-container')??o;e.add(a)});const t=Array.from(e).filter(gn),n=t.filter(o=>!t.some(a=>a!==o&&o.contains(a))),r=n.filter(o=>o.matches(".thoughts-content-expanded"));return r.length>0?r:n},Nt=async e=>{const t=D(e);if(!t)return"";const n=it.get(t);if(n)return n;const r=un(t),o=[];for(const i of r){const s=st.get(i);if(s){o.push(s);continue}const d=i.replace(/\n/g,` ${at} `),l=await chrome.runtime.sendMessage({type:"gm.translateThought",text:d,targetLang:"zh-CN"});if(!l?.ok)throw new Error(l?.error||"translation_failed");const g=new RegExp(`\\s*${at}\\s*`,"g"),c=l.translatedText.replace(g,`
`);st.set(i,c),o.push(c)}const a=D(o.join(`

`));return it.set(t,a),a},fn=e=>{Be(e);let t=e.querySelector(`:scope > .${M}`),n=t?.querySelector(`:scope > .${J}`)??null,r=t?.querySelector(`:scope > .${u}`)??null;return t instanceof HTMLDivElement||(t=document.createElement("div"),t.className=M,e.appendChild(t)),n instanceof HTMLDivElement||(n=document.createElement("div"),n.className=J,t.appendChild(n)),Array.from(e.childNodes).filter(a=>a!==t).forEach(a=>n.appendChild(a)),r instanceof HTMLDivElement||(r=document.createElement("div"),r.className=u,t.appendChild(r)),{originalNode:n,translationNode:r}},$e=e=>{Ct(e);const t=e.querySelector(`:scope > .${M}`);if(!(t instanceof HTMLDivElement))return;const n=t.querySelector(`:scope > .${J}`);if(n instanceof HTMLDivElement)for(;n.firstChild;)e.insertBefore(n.firstChild,t);t.remove()},je=()=>{At.forEach(e=>{document.querySelectorAll(e).forEach(t=>{$e(t),t.removeAttribute(V),t.removeAttribute(K),t.removeAttribute(ge),t.removeAttribute(w),t.removeAttribute(G)})})},Ot=()=>{if(!B){je();return}const e=pn();C("thought-container-scan",{count:e.length}),document.querySelectorAll(`.${u}, [${Se}="1"], ${R}`).forEach(t=>{const n=t.matches(R)?t:t.closest(R);n&&!e.includes(n)&&($e(n),n.removeAttribute(V),n.removeAttribute(K),n.removeAttribute(ge),n.removeAttribute(w))}),e.forEach(t=>{C("thought-root-found",{className:t.className});const o=j.get(t)?.originalNode??hn(t);if(!o)return;const a=D(typeof o.innerText=="string"&&o.innerText.length>0?o.innerText:o.textContent||"");if(C("thought-text-extracted",{length:a.length,preview:a.slice(0,80)}),!a)return;const i=t.getAttribute(ge)??"",s=t.getAttribute(K)==="1",d=a.length-i.length,l=Date.now();if(s){d>=rn&&z.set(t,a);return}if(ie>=an){z.set(t,a);return}const g=ve.get(t)??0;if(i&&a!==i&&l-g<on)return;L==="replace"?t.querySelector(`:scope > .${M}`)instanceof HTMLDivElement&&$e(t):Ct(t);const c=L==="replace"?(()=>{const p=mn(o);if(p.translatedNode)return p.translatedNode;const f=o.cloneNode(!0);if(!(f instanceof HTMLElement))throw new Error("replacement_clone_failed");return f.classList.remove(U),f.setAttribute(Se,"1"),p.anchor.parentNode?.insertBefore(f,p.anchor.nextSibling),p.translatedNode=f,f})():fn(t).translationNode;if(!s&&t.getAttribute(V)==="1"&&i===a&&c.textContent){C("thought-translation-skipped-already-processed",{sourceLength:a.length});return}const h=($.get(t)??0)+1;$.set(t,h),z.delete(t),ve.set(t,l),ie+=1,t.setAttribute(K,"1"),t.setAttribute(ge,a),(!c.textContent||c.textContent==="翻译中...")&&(c.textContent="翻译中..."),c.removeAttribute(w),C("thought-translation-requested",{sourceLength:a.length}),Nt(a).then(async p=>{if($.get(t)!==h||!B)return;const f=L==="replace"?await xt(o,p||"未返回可用翻译。"):await dn(o,p||"未返回可用翻译。");if($.get(t)===h){if(L==="replace"){const S=c,ne=document.createElement("div");ne.innerHTML=f;const H=ne.firstElementChild;if(!(H instanceof HTMLElement))throw new Error("replacement_render_failed");H.classList.remove(U),H.setAttribute(Se,"1"),S.replaceWith(H);const We=j.get(t);We&&(We.translatedNode=H)}else c.innerHTML=f,c.removeAttribute(w);t.setAttribute(V,"1"),t.removeAttribute(w),C("thought-translation-inserted",{sourceLength:a.length,translatedLength:p.length})}}).catch(p=>{$.get(t)===h&&(L==="replace"?c.textContent=`翻译失败：${String(p)}`:(c.textContent=`翻译失败：${String(p)}`,c.setAttribute(w,"1")),t.setAttribute(w,"1"),t.removeAttribute(V),C("translate-failed",{sourceLength:a.length}))}).finally(()=>{ie=Math.max(0,ie-1),$.get(t)===h&&t.removeAttribute(K),z.has(t)&&(ve.delete(t),z.delete(t)),Y()})})},se=e=>(e instanceof Element?e:e.parentElement)?.closest(`.${u}`)!==null,le=e=>(e instanceof Element?e:e.parentElement)?.closest(R)!==null,bn=e=>e.some(t=>{if(t.type==="characterData")return se(t.target)?!1:le(t.target);if(se(t.target))return!1;if(le(t.target))return!0;for(const n of Array.from(t.addedNodes))if(!se(n)&&le(n))return!0;for(const n of Array.from(t.removedNodes))if(!se(n)&&le(n))return!0;return!1}),Y=()=>{if(!B){je();return}O!==null&&clearTimeout(O),O=window.setTimeout(()=>{O=null,Ot()},220)},En=()=>{[180,800,1800,3200].forEach(e=>{const t=window.setTimeout(()=>{be.delete(t),B&&Ot()},e);be.add(t)})};function Tn(){B=!0,sn(),chrome.storage.local.get([_.THOUGHT_TRANSLATION_MODE],e=>{L=Lt(e[_.THOUGHT_TRANSLATION_MODE]),document.querySelectorAll(R).forEach(t=>{Be(t)}),Y()}),chrome.storage.onChanged.removeListener(Ie),chrome.storage.onChanged.addListener(Ie),!q&&document.body&&(q=new MutationObserver(e=>{bn(e)&&Y()}),q.observe(document.body,{childList:!0,subtree:!0,characterData:!0})),Y(),En()}function Sn(){B=!1,chrome.storage.onChanged.removeListener(Ie),q&&(q.disconnect(),q=null),O!==null&&(clearTimeout(O),O=null),be.forEach(e=>clearTimeout(e)),be.clear(),je(),document.getElementById(De)?.remove()}export{_ as S,It as _,Sn as a,_n as b,wn as c,Mt as d,Tn as e,yn as s};
