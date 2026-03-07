const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/vendor-mermaid-B7he9oCH.js","assets/vendor-react-B-sxFqXu.js"])))=>i.map(i=>d[i]);
const S={FOLDER_DATA:"gvFolderData",LATEX_FIXER_ENABLED:"geminimate_latex_enabled",MARKDOWN_REPAIR_ENABLED:"geminimate_markdown_enabled",MERMAID_RENDER_ENABLED:"geminimate_mermaid_enabled",SVG_RENDER_ENABLED:"geminimate_svg_render_enabled",THOUGHT_TRANSLATION_ENABLED:"geminimate_thought_translation_enabled",FORMULA_COPY_ENABLED:"geminimate_formula_copy_enabled",FORMULA_COPY_FORMAT:"geminimate_formula_copy_format",WATERMARK_REMOVER_ENABLED:"geminiWatermarkRemoverEnabled",QUOTE_REPLY_ENABLED:"gvQuoteReplyEnabled",BOTTOM_CLEANUP_ENABLED:"geminimate_bottom_cleanup_enabled",DEBUG_MODE:"geminimate_debug_mode",DEBUG_LOGS:"geminimate_debug_logs",DEBUG_FILE_LOG_ENABLED:"geminimate_debug_file_log_enabled",DEBUG_CACHE_CAPTURE_ENABLED:"geminimate_debug_cache_capture_enabled",LANGUAGE:"geminimate_language",TIMELINE_ENABLED:"geminimate_timeline_enabled",TIMELINE_WIDTH:"geminimate_timeline_width",TIMELINE_AUTO_HIDE:"geminimate_timeline_auto_hide",TIMELINE_STARRED_MESSAGES:"geminiTimelineStarred",TIMELINE_SCROLL_MODE:"geminiTimelineScrollMode",GEMINI_CHAT_WIDTH:"geminimate_chat_width",GEMINI_EDIT_INPUT_WIDTH:"geminimate_edit_input_width",GEMINI_SIDEBAR_WIDTH:"geminimate_sidebar_width",GEMINI_SIDEBAR_AUTO_HIDE:"geminimate_sidebar_auto_hide",GEMINI_ZOOM_LEVEL:"geminimate_zoom_level",GEMINI_FONT_SIZE_SCALE:"geminimate_font_size_scale",GEMINI_FONT_WEIGHT:"geminimate_font_weight",GEMINI_FONT_FAMILY:"geminimate_font_family",GEMINI_SANS_PRESET:"geminimate_sans_preset",GEMINI_SERIF_PRESET:"geminimate_serif_preset",GEMINI_CUSTOM_FONTS:"geminimate_custom_fonts",GEMINI_LETTER_SPACING:"geminimate_letter_spacing",GEMINI_LINE_HEIGHT:"geminimate_line_height",GEMINI_PARAGRAPH_INDENT_ENABLED:"geminimate_paragraph_indent_enabled",GEMINI_EMPHASIS_MODE:"geminimate_emphasis_mode",WORD_RESPONSE_EXPORT_ENABLED:"geminimate_word_response_export_enabled",WORD_RESPONSE_EXPORT_MODE:"geminimate_word_response_export_mode",GV_FOLDER_FILTER_USER_ONLY:"gvFolderFilterUserOnly",GV_FOLDER_TREE_INDENT:"gvFolderTreeIndent",GV_ACCOUNT_ISOLATION_ENABLED:"gvAccountIsolationEnabled",GV_ACCOUNT_ISOLATION_ENABLED_GEMINI:"gvAccountIsolationEnabledGemini",GV_ACCOUNT_PROFILE_MAP:"gvAccountProfileMap"},ce=2e3,de=`${S.DEBUG_LOGS}:`,Oe=e=>{if(e!==void 0)try{return JSON.parse(JSON.stringify(e))}catch{return String(e)}};class N{static instance;enabled=!1;initialized=!1;context="unknown";logsStorageKey=`${de}unknown`;logs=[];flushTimer=null;storageListener=null;static getInstance(){return N.instance||(N.instance=new N),N.instance}async init(t){if(this.context=t,this.logsStorageKey=`${de}${this.normalizeContext(t)}`,!this.initialized){this.initialized=!0;try{const n=await chrome.storage.local.get([S.DEBUG_MODE,this.logsStorageKey,S.DEBUG_LOGS]);this.enabled=n[S.DEBUG_MODE]===!0;const r=n[this.logsStorageKey]??n[S.DEBUG_LOGS];this.logs=Array.isArray(r)?r.slice(-ce).map(o=>Oe(o)):[]}catch(n){console.warn("[GeminiMate][Debug] Failed to initialize debug service from storage",n),this.enabled=!1,this.logs=[]}this.storageListener=(n,r)=>{if(r!=="local")return;const o=n[S.DEBUG_MODE];o&&(this.enabled=o.newValue===!0,console.info("[GeminiMate][Debug] Debug mode changed",{enabled:this.enabled}),this.enabled&&this.log("debug","mode-enabled",{context:this.context}))},chrome.storage.onChanged.addListener(this.storageListener),console.info("[GeminiMate][Debug] Debug service initialized",{context:this.context,enabled:this.enabled})}}isEnabled(){return this.enabled}log(t,n,r){if(!this.enabled)return;const o={id:`${Date.now()}-${Math.random().toString(36).slice(2,8)}`,ts:new Date().toISOString(),source:t,action:n,context:this.context,detail:Oe(r)};this.logs.push(o),this.logs.length>ce&&(this.logs=this.logs.slice(-ce)),this.forwardToBackground(o),this.scheduleFlush()}async clearLogs(){this.logs=[];try{const t=await chrome.storage.local.get(null),n=Object.keys(t).filter(r=>r.startsWith(de));n.length>0&&await chrome.storage.local.remove(n),await chrome.storage.local.set({[S.DEBUG_LOGS]:[]})}catch(t){console.warn("[GeminiMate][Debug] Failed to clear debug logs",t)}}scheduleFlush(){this.flushTimer===null&&(this.flushTimer=setTimeout(()=>{this.flushTimer=null,this.flush()},250))}async flush(){try{await chrome.storage.local.set({[this.logsStorageKey]:this.logs})}catch(t){console.warn("[GeminiMate][Debug] Failed to flush debug logs",t)}}normalizeContext(t){const n=t.trim().toLowerCase().replace(/[^a-z0-9_-]+/g,"-");return n.length>0?n:"unknown"}forwardToBackground(t){try{if(!chrome?.runtime?.id)return;const n={type:"gm.debug.ingest",entry:t};chrome.runtime.sendMessage(n)}catch{}}}const ut=N.getInstance(),mt="modulepreload",gt=function(e){return"/"+e},Ie={},ht=function(t,n,r){let o=Promise.resolve();if(n&&n.length>0){let d=function(l){return Promise.all(l.map(u=>Promise.resolve(u).then(m=>({status:"fulfilled",value:m}),m=>({status:"rejected",reason:m}))))};document.getElementsByTagName("link");const s=document.querySelector("meta[property=csp-nonce]"),i=s?.nonce||s?.getAttribute("nonce");o=d(n.map(l=>{if(l=gt(l),l in Ie)return;Ie[l]=!0;const u=l.endsWith(".css"),m=u?'[rel="stylesheet"]':"";if(document.querySelector(`link[href="${l}"]${m}`))return;const f=document.createElement("link");if(f.rel=u?"stylesheet":mt,u||(f.as="script"),f.crossOrigin="",f.href=l,i&&f.setAttribute("nonce",i),document.head.appendChild(f),u)return new Promise((ie,le)=>{f.addEventListener("load",ie),f.addEventListener("error",()=>le(new Error(`Unable to preload CSS for ${l}`)))})}))}function a(s){const i=new Event("vite:preloadError",{cancelable:!0});if(i.payload=s,window.dispatchEvent(i),!i.defaultPrevented)throw s}return o.then(s=>{for(const i of s||[])i.status==="rejected"&&a(i.reason);return t().catch(a)})},he="gm-mermaid-style",b="gm-mermaid-diagram",w="gm-mermaid-toggle",h="gm-mermaid-toggle-button",Se="gm-code-download-button",He="gm-code-share-button",_="gm-code-action-button",y="data-gm-mermaid-host",F="data-gm-code-download",te="data-gm-code-share",se="data-gm-mermaid-view",fe="data-gm-mermaid-code",Y="data-gm-mermaid-processing",pe="data-gm-mermaid-font";let V=null,De=!1,ne=!1,I=!1,Z=!0,M=null,A=null;const re=new Set;let q=null,J=null;const Xe="'Google Sans Flex', 'Google Sans', 'Helvetica Neue', Roboto, 'PingFang SC', 'Noto Sans CJK SC', 'Microsoft YaHei', sans-serif";let p=Xe;const Re=new WeakSet,$e=new WeakSet,ke=new WeakSet,Ge=new WeakSet,ft=new Set(["代码段","代码","代码块","示例","示例代码","code","code snippet","snippet","example","sample","text","plain","plaintext","raw","output","result"]),pt=["%%","graph","flowchart","sequenceDiagram","classDiagram","stateDiagram","erDiagram","gantt","pie","gitGraph","journey","mindmap","timeline","zenuml","quadrantChart","requirementDiagram","requirement","sankey-beta","sankey","C4Context","C4Container","C4Component","C4Dynamic","C4Deployment","xychart-beta","xychart","block-beta","block","packet-beta","packet","architecture-beta","architecture","kanban","radar-beta","treemap"],bt={bash:"sh",shell:"sh",sh:"sh",zsh:"sh",powershell:"ps1",ps1:"ps1",python:"py",py:"py",javascript:"js",js:"js",typescript:"ts",ts:"ts",tsx:"tsx",jsx:"jsx",json:"json",html:"html",css:"css",scss:"scss",sass:"sass",less:"less",markdown:"md",md:"md",yaml:"yml",yml:"yml",xml:"xml",sql:"sql",c:"c",cpp:"cpp","c++":"cpp",csharp:"cs",cs:"cs",java:"java",kotlin:"kt",go:"go",rust:"rs",ruby:"rb",php:"php",swift:"swift",dart:"dart",mermaid:"mmd"},Et=`
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 3a1 1 0 0 1 1 1v8.59l2.3-2.29a1 1 0 1 1 1.4 1.41l-4 4a1 1 0 0 1-1.4 0l-4-4a1 1 0 0 1 1.4-1.41L11 12.59V4a1 1 0 0 1 1-1Zm-7 14a1 1 0 0 1 1 1v1h12v-1a1 1 0 1 1 2 0v2a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-2a1 1 0 0 1 1-1Z" fill="currentColor"/>
  </svg>
`,yt=`
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M14 4h6v6h-2V7.41l-7.29 7.3-1.42-1.42L16.59 6H14V4Z" fill="currentColor"/>
    <path d="M5 5h6v2H7v10h10v-4h2v6H5V5Z" fill="currentColor"/>
  </svg>
`,c=(e,t)=>{ut.log("mermaid",e,t),console.info("[GM-TRACE][Mermaid]",e,t??{})},Ye=e=>e.replace(/[\u00A0\u2002\u2003\u2009\u3000]/g," ").replace(/[\u200B\u200C\u200D\uFEFF]/g,""),Ze=()=>Xe,_t=()=>{const e=Ze();return e===p?!1:(p=e,ne=!1,!0)},wt=async()=>{if(!document.fonts?.ready)return;const e=document.fonts.ready;await Promise.race([e,new Promise(t=>{window.setTimeout(t,1200)})])},vt=()=>document.body.classList.contains("dark-theme")||document.body.classList.contains("dark")||document.body.getAttribute("data-theme")==="dark"||document.body.getAttribute("data-color-scheme")==="dark"||document.documentElement.classList.contains("dark")||document.documentElement.classList.contains("dark-theme")||document.documentElement.getAttribute("data-theme")==="dark"||document.documentElement.getAttribute("data-color-scheme")==="dark"||window.matchMedia("(prefers-color-scheme: dark)").matches,Tt=e=>e?ft.has(e.toLowerCase()):!0,St=e=>{const t=Ye(e).trim();if(t.length<20||!pt.some(s=>t.toLowerCase().startsWith(s.toLowerCase())))return!1;const r=t.split(`
`).filter(s=>s.trim().length>0);if(r.length<2)return!1;const o=r[r.length-1].trim();return!["-->","---","-.","==>",":::","[","(","{","|","&",","].some(s=>o.endsWith(s))},At=()=>{if(document.getElementById(he))return;const e=document.createElement("style");e.id=he,e.textContent=`
    .${w} {
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

    .${w} {
      order: 1;
      flex: 0 0 auto;
    }

    .${He} {
      order: 2;
      flex: 0 0 auto;
    }

    .${Se} {
      order: 3;
      flex: 0 0 auto;
    }

    .code-block-decoration .buttons > .copy-button,
    .code-block-decoration .buttons > button.copy-button {
      order: 4;
      flex: 0 0 auto;
    }

    .${h} {
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

    .${h}.active {
      background: rgba(59, 130, 246, 0.16);
      color: #1d4ed8;
    }

    .${_} {
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

    .${_}:hover {
      background: rgba(148, 163, 184, 0.14);
      color: var(--gem-sys-color--on-surface, #111827);
    }

    .${_}:disabled {
      cursor: not-allowed;
      opacity: 0.45;
    }

    .${_} svg {
      width: 18px;
      height: 18px;
      display: block;
      fill: currentColor;
    }

    .${b} {
      display: none;
      padding: 16px 18px 18px;
      overflow: auto;
      text-align: center;
      cursor: zoom-in;
      border-top: 1px solid rgba(148, 163, 184, 0.16);
    }

    .${b} svg {
      max-width: 100%;
      height: auto;
      overflow: visible !important;
    }

    .${b} .label,
    .${b} .edgeLabel,
    .${b} foreignObject,
    .${b} foreignObject * {
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

    .dark-theme .${w},
    html.dark .${w},
    body.dark .${w} {
      background: rgba(15, 23, 42, 0.72);
      border-color: rgba(148, 163, 184, 0.18);
    }

    .dark-theme .${h},
    html.dark .${h},
    body.dark .${h} {
      color: rgba(226, 232, 240, 0.88);
    }

    .dark-theme .${h}.active,
    html.dark .${h}.active,
    body.dark .${h}.active {
      color: #93c5fd;
      background: rgba(59, 130, 246, 0.2);
    }

    .dark-theme .${_},
    html.dark .${_},
    body.dark .${_} {
      color: rgba(226, 232, 240, 0.88);
    }
  `,document.head.appendChild(e)},R=e=>{const t=e.closest(".code-block, code-block");if(!t)return null;const n=[e,e.closest("pre"),t];for(const s of n){if(!s)continue;const i=s.getAttribute("data-language")||s.getAttribute("data-lang")||s.getAttribute("lang");if(i?.trim())return i.trim().toLowerCase();const l=(s instanceof HTMLElement?s.className:s.getAttribute("class")||"").match(/(?:language|lang)-([a-z0-9+#._-]+)/i);if(l?.[1])return l[1].toLowerCase()}const r=t.querySelector(".code-block-decoration");return r&&r.querySelector(":scope > span")?.textContent?.trim().toLowerCase()||null},Je=async()=>{if(V)return V;if(De)return null;try{return V=(await ht(()=>import("./vendor-mermaid-B7he9oCH.js").then(t=>t.m),__vite__mapDeps([0,1]))).default,V}catch(e){return De=!0,c("load-failed",{error:String(e)}),null}},Qe=async()=>{if(ne)return!0;const e=await Je();if(!e)return!1;const t=vt();return p=Ze(),e.initialize({startOnLoad:!1,theme:t?"dark":"default",securityLevel:"loose",fontFamily:p,themeVariables:{fontFamily:p,darkMode:t,background:t?"#0b1020":"#ffffff",primaryColor:t?"#1f2937":"#eceff5",primaryTextColor:t?"#e5e7eb":"#1f2937",secondaryColor:t?"#111827":"#f8fafc",tertiaryColor:t?"#0f172a":"#ffffff",lineColor:t?"#cbd5e1":"#374151",clusterBkg:t?"#111827":"#e0f2fe",clusterBorder:t?"#94a3b8":"#0f766e",edgeLabelBackground:t?"#111827":"#f8fafc"},flowchart:{htmlLabels:!1,curve:"basis"},state:{useMaxWidth:!1},sequence:{useMaxWidth:!1},logLevel:5}),ne=!0,!0},U=e=>e.replace(/\r\n/g,`
`).replace(/\r/g,`
`),et=e=>e.closest(".code-block, code-block"),xt=e=>e.querySelector(".code-block-decoration"),Ae=e=>{const t=xt(e);if(!t)return null;const n=t.querySelector(":scope > .buttons");if(n instanceof HTMLElement)return n;const r=document.createElement("div");return r.className="buttons",t.appendChild(r),r},xe=e=>e.querySelector(".code-block-decoration .buttons > .copy-button, .code-block-decoration .buttons > button.copy-button"),L=e=>e.querySelector('code[data-test-id="code-content"]')??e.querySelector(".formatted-code-block-internal-container code")??e.querySelector("pre code")??e.querySelector("code.code-container"),Le=(e,t)=>e.querySelector(".formatted-code-block-internal-container")??t?.closest(".formatted-code-block-internal-container")??t?.closest("pre")??t??null,v=e=>e.querySelector(`.${b}`),Lt=e=>{const t=e.querySelector("defs")??e.insertBefore(document.createElementNS("http://www.w3.org/2000/svg","defs"),e.firstChild);let n=t.querySelector('style[data-gm-mermaid-font="1"]');n||(n=document.createElementNS("http://www.w3.org/2000/svg","style"),n.setAttribute("data-gm-mermaid-font","1"),t.appendChild(n)),n.textContent=`
    text, tspan, .label, .nodeLabel, .edgeLabel, foreignObject, foreignObject * {
      font-family: ${p} !important;
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
  `},tt=e=>{const t=e.cloneNode(!0);if(!(t instanceof SVGElement))return e.outerHTML;t.getAttribute("xmlns")||t.setAttribute("xmlns","http://www.w3.org/2000/svg"),t.getAttribute("xmlns:xlink")||t.setAttribute("xmlns:xlink","http://www.w3.org/1999/xlink"),t.style.setProperty("font-family",p,"important"),t.style.setProperty("overflow","visible","important");const n=t.querySelector("defs")??t.insertBefore(document.createElementNS("http://www.w3.org/2000/svg","defs"),t.firstChild),r=document.createElementNS("http://www.w3.org/2000/svg","style");return r.textContent=`
    text, tspan, .label, .nodeLabel, .edgeLabel, foreignObject, foreignObject * {
      font-family: ${p} !important;
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
  `,n.appendChild(r),new XMLSerializer().serializeToString(t)},Pe=e=>{const t=e.querySelector("svg");t instanceof SVGElement&&(t.style.setProperty("font-family",p,"important"),t.style.setProperty("overflow","visible","important"),Lt(t),t.querySelectorAll(".label, .edgeLabel, foreignObject, foreignObject *").forEach(n=>{if(n instanceof SVGElement){n.style.setProperty("overflow","visible","important");return}n instanceof HTMLElement&&(n.style.setProperty("overflow","visible","important"),n.style.setProperty("line-height","1.25","important"))}))},qe=(e,t)=>{Re.has(e)||(e.addEventListener("click",n=>{n.preventDefault(),n.stopPropagation(),Ct(t)}),Re.add(e))},W=(e,t,n)=>{ke.has(e)||(e.addEventListener("click",r=>{r.preventDefault(),r.stopPropagation(),it(t,n)}),ke.add(e))},be=e=>{Ge.has(e)||(e.addEventListener("click",()=>{e.querySelector("svg")&&It(e.innerHTML)}),Ge.add(e))},Fe=()=>new Date().toISOString().replace(/[:.]/g,"-").replace("T","_").replace("Z",""),nt=e=>{const t=(e??"").trim().toLowerCase();return t?bt[t]??"txt":"txt"},Ue=(e,t,n)=>{const r=new Blob(e,{type:n}),o=URL.createObjectURL(r),a=document.createElement("a");a.href=o,a.download=t,a.style.display="none",document.body.appendChild(a),a.click(),a.remove(),window.setTimeout(()=>URL.revokeObjectURL(o),1e3)},Ee=e=>e.getAttribute(se)==="code"?"code":"diagram",j=e=>{const t=e.querySelector(`[${F}="1"]`);if(!t)return;const n=L(e);U(n?.textContent||"");const r=R(n??e),a=e.getAttribute(y)==="1"&&Ee(e)==="diagram",s=v(e)?.querySelector("svg");if(a&&s instanceof SVGElement){t.disabled=!1,t.title="下载 Mermaid 图像",t.setAttribute("aria-label","下载 Mermaid 图像");return}t.disabled=!1;const i=nt(r);t.title=`下载代码 (.${i})`,t.setAttribute("aria-label",`下载代码 (.${i})`)},Ct=e=>{const t=L(e),n=U(t?.textContent||""),r=R(t??e),o=e.getAttribute(y)==="1",a=o&&Ee(e)==="diagram",s=v(e)?.querySelector("svg");if(a&&s instanceof SVGElement){const u=tt(s),m=`geminimate-mermaid-${Fe()}.svg`;Ue([u],m,"image/svg+xml;charset=utf-8"),c("download-diagram",{filename:m,view:"diagram"});return}if(!n.trim()){c("download-skipped-empty",{language:r,mermaidHost:o});return}const i=nt(r),d=`geminimate-code-${Fe()}.${i}`;Ue([n],d,i==="json"?"application/json;charset=utf-8":i==="svg"?"image/svg+xml;charset=utf-8":"text/plain;charset=utf-8"),c("download-code",{filename:d,language:r,view:o?Ee(e):"code"})},ue=(e,t)=>{if(!e.trim())return c("share-window-open-failed",{reason:"empty-html"}),!1;try{const n=chrome.runtime.getURL("sandbox/runner.html"),r=window.open(n,"_blank");if(!r)return c("share-window-open-failed",{reason:"window-open-blocked"}),!1;const o=a=>{a.source!==r||a.data?.type!=="RUNNER_READY"||(window.removeEventListener("message",o),r.postMessage({type:"PREVIEW_HTML",html:e,title:t},"*"),c("share-window-opened",{title:t,htmlLength:e.length}))};return window.addEventListener("message",o),!0}catch(n){return c("share-window-open-failed",{reason:"send-message-exception",error:String(n)}),!1}},me=(e,t,n)=>`<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>${t}</title>
  </head>
  <body style="${n}">${e}</body>
</html>`,rt=e=>/<\s*svg\b/i.test(e),ot=e=>/<\s*(?:!doctype|html|head|body|script|style|div|span|main|section|article|canvas|iframe)\b/i.test(e),Nt=e=>{const t=L(e),n=U(t?.textContent||""),r=R(t??e),o=e.getAttribute(y)==="1",a=v(e)?.querySelector("svg");if(o&&a instanceof SVGElement){const d=tt(a),l=me(d,"Mermaid Share","margin:0;padding:24px;background:#0b1020;display:flex;justify-content:center;align-items:flex-start;");ue(l,"Mermaid Share");return}if(!n.trim())return;const s=r==="svg"||rt(n),i=r==="html"||ot(n);if(c("share-detect",{language:r,isMermaidHost:o,isSvgSource:s,isHtmlSource:i,sourceLength:n.length}),i){const d=/<\s*(?:!doctype|html|head|body)\b/i.test(n)?n:me(n,"HTML Share","margin:0;padding:24px;background:#f8fafc;color:#0f172a;");ue(d,"HTML Share");return}if(s){const d=me(n,"SVG Share","margin:0;padding:24px;background:#f8fafc;display:flex;justify-content:center;");ue(d,"SVG Share");return}},at=(e,t,n,r)=>{const o=document.createElement("button");return o.type="button",o.className=`${_} ${r}`,o.innerHTML=t,o.title=e,o.setAttribute("aria-label",e),o.setAttribute(n,"1"),o},je=(e,t)=>{$e.has(e)||(e.addEventListener("click",n=>{n.preventDefault(),n.stopPropagation(),Nt(t)}),$e.add(e))},B=e=>{const t=e.querySelector(`[${te}="1"]`);if(!t)return;const n=L(e),r=U(n?.textContent||""),o=R(n??e),a=e.getAttribute(y)==="1",s=v(e)?.querySelector("svg")instanceof SVGElement,i=a&&s||o==="html"||o==="svg"||ot(r)||rt(r);t.disabled=!i,t.title=i?"分享到新窗口":"当前代码类型不支持分享预览",t.setAttribute("aria-label",t.title)},ye=e=>{const t=Ae(e);if(!t)return;let n=t.querySelector(`[${te}="1"]`);if(n)je(n,e);else{const r=xe(e);n=at("分享到新窗口",yt,te,He),je(n,e),r?t.insertBefore(n,r):t.appendChild(n),c("download-button-inserted",{language:R(L(e)??e)})}B(e)},_e=e=>{const t=Ae(e);if(!t)return;let n=t.querySelector(`[${F}="1"]`);if(n)qe(n,e);else{const r=xe(e);n=at("下载代码",Et,F,Se),qe(n,e),r?t.insertBefore(n,r):t.appendChild(n)}j(e),B(e)},st=e=>e.querySelector(`.${w}`),it=(e,t)=>{const n=v(e),r=Le(e,L(e)??void 0),o=t==="diagram"&&n?"diagram":"code";e.setAttribute(se,o),n&&(n.style.display=o==="diagram"?"block":"none"),r&&(r.style.display=o==="diagram"?"none":""),e.querySelectorAll(`.${h}`).forEach(s=>{s.classList.toggle("active",s.dataset.view===o)}),j(e),c("view-updated",{view:o,mermaidHost:e.getAttribute(y)==="1"})},Mt=(e,t)=>{let n=v(e);return n?(be(n),n):(n=document.createElement("div"),n.className=b,be(n),t.parentElement?.insertBefore(n,t),n)},Be=e=>{const t=Ae(e);if(!t)return;const n=st(e);if(n){const l=n.querySelector(`.${h}[data-view="diagram"]`),u=n.querySelector(`.${h}[data-view="code"]`);if(l&&u){W(l,e,"diagram"),W(u,e,"code");return}n.remove()}const r=document.createElement("div");r.className=w;const o=document.createElement("button");o.type="button",o.className=`${h} active`,o.dataset.view="diagram",o.textContent="图表";const a=document.createElement("button");a.type="button",a.className=h,a.dataset.view="code",a.textContent="代码",W(o,e,"diagram"),W(a,e,"code"),r.append(o,a);const s=t.querySelector(`[${F}="1"]`),i=xe(e),d=s??i;d?t.insertBefore(r,d):t.appendChild(r)},Ot=(e,t)=>{const n=t.length>240?`${t.slice(0,240)}...`:t;e.innerHTML=`
    <div class="gm-mermaid-render-error">
      <strong>Mermaid 渲染失败</strong>
      <div>${n}</div>
      <div style="margin-top:8px;font-size:12px;">你仍然可以切回代码视图或直接下载源码。</div>
    </div>
  `},we=(e,t)=>{v(e)?.remove(),st(e)?.remove(),t?(e.querySelector(`[${te}="1"]`)?.remove(),e.querySelector(`[${F}="1"]`)?.remove()):(j(e),B(e));const o=Le(e,L(e)??void 0);o&&(o.style.display=""),e.removeAttribute(y),e.removeAttribute(se),e.removeAttribute(fe),e.removeAttribute(pe),e.removeAttribute(Y)},Q=()=>{if(J&&(document.removeEventListener("keydown",J),J=null),!q)return;const e=q;e.classList.remove("visible"),q=null,window.setTimeout(()=>e.remove(),160)},It=e=>{if(q)return;const t=document.createElement("div");t.className="gm-mermaid-modal";const n=document.createElement("button");n.className="gm-mermaid-modal-close",n.type="button",n.textContent="×";const r=document.createElement("div");r.className="gm-mermaid-modal-content",r.innerHTML=e,t.append(n,r),document.body.appendChild(t),q=t,n.addEventListener("click",Q),t.addEventListener("click",a=>{a.target===t&&Q()});const o=a=>{a.key==="Escape"&&Q()};J=o,document.addEventListener("keydown",o),requestAnimationFrame(()=>t.classList.add("visible"))},Dt=async(e,t)=>{const n=Ye(t),r=et(e);if(!r)return;const o=_t(),s=(r.getAttribute(pe)??"")!==p,i=v(r),d=i?.querySelector("svg")instanceof SVGElement;if(r.getAttribute(fe)===n&&!o&&!s&&d){ye(r),_e(r),Be(r),i&&(be(i),Pe(i)),j(r),B(r);return}if(r.getAttribute(Y)==="1")return;const l=Le(r,e);if(l){r.setAttribute(Y,"1");try{if(await wt(),!await Qe()){c("load-unavailable");return}const m=await Je();if(!m)return;const f=Mt(r,l);ye(r),_e(r),Be(r),r.setAttribute(y,"1");const ie=`gm-mermaid-${Math.random().toString(36).slice(2,10)}`;try{const C=await m.render(ie,n),dt=typeof C=="string"?C:C.svg;f.innerHTML=dt,Pe(f),c("rendered",{codeLength:n.length})}catch(C){Ot(f,String(C)),c("render-failed",{error:String(C)})}r.setAttribute(fe,n),r.setAttribute(pe,p);const le=r.getAttribute(se);it(r,le==="code"?"code":"diagram")}finally{r.removeAttribute(Y)}}},Ce=()=>{if(!I)return;const e=document.querySelectorAll('code[data-test-id="code-content"], .formatted-code-block-internal-container code, .code-block pre code, code.code-container'),t=new Set;c("scan-start",{codeCount:e.length,renderEnabled:Z}),e.forEach(n=>{const r=et(n);if(!r)return;t.add(r),ye(r),_e(r);const o=U(n.textContent||""),a=R(n),s=r.closest('model-response, .model-response, [data-message-author-role="model"]'),i=!s||s.querySelector("message-actions")!==null;if(Z&&i&&(a==="mermaid"||Tt(a)&&St(o))){Dt(n,o);return}r.getAttribute(y)==="1"?(we(r,!1),c("mermaid-host-rolled-back",{language:a,codeLength:o.length})):(j(r),B(r))}),document.querySelectorAll(`[${y}="1"]`).forEach(n=>{t.has(n)||we(n,!1)}),c("scan-end",{activeHostCount:t.size,renderEnabled:Z})},Rt=()=>{document.querySelectorAll(".code-block, code-block").forEach(e=>{we(e,!0)})},Ne=()=>{I&&(A!==null&&clearTimeout(A),A=window.setTimeout(()=>{A=null,Ce()},350))},Ve=()=>{[120,700,1600,3e3].forEach(e=>{const t=window.setTimeout(()=>{re.delete(t),I&&(c("warmup-scan",{delay:e}),Ce())},e);re.add(t)})},$t=()=>{M||!document.body||(M=new MutationObserver(e=>{e.some(n=>{const r=n.target instanceof Element?n.target:n.target.parentElement;if(r?.closest(`.${b}, .${w}, .${Se}`))return!1;if(r?.closest(".code-block, code-block, model-response"))return!0;for(const o of Array.from(n.addedNodes))if((o instanceof Element?o:o.parentElement)?.closest(".code-block, code-block, model-response"))return!0;return!1})&&(c("mutation-detected",{count:e.length}),Ne())}),M.observe(document.body,{childList:!0,subtree:!0,characterData:!0}))};async function Yt(){if(I){Ne(),Ve();return}I=!0,At(),$t(),Ce(),Ve(),Qe(),c("start")}function Zt(){M&&(M.disconnect(),M=null),A!==null&&(clearTimeout(A),A=null),re.forEach(e=>clearTimeout(e)),re.clear(),Rt(),Q(),document.getElementById(he)?.remove(),ne=!1,I=!1,c("stop")}function Jt(e){Z=e,c("render-toggle",{enabled:e}),Ne()}const ve="gm-thought-translation-style",g="gm-thought-translation",G="data-gm-thought-translated",P="data-gm-thought-processing",ee="data-gm-thought-source",E="data-gm-thought-error",lt=['[data-test-id="thoughts-content"]',".thoughts-content",".thoughts-content-expanded",".thoughts-streaming",".thoughts-container"],kt=[":scope .markdown.markdown-main-panel",":scope > .markdown.markdown-main-panel",":scope .message-container message-content .markdown.markdown-main-panel",":scope .message-container message-content .markdown",":scope message-content .markdown.markdown-main-panel",":scope message-content .markdown",":scope .thought-content"],z=2800,Gt=120,Pt=450,qt='[data-test-id="thoughts-content"], .thoughts-content, .thoughts-content-expanded, .thoughts-streaming, .thoughts-container, .thoughts-wrapper',Ft=1,We="__GM_THOUGHT_NL_9F2E__";let D=!0,O=null,x=null;const oe=new Set,ze=new Map,Ke=new Map,$=new WeakMap,k=new WeakMap,ge=new WeakMap;let K=0;const T=(e,t)=>{},Ut=()=>{if(document.getElementById(ve))return;const e=document.createElement("style");e.id=ve,e.textContent=`
    .${g} {
      margin-top: 12px;
      padding: 12px 14px;
      border-radius: 14px;
      border: 1px solid rgba(59, 130, 246, 0.18);
      background: rgba(59, 130, 246, 0.06);
      color: inherit;
      line-height: 1.72;
      white-space: pre-wrap !important;
      overflow-wrap: anywhere !important;
      word-break: break-word !important;
      min-width: 0;
      width: 100%;
      max-width: 100%;
    }

    .${g}::before {
      content: '思维链翻译';
      display: block;
      margin-bottom: 8px;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.08em;
      color: #2563eb;
    }

    .${g}[${E}="1"] {
      border-color: rgba(239, 68, 68, 0.24);
      background: rgba(239, 68, 68, 0.06);
    }

    .${g}[${E}="1"]::before {
      content: '思维链翻译失败';
      color: #dc2626;
    }

    /* ── Right-side side-by-side layout ── */
    /* When a translation block is present, show thought content and translation
       in a two-column flex row so the translation appears to the RIGHT. */
    .thoughts-content-expanded:has(.${g}),
    .thoughts-streaming:has(.${g}),
    .thoughts-content:has(.${g}) {
      display: flex !important;
      flex-direction: row !important;
      align-items: flex-start !important;
      gap: 20px !important;
    }

    /* Thought text takes the remaining space on the left */
    .thoughts-content-expanded > :not(.${g}),
    .thoughts-streaming > :not(.${g}),
    .thoughts-content > :not(.${g}) {
      flex: 1 1 0 !important;
      min-width: 0 !important;
    }

    /* Translation block is fixed-width on the right */
    .thoughts-content-expanded > .${g},
    .thoughts-streaming > .${g},
    .thoughts-content > .${g} {
      flex: 0 0 38% !important;
      max-width: 38% !important;
      margin-top: 0 !important;
      position: sticky;
      top: 8px;
      align-self: flex-start;
    }
  `,document.head.appendChild(e)},ae=e=>e.replace(/\u00a0/g," ").replace(/\r/g,"").replace(/[ \t]+\n/g,`
`).replace(/\n{3,}/g,`

`).trim(),jt=e=>{const t=e.split(/\n{2,}/),n=[];let r="";return t.forEach(o=>{const a=r?`${r}

${o}`:o;if(a.length<=z){r=a;return}if(r&&n.push(r),o.length<=z){r=o;return}for(let s=0;s<o.length;s+=z)n.push(o.slice(s,s+z));r=""}),r&&n.push(r),n.length>0?n:[e]},Bt=e=>e.matches(".thoughts-content-expanded")?!0:e.getAttribute("aria-hidden")==="true"||e.hasAttribute("hidden")?!1:e.offsetParent!==null||e.getClientRects().length>0?!0:e.closest(".thoughts-wrapper, .thoughts-container, thoughts-entry")!==null,Vt=e=>{if(e.matches(".markdown.markdown-main-panel"))return e;const t=kt.flatMap(a=>Array.from(e.querySelectorAll(a))).filter(a=>!a.closest(`.${g}`));let n=null,r=0;const o=a=>{const s=typeof a.innerText=="string"&&a.innerText.length>0?a.innerText:a.textContent||"";return ae(s)};return t.forEach(a=>{const s=o(a);s&&s.length>r&&(n=a,r=s.length)}),n},Wt=()=>{const e=new Set;lt.forEach(o=>{document.querySelectorAll(o).forEach(a=>{e.add(a)})}),document.querySelectorAll(".thoughts-container .markdown.markdown-main-panel").forEach(o=>{const a=o.closest('[data-test-id="thoughts-content"], .thoughts-content, .thoughts-container')??o;e.add(a)});const t=Array.from(e).filter(Bt),n=t.filter(o=>!t.some(a=>a!==o&&o.contains(a))),r=n.filter(o=>o.matches(".thoughts-content-expanded"));return r.length>0?r:n},zt=async e=>{const t=ae(e);if(!t)return"";const n=ze.get(t);if(n)return n;const r=jt(t),o=[];for(const s of r){const i=Ke.get(s);if(i){o.push(i);continue}const d=s.replace(/\n/g,` ${We} `),l=await chrome.runtime.sendMessage({type:"gm.translateThought",text:d,targetLang:"zh-CN"});if(!l?.ok)throw new Error(l?.error||"translation_failed");const u=new RegExp(`\\s*${We}\\s*`,"g"),m=l.translatedText.replace(u,`
`);Ke.set(s,m),o.push(m)}const a=ae(o.join(`

`));return ze.set(t,a),a},Kt=e=>{const t=e.querySelector(`:scope > .${g}`);if(t instanceof HTMLDivElement)return t;const n=document.createElement("div");return n.className=g,e.appendChild(n),n},Me=()=>{document.querySelectorAll(`.${g}`).forEach(e=>e.remove()),lt.forEach(e=>{document.querySelectorAll(e).forEach(t=>{t.removeAttribute(G),t.removeAttribute(P),t.removeAttribute(ee),t.removeAttribute(E)})})},ct=()=>{if(!D){Me();return}const e=Wt();T("thought-container-scan",{count:e.length}),document.querySelectorAll(`.${g}`).forEach(t=>{const n=t.parentElement;n&&!e.includes(n)&&(t.remove(),n.removeAttribute(G),n.removeAttribute(P),n.removeAttribute(ee),n.removeAttribute(E))}),e.forEach(t=>{T("thought-root-found",{className:t.className});const n=Vt(t);if(!n)return;const r=ae(typeof n.innerText=="string"&&n.innerText.length>0?n.innerText:n.textContent||"");if(T("thought-text-extracted",{length:r.length,preview:r.slice(0,80)}),!r)return;const o=t.getAttribute(ee)??"",a=t.getAttribute(P)==="1",s=r.length-o.length,i=Date.now();if(a){s>=Gt&&k.set(t,r);return}if(K>=Ft){k.set(t,r);return}const d=ge.get(t)??0;if(o&&r!==o&&i-d<Pt)return;const l=Kt(t);if(!a&&t.getAttribute(G)==="1"&&o===r&&l.textContent){T("thought-translation-skipped-already-processed",{sourceLength:r.length});return}const u=($.get(t)??0)+1;$.set(t,u),k.delete(t),ge.set(t,i),K+=1,t.setAttribute(P,"1"),t.setAttribute(ee,r),(!l.textContent||l.textContent==="翻译中...")&&(l.textContent="翻译中..."),l.removeAttribute(E),T("thought-translation-requested",{sourceLength:r.length}),zt(r).then(m=>{$.get(t)===u&&D&&(l.textContent=m||"未返回可用翻译。",l.removeAttribute(E),t.setAttribute(G,"1"),t.removeAttribute(E),T("thought-translation-inserted",{sourceLength:r.length,translatedLength:m.length}))}).catch(m=>{$.get(t)===u&&(l.textContent=`翻译失败：${String(m)}`,l.setAttribute(E,"1"),t.setAttribute(E,"1"),t.removeAttribute(G),T("translate-failed",{sourceLength:r.length}))}).finally(()=>{K=Math.max(0,K-1),$.get(t)===u&&t.removeAttribute(P),k.has(t)&&(ge.delete(t),k.delete(t)),Te()})})},H=e=>(e instanceof Element?e:e.parentElement)?.closest(`.${g}`)!==null,X=e=>(e instanceof Element?e:e.parentElement)?.closest(qt)!==null,Ht=e=>e.some(t=>{if(t.type==="characterData")return H(t.target)?!1:X(t.target);if(H(t.target))return!1;if(X(t.target))return!0;for(const n of Array.from(t.addedNodes))if(!H(n)&&X(n))return!0;for(const n of Array.from(t.removedNodes))if(!H(n)&&X(n))return!0;return!1}),Te=()=>{if(!D){Me();return}x!==null&&clearTimeout(x),x=window.setTimeout(()=>{x=null,ct()},220)},Xt=()=>{[180,800,1800,3200].forEach(e=>{const t=window.setTimeout(()=>{oe.delete(t),D&&ct()},e);oe.add(t)})};function Qt(){D=!0,Ut(),!O&&document.body&&(O=new MutationObserver(e=>{Ht(e)&&Te()}),O.observe(document.body,{childList:!0,subtree:!0,characterData:!0})),Te(),Xt()}function en(){D=!1,O&&(O.disconnect(),O=null),x!==null&&(clearTimeout(x),x=null),oe.forEach(e=>clearTimeout(e)),oe.clear(),Me(),document.getElementById(ve)?.remove()}export{S,ht as _,en as a,Yt as b,Jt as c,ut as d,Qt as e,Zt as s};
