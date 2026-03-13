const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/vendor-mermaid-CCWOkseN.js","assets/vendor-react-B-sxFqXu.js"])))=>i.map(i=>d[i]);
const b={FOLDER_DATA:"gvFolderData",LATEX_FIXER_ENABLED:"geminimate_latex_enabled",MARKDOWN_REPAIR_ENABLED:"geminimate_markdown_enabled",MERMAID_RENDER_ENABLED:"geminimate_mermaid_enabled",SVG_RENDER_ENABLED:"geminimate_svg_render_enabled",THOUGHT_TRANSLATION_ENABLED:"geminimate_thought_translation_enabled",THOUGHT_TRANSLATION_MODE:"geminimate_thought_translation_mode",YOUTUBE_RECOMMENDATION_BLOCKER_ENABLED:"geminimate_youtube_recommendation_blocker_enabled",FORMULA_COPY_ENABLED:"geminimate_formula_copy_enabled",FORMULA_COPY_FORMAT:"geminimate_formula_copy_format",WATERMARK_REMOVER_ENABLED:"geminiWatermarkRemoverEnabled",QUOTE_REPLY_ENABLED:"gvQuoteReplyEnabled",BOTTOM_CLEANUP_ENABLED:"geminimate_bottom_cleanup_enabled",DEBUG_MODE:"geminimate_debug_mode",DEBUG_LOGS:"geminimate_debug_logs",DEBUG_FILE_LOG_ENABLED:"geminimate_debug_file_log_enabled",DEBUG_CACHE_CAPTURE_ENABLED:"geminimate_debug_cache_capture_enabled",LANGUAGE:"geminimate_language",TIMELINE_ENABLED:"geminimate_timeline_enabled",TIMELINE_WIDTH:"geminimate_timeline_width",TIMELINE_AUTO_HIDE:"geminimate_timeline_auto_hide",TIMELINE_STARRED_MESSAGES:"geminiTimelineStarred",TIMELINE_SCROLL_MODE:"geminiTimelineScrollMode",GEMINI_CHAT_WIDTH:"geminimate_chat_width",GEMINI_EDIT_INPUT_WIDTH:"geminimate_edit_input_width",GEMINI_SIDEBAR_WIDTH:"geminimate_sidebar_width",GEMINI_SIDEBAR_AUTO_HIDE:"geminimate_sidebar_auto_hide",GEMINI_ZOOM_LEVEL:"geminimate_zoom_level",GEMINI_FONT_SIZE_SCALE:"geminimate_font_size_scale",GEMINI_FONT_WEIGHT:"geminimate_font_weight",GEMINI_FONT_FAMILY:"geminimate_font_family",GEMINI_SANS_PRESET:"geminimate_sans_preset",GEMINI_SERIF_PRESET:"geminimate_serif_preset",GEMINI_CUSTOM_FONTS:"geminimate_custom_fonts",GEMINI_LETTER_SPACING:"geminimate_letter_spacing",GEMINI_LINE_HEIGHT:"geminimate_line_height",GEMINI_PARAGRAPH_INDENT_ENABLED:"geminimate_paragraph_indent_enabled",GEMINI_EMPHASIS_MODE:"geminimate_emphasis_mode",WORD_RESPONSE_EXPORT_ENABLED:"geminimate_word_response_export_enabled",WORD_RESPONSE_EXPORT_MODE:"geminimate_word_response_export_mode",WORD_RESPONSE_EXPORT_PURE_BODY:"geminimate_word_response_export_pure_body",WORD_RESPONSE_EXPORT_FONT_SIZE_SCALE:"geminimate_word_response_export_font_size_scale",WORD_RESPONSE_EXPORT_LINE_HEIGHT_SCALE:"geminimate_word_response_export_line_height_scale",WORD_RESPONSE_EXPORT_LETTER_SPACING_SCALE:"geminimate_word_response_export_letter_spacing_scale",GV_FOLDER_FILTER_USER_ONLY:"gvFolderFilterUserOnly",GV_FOLDER_TREE_INDENT:"gvFolderTreeIndent",GV_ACCOUNT_ISOLATION_ENABLED:"gvAccountIsolationEnabled",GV_ACCOUNT_ISOLATION_ENABLED_GEMINI:"gvAccountIsolationEnabledGemini",GV_ACCOUNT_PROFILE_MAP:"gvAccountProfileMap"},Ee=2e3,_e=`${b.DEBUG_LOGS}:`,He=e=>{if(e!==void 0)try{return JSON.parse(JSON.stringify(e))}catch{return String(e)}};class k{static instance;enabled=!1;initialized=!1;context="unknown";logsStorageKey=`${_e}unknown`;logs=[];flushTimer=null;storageListener=null;static getInstance(){return k.instance||(k.instance=new k),k.instance}async init(t){if(this.context=t,this.logsStorageKey=`${_e}${this.normalizeContext(t)}`,!this.initialized){this.initialized=!0;try{const n=await chrome.storage.local.get([b.DEBUG_MODE,this.logsStorageKey,b.DEBUG_LOGS]);this.enabled=n[b.DEBUG_MODE]===!0;const r=n[this.logsStorageKey]??n[b.DEBUG_LOGS];this.logs=Array.isArray(r)?r.slice(-Ee).map(o=>He(o)):[]}catch(n){console.warn("[GeminiMate][Debug] Failed to initialize debug service from storage",n),this.enabled=!1,this.logs=[]}this.storageListener=(n,r)=>{if(r!=="local")return;const o=n[b.DEBUG_MODE];o&&(this.enabled=o.newValue===!0,console.info("[GeminiMate][Debug] Debug mode changed",{enabled:this.enabled}),this.enabled&&this.log("debug","mode-enabled",{context:this.context}))},chrome.storage.onChanged.addListener(this.storageListener),console.info("[GeminiMate][Debug] Debug service initialized",{context:this.context,enabled:this.enabled})}}isEnabled(){return this.enabled}log(t,n,r){if(!this.enabled)return;const o={id:`${Date.now()}-${Math.random().toString(36).slice(2,8)}`,ts:new Date().toISOString(),source:t,action:n,context:this.context,detail:He(r)};this.logs.push(o),this.logs.length>Ee&&(this.logs=this.logs.slice(-Ee)),this.forwardToBackground(o),this.scheduleFlush()}async clearLogs(){this.logs=[];try{const t=await chrome.storage.local.get(null),n=Object.keys(t).filter(r=>r.startsWith(_e));n.length>0&&await chrome.storage.local.remove(n),await chrome.storage.local.set({[b.DEBUG_LOGS]:[]})}catch(t){console.warn("[GeminiMate][Debug] Failed to clear debug logs",t)}}scheduleFlush(){this.flushTimer===null&&(this.flushTimer=setTimeout(()=>{this.flushTimer=null,this.flush()},250))}async flush(){try{await chrome.storage.local.set({[this.logsStorageKey]:this.logs})}catch(t){console.warn("[GeminiMate][Debug] Failed to flush debug logs",t)}}normalizeContext(t){const n=t.trim().toLowerCase().replace(/[^a-z0-9_-]+/g,"-");return n.length>0?n:"unknown"}forwardToBackground(t){try{if(!chrome?.runtime?.id)return;const n={type:"gm.debug.ingest",entry:t};chrome.runtime.sendMessage(n)}catch{}}}const Bt=k.getInstance(),Ft="modulepreload",Ut=function(e){return"/"+e},Ke={},jt=function(t,n,r){let o=Promise.resolve();if(n&&n.length>0){let l=function(c){return Promise.all(c.map(p=>Promise.resolve(p).then(u=>({status:"fulfilled",value:u}),u=>({status:"rejected",reason:u}))))};document.getElementsByTagName("link");const s=document.querySelector("meta[property=csp-nonce]"),i=s?.nonce||s?.getAttribute("nonce");o=l(n.map(c=>{if(c=Ut(c),c in Ke)return;Ke[c]=!0;const p=c.endsWith(".css"),u=p?'[rel="stylesheet"]':"";if(document.querySelector(`link[href="${c}"]${u}`))return;const g=document.createElement("link");if(g.rel=p?"stylesheet":Ft,p||(g.as="script"),g.crossOrigin="",g.href=c,i&&g.setAttribute("nonce",i),document.head.appendChild(g),p)return new Promise((D,R)=>{g.addEventListener("load",D),g.addEventListener("error",()=>R(new Error(`Unable to preload CSS for ${c}`)))})}))}function a(s){const i=new Event("vite:preloadError",{cancelable:!0});if(i.payload=s,window.dispatchEvent(i),!i.defaultPrevented)throw s}return o.then(s=>{for(const i of s||[])i.status==="rejected"&&a(i.reason);return t().catch(a)})},Se="gm-mermaid-style",E="gm-mermaid-diagram",w="gm-mermaid-toggle",h="gm-mermaid-toggle-button",ke="gm-code-download-button",ht="gm-code-share-button",T="gm-code-action-button",y="data-gm-mermaid-host",V="data-gm-code-download",ce="data-gm-code-share",he="data-gm-mermaid-view",Ae="data-gm-mermaid-code",oe="data-gm-mermaid-processing",ve="data-gm-mermaid-font";let ee=null,Xe=!1,de=!1,F=!1,ae=!0,$=null,L=null;const me=new Set;let W=null,se=null;const ft="'Google Sans Flex', 'Google Sans', 'Helvetica Neue', Roboto, 'PingFang SC', 'Noto Sans CJK SC', 'Microsoft YaHei', sans-serif";let f=ft;const Ye=new WeakSet,Ze=new WeakSet,Qe=new WeakSet,Je=new WeakSet,Wt=new Set(["代码段","代码","代码块","示例","示例代码","code","code snippet","snippet","example","sample","text","plain","plaintext","raw","output","result"]),zt=["%%","graph","flowchart","sequenceDiagram","classDiagram","stateDiagram","erDiagram","gantt","pie","gitGraph","journey","mindmap","timeline","zenuml","quadrantChart","requirementDiagram","requirement","sankey-beta","sankey","C4Context","C4Container","C4Component","C4Dynamic","C4Deployment","xychart-beta","xychart","block-beta","block","packet-beta","packet","architecture-beta","architecture","kanban","radar-beta","treemap"],Vt={bash:"sh",shell:"sh",sh:"sh",zsh:"sh",powershell:"ps1",ps1:"ps1",python:"py",py:"py",javascript:"js",js:"js",typescript:"ts",ts:"ts",tsx:"tsx",jsx:"jsx",json:"json",html:"html",css:"css",scss:"scss",sass:"sass",less:"less",markdown:"md",md:"md",yaml:"yml",yml:"yml",xml:"xml",sql:"sql",c:"c",cpp:"cpp","c++":"cpp",csharp:"cs",cs:"cs",java:"java",kotlin:"kt",go:"go",rust:"rs",ruby:"rb",php:"php",swift:"swift",dart:"dart",mermaid:"mmd"},Ht=`
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 3a1 1 0 0 1 1 1v8.59l2.3-2.29a1 1 0 1 1 1.4 1.41l-4 4a1 1 0 0 1-1.4 0l-4-4a1 1 0 0 1 1.4-1.41L11 12.59V4a1 1 0 0 1 1-1Zm-7 14a1 1 0 0 1 1 1v1h12v-1a1 1 0 1 1 2 0v2a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-2a1 1 0 0 1 1-1Z" fill="currentColor"/>
  </svg>
`,Kt=`
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M14 4h6v6h-2V7.41l-7.29 7.3-1.42-1.42L16.59 6H14V4Z" fill="currentColor"/>
    <path d="M5 5h6v2H7v10h10v-4h2v6H5V5Z" fill="currentColor"/>
  </svg>
`,m=(e,t)=>{Bt.log("mermaid",e,t),console.info("[GM-TRACE][Mermaid]",e,t??{})},bt=e=>e.replace(/[\u00A0\u2002\u2003\u2009\u3000]/g," ").replace(/[\u200B\u200C\u200D\uFEFF]/g,""),Et=()=>ft,Xt=()=>{const e=Et();return e===f?!1:(f=e,de=!1,!0)},Yt=async()=>{if(!document.fonts?.ready)return;const e=document.fonts.ready;await Promise.race([e,new Promise(t=>{window.setTimeout(t,1200)})])},Zt=()=>document.body.classList.contains("dark-theme")||document.body.classList.contains("dark")||document.body.getAttribute("data-theme")==="dark"||document.body.getAttribute("data-color-scheme")==="dark"||document.documentElement.classList.contains("dark")||document.documentElement.classList.contains("dark-theme")||document.documentElement.getAttribute("data-theme")==="dark"||document.documentElement.getAttribute("data-color-scheme")==="dark"||window.matchMedia("(prefers-color-scheme: dark)").matches,Qt=e=>e?Wt.has(e.toLowerCase()):!0,Jt=e=>{const t=bt(e).trim();if(t.length<20||!zt.some(s=>t.toLowerCase().startsWith(s.toLowerCase())))return!1;const r=t.split(`
`).filter(s=>s.trim().length>0);if(r.length<2)return!1;const o=r[r.length-1].trim();return!["-->","---","-.","==>",":::","[","(","{","|","&",","].some(s=>o.endsWith(s))},en=()=>{if(document.getElementById(Se))return;const e=document.createElement("style");e.id=Se,e.textContent=`
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

    .${ht} {
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

    .${T} {
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

    .${T}:hover {
      background: rgba(148, 163, 184, 0.14);
      color: var(--gem-sys-color--on-surface, #111827);
    }

    .${T}:disabled {
      cursor: not-allowed;
      opacity: 0.45;
    }

    .${T} svg {
      width: 18px;
      height: 18px;
      display: block;
      fill: currentColor;
    }

    .${E} {
      display: none;
      padding: 16px 18px 18px;
      overflow: auto;
      text-align: center;
      cursor: zoom-in;
      border-top: 1px solid rgba(148, 163, 184, 0.16);
    }

    .${E} svg {
      max-width: 100%;
      height: auto;
      overflow: visible !important;
    }

    .${E} .label,
    .${E} .edgeLabel,
    .${E} foreignObject,
    .${E} foreignObject * {
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

    .dark-theme .${T},
    html.dark .${T},
    body.dark .${T} {
      color: rgba(226, 232, 240, 0.88);
    }
  `,document.head.appendChild(e)},U=e=>{const t=e.closest(".code-block, code-block");if(!t)return null;const n=[e,e.closest("pre"),t];for(const s of n){if(!s)continue;const i=s.getAttribute("data-language")||s.getAttribute("data-lang")||s.getAttribute("lang");if(i?.trim())return i.trim().toLowerCase();const c=(s instanceof HTMLElement?s.className:s.getAttribute("class")||"").match(/(?:language|lang)-([a-z0-9+#._-]+)/i);if(c?.[1])return c[1].toLowerCase()}const r=t.querySelector(".code-block-decoration");return r&&r.querySelector(":scope > span")?.textContent?.trim().toLowerCase()||null},_t=async()=>{if(ee)return ee;if(Xe)return null;try{return ee=(await jt(()=>import("./vendor-mermaid-CCWOkseN.js").then(t=>t.m),__vite__mapDeps([0,1]))).default,ee}catch(e){return Xe=!0,m("load-failed",{error:String(e)}),null}},yt=async()=>{if(de)return!0;const e=await _t();if(!e)return!1;const t=Zt();return f=Et(),e.initialize({startOnLoad:!1,theme:t?"dark":"default",securityLevel:"loose",fontFamily:f,themeVariables:{fontFamily:f,darkMode:t,background:t?"#0b1020":"#ffffff",primaryColor:t?"#1f2937":"#eceff5",primaryTextColor:t?"#e5e7eb":"#1f2937",secondaryColor:t?"#111827":"#f8fafc",tertiaryColor:t?"#0f172a":"#ffffff",lineColor:t?"#cbd5e1":"#374151",clusterBkg:t?"#111827":"#e0f2fe",clusterBorder:t?"#94a3b8":"#0f766e",edgeLabelBackground:t?"#111827":"#f8fafc"},flowchart:{htmlLabels:!1,curve:"basis"},state:{useMaxWidth:!1},sequence:{useMaxWidth:!1},logLevel:5}),de=!0,!0},Y=e=>e.replace(/\r\n/g,`
`).replace(/\r/g,`
`),Tt=e=>e.closest(".code-block, code-block"),tn=e=>e.querySelector(".code-block-decoration"),$e=e=>{const t=tn(e);if(!t)return null;const n=t.querySelector(":scope > .buttons");if(n instanceof HTMLElement)return n;const r=document.createElement("div");return r.className="buttons",t.appendChild(r),r},Ge=e=>e.querySelector(".code-block-decoration .buttons > .copy-button, .code-block-decoration .buttons > button.copy-button"),M=e=>e.querySelector('code[data-test-id="code-content"]')??e.querySelector(".formatted-code-block-internal-container code")??e.querySelector("pre code")??e.querySelector("code.code-container"),Pe=(e,t)=>e.querySelector(".formatted-code-block-internal-container")??t?.closest(".formatted-code-block-internal-container")??t?.closest("pre")??t??null,C=e=>e.querySelector(`.${E}`),nn=e=>{const t=e.querySelector("defs")??e.insertBefore(document.createElementNS("http://www.w3.org/2000/svg","defs"),e.firstChild);let n=t.querySelector('style[data-gm-mermaid-font="1"]');n||(n=document.createElementNS("http://www.w3.org/2000/svg","style"),n.setAttribute("data-gm-mermaid-font","1"),t.appendChild(n)),n.textContent=`
    text, tspan, .label, .nodeLabel, .edgeLabel, foreignObject, foreignObject * {
      font-family: ${f} !important;
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
  `},wt=e=>{const t=e.cloneNode(!0);if(!(t instanceof SVGElement))return e.outerHTML;t.getAttribute("xmlns")||t.setAttribute("xmlns","http://www.w3.org/2000/svg"),t.getAttribute("xmlns:xlink")||t.setAttribute("xmlns:xlink","http://www.w3.org/1999/xlink"),t.style.setProperty("font-family",f,"important"),t.style.setProperty("overflow","visible","important");const n=t.querySelector("defs")??t.insertBefore(document.createElementNS("http://www.w3.org/2000/svg","defs"),t.firstChild),r=document.createElementNS("http://www.w3.org/2000/svg","style");return r.textContent=`
    text, tspan, .label, .nodeLabel, .edgeLabel, foreignObject, foreignObject * {
      font-family: ${f} !important;
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
  `,n.appendChild(r),new XMLSerializer().serializeToString(t)},et=e=>{const t=e.querySelector("svg");t instanceof SVGElement&&(t.style.setProperty("font-family",f,"important"),t.style.setProperty("overflow","visible","important"),nn(t),t.querySelectorAll(".label, .edgeLabel, foreignObject, foreignObject *").forEach(n=>{if(n instanceof SVGElement){n.style.setProperty("overflow","visible","important");return}n instanceof HTMLElement&&(n.style.setProperty("overflow","visible","important"),n.style.setProperty("line-height","1.25","important"))}))},tt=(e,t)=>{Ye.has(e)||(e.addEventListener("click",n=>{n.preventDefault(),n.stopPropagation(),rn(t)}),Ye.add(e))},te=(e,t,n)=>{Qe.has(e)||(e.addEventListener("click",r=>{r.preventDefault(),r.stopPropagation(),Lt(t,n)}),Qe.add(e))},xe=e=>{Je.has(e)||(e.addEventListener("click",()=>{e.querySelector("svg")&&ln(e.innerHTML)}),Je.add(e))},nt=()=>new Date().toISOString().replace(/[:.]/g,"-").replace("T","_").replace("Z",""),St=e=>{const t=(e??"").trim().toLowerCase();return t?Vt[t]??"txt":"txt"},rt=(e,t,n)=>{const r=new Blob(e,{type:n}),o=URL.createObjectURL(r),a=document.createElement("a");a.href=o,a.download=t,a.style.display="none",document.body.appendChild(a),a.click(),a.remove(),window.setTimeout(()=>URL.revokeObjectURL(o),1e3)},Ce=e=>e.getAttribute(he)==="code"?"code":"diagram",Z=e=>{const t=e.querySelector(`[${V}="1"]`);if(!t)return;const n=M(e);Y(n?.textContent||"");const r=U(n??e),a=e.getAttribute(y)==="1"&&Ce(e)==="diagram",s=C(e)?.querySelector("svg");if(a&&s instanceof SVGElement){t.disabled=!1,t.title="下载 Mermaid 图像",t.setAttribute("aria-label","下载 Mermaid 图像");return}t.disabled=!1;const i=St(r);t.title=`下载代码 (.${i})`,t.setAttribute("aria-label",`下载代码 (.${i})`)},rn=e=>{const t=M(e),n=Y(t?.textContent||""),r=U(t??e),o=e.getAttribute(y)==="1",a=o&&Ce(e)==="diagram",s=C(e)?.querySelector("svg");if(a&&s instanceof SVGElement){const p=wt(s),u=`geminimate-mermaid-${nt()}.svg`;rt([p],u,"image/svg+xml;charset=utf-8"),m("download-diagram",{filename:u,view:"diagram"});return}if(!n.trim()){m("download-skipped-empty",{language:r,mermaidHost:o});return}const i=St(r),l=`geminimate-code-${nt()}.${i}`;rt([n],l,i==="json"?"application/json;charset=utf-8":i==="svg"?"image/svg+xml;charset=utf-8":"text/plain;charset=utf-8"),m("download-code",{filename:l,language:r,view:o?Ce(e):"code"})},ye=(e,t)=>{if(!e.trim())return m("share-window-open-failed",{reason:"empty-html"}),!1;try{const n=chrome.runtime.getURL("sandbox/runner.html"),r=window.open(n,"_blank");if(!r)return m("share-window-open-failed",{reason:"window-open-blocked"}),!1;const o=a=>{a.source!==r||a.data?.type!=="RUNNER_READY"||(window.removeEventListener("message",o),r.postMessage({type:"PREVIEW_HTML",html:e,title:t},"*"),m("share-window-opened",{title:t,htmlLength:e.length}))};return window.addEventListener("message",o),!0}catch(n){return m("share-window-open-failed",{reason:"send-message-exception",error:String(n)}),!1}},Te=(e,t,n)=>`<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>${t}</title>
  </head>
  <body style="${n}">${e}</body>
</html>`,At=e=>/<\s*svg\b/i.test(e),vt=e=>/<\s*(?:!doctype|html|head|body|script|style|div|span|main|section|article|canvas|iframe)\b/i.test(e),on=e=>{const t=M(e),n=Y(t?.textContent||""),r=U(t??e),o=e.getAttribute(y)==="1",a=C(e)?.querySelector("svg");if(o&&a instanceof SVGElement){const l=wt(a),c=Te(l,"Mermaid Share","margin:0;padding:24px;background:#0b1020;display:flex;justify-content:center;align-items:flex-start;");ye(c,"Mermaid Share");return}if(!n.trim())return;const s=r==="svg"||At(n),i=r==="html"||vt(n);if(m("share-detect",{language:r,isMermaidHost:o,isSvgSource:s,isHtmlSource:i,sourceLength:n.length}),i){const l=/<\s*(?:!doctype|html|head|body)\b/i.test(n)?n:Te(n,"HTML Share","margin:0;padding:24px;background:#f8fafc;color:#0f172a;");ye(l,"HTML Share");return}if(s){const l=Te(n,"SVG Share","margin:0;padding:24px;background:#f8fafc;display:flex;justify-content:center;");ye(l,"SVG Share");return}},xt=(e,t,n,r)=>{const o=document.createElement("button");return o.type="button",o.className=`${T} ${r}`,o.innerHTML=t,o.title=e,o.setAttribute("aria-label",e),o.setAttribute(n,"1"),o},ot=(e,t)=>{Ze.has(e)||(e.addEventListener("click",n=>{n.preventDefault(),n.stopPropagation(),on(t)}),Ze.add(e))},Q=e=>{const t=e.querySelector(`[${ce}="1"]`);if(!t)return;const n=M(e),r=Y(n?.textContent||""),o=U(n??e),a=e.getAttribute(y)==="1",s=C(e)?.querySelector("svg")instanceof SVGElement,i=a&&s||o==="html"||o==="svg"||vt(r)||At(r);t.disabled=!i,t.title=i?"分享到新窗口":"当前代码类型不支持分享预览",t.setAttribute("aria-label",t.title)},Le=e=>{const t=$e(e);if(!t)return;let n=t.querySelector(`[${ce}="1"]`);if(n)ot(n,e);else{const r=Ge(e);n=xt("分享到新窗口",Kt,ce,ht),ot(n,e),r?t.insertBefore(n,r):t.appendChild(n),m("download-button-inserted",{language:U(M(e)??e)})}Q(e)},Ne=e=>{const t=$e(e);if(!t)return;let n=t.querySelector(`[${V}="1"]`);if(n)tt(n,e);else{const r=Ge(e);n=xt("下载代码",Ht,V,ke),tt(n,e),r?t.insertBefore(n,r):t.appendChild(n)}Z(e),Q(e)},Ct=e=>e.querySelector(`.${w}`),Lt=(e,t)=>{const n=C(e),r=Pe(e,M(e)??void 0),o=t==="diagram"&&n?"diagram":"code";e.setAttribute(he,o),n&&(n.style.display=o==="diagram"?"block":"none"),r&&(r.style.display=o==="diagram"?"none":""),e.querySelectorAll(`.${h}`).forEach(s=>{s.classList.toggle("active",s.dataset.view===o)}),Z(e),m("view-updated",{view:o,mermaidHost:e.getAttribute(y)==="1"})},an=(e,t)=>{let n=C(e);return n?(xe(n),n):(n=document.createElement("div"),n.className=E,xe(n),t.parentElement?.insertBefore(n,t),n)},at=e=>{const t=$e(e);if(!t)return;const n=Ct(e);if(n){const c=n.querySelector(`.${h}[data-view="diagram"]`),p=n.querySelector(`.${h}[data-view="code"]`);if(c&&p){te(c,e,"diagram"),te(p,e,"code");return}n.remove()}const r=document.createElement("div");r.className=w;const o=document.createElement("button");o.type="button",o.className=`${h} active`,o.dataset.view="diagram",o.textContent="图表";const a=document.createElement("button");a.type="button",a.className=h,a.dataset.view="code",a.textContent="代码",te(o,e,"diagram"),te(a,e,"code"),r.append(o,a);const s=t.querySelector(`[${V}="1"]`),i=Ge(e),l=s??i;l?t.insertBefore(r,l):t.appendChild(r)},sn=(e,t)=>{const n=t.length>240?`${t.slice(0,240)}...`:t;e.innerHTML=`
    <div class="gm-mermaid-render-error">
      <strong>Mermaid 渲染失败</strong>
      <div>${n}</div>
      <div style="margin-top:8px;font-size:12px;">你仍然可以切回代码视图或直接下载源码。</div>
    </div>
  `},Oe=(e,t)=>{C(e)?.remove(),Ct(e)?.remove(),t?(e.querySelector(`[${ce}="1"]`)?.remove(),e.querySelector(`[${V}="1"]`)?.remove()):(Z(e),Q(e));const o=Pe(e,M(e)??void 0);o&&(o.style.display=""),e.removeAttribute(y),e.removeAttribute(he),e.removeAttribute(Ae),e.removeAttribute(ve),e.removeAttribute(oe)},ie=()=>{if(se&&(document.removeEventListener("keydown",se),se=null),!W)return;const e=W;e.classList.remove("visible"),W=null,window.setTimeout(()=>e.remove(),160)},ln=e=>{if(W)return;const t=document.createElement("div");t.className="gm-mermaid-modal";const n=document.createElement("button");n.className="gm-mermaid-modal-close",n.type="button",n.textContent="×";const r=document.createElement("div");r.className="gm-mermaid-modal-content",r.innerHTML=e,t.append(n,r),document.body.appendChild(t),W=t,n.addEventListener("click",ie),t.addEventListener("click",a=>{a.target===t&&ie()});const o=a=>{a.key==="Escape"&&ie()};se=o,document.addEventListener("keydown",o),requestAnimationFrame(()=>t.classList.add("visible"))},cn=async(e,t)=>{const n=bt(t),r=Tt(e);if(!r)return;const o=Xt(),s=(r.getAttribute(ve)??"")!==f,i=C(r),l=i?.querySelector("svg")instanceof SVGElement;if(r.getAttribute(Ae)===n&&!o&&!s&&l){Le(r),Ne(r),at(r),i&&(xe(i),et(i)),Z(r),Q(r);return}if(r.getAttribute(oe)==="1")return;const c=Pe(r,e);if(c){r.setAttribute(oe,"1");try{if(await Yt(),!await yt()){m("load-unavailable");return}const u=await _t();if(!u)return;const g=an(r,c);Le(r),Ne(r),at(r),r.setAttribute(y,"1");const D=`gm-mermaid-${Math.random().toString(36).slice(2,10)}`;try{const I=await u.render(D,n),qt=typeof I=="string"?I:I.svg;g.innerHTML=qt,et(g),m("rendered",{codeLength:n.length})}catch(I){sn(g,String(I)),m("render-failed",{error:String(I)})}r.setAttribute(Ae,n),r.setAttribute(ve,f);const R=r.getAttribute(he);Lt(r,R==="code"?"code":"diagram")}finally{r.removeAttribute(oe)}}},qe=()=>{if(!F)return;const e=document.querySelectorAll('code[data-test-id="code-content"], .formatted-code-block-internal-container code, .code-block pre code, code.code-container'),t=new Set;m("scan-start",{codeCount:e.length,renderEnabled:ae}),e.forEach(n=>{const r=Tt(n);if(!r)return;t.add(r),Le(r),Ne(r);const o=Y(n.textContent||""),a=U(n),s=r.closest('model-response, .model-response, [data-message-author-role="model"]'),i=!s||s.querySelector("message-actions")!==null;if(ae&&i&&(a==="mermaid"||Qt(a)&&Jt(o))){cn(n,o);return}r.getAttribute(y)==="1"?(Oe(r,!1),m("mermaid-host-rolled-back",{language:a,codeLength:o.length})):(Z(r),Q(r))}),document.querySelectorAll(`[${y}="1"]`).forEach(n=>{t.has(n)||Oe(n,!1)}),m("scan-end",{activeHostCount:t.size,renderEnabled:ae})},dn=()=>{document.querySelectorAll(".code-block, code-block").forEach(e=>{Oe(e,!0)})},Be=()=>{F&&(L!==null&&clearTimeout(L),L=window.setTimeout(()=>{L=null,qe()},350))},st=()=>{[120,700,1600,3e3].forEach(e=>{const t=window.setTimeout(()=>{me.delete(t),F&&(m("warmup-scan",{delay:e}),qe())},e);me.add(t)})},mn=()=>{$||!document.body||($=new MutationObserver(e=>{e.some(n=>{const r=n.target instanceof Element?n.target:n.target.parentElement;if(r?.closest(`.${E}, .${w}, .${ke}`))return!1;if(r?.closest(".code-block, code-block, model-response"))return!0;for(const o of Array.from(n.addedNodes))if((o instanceof Element?o:o.parentElement)?.closest(".code-block, code-block, model-response"))return!0;return!1})&&(m("mutation-detected",{count:e.length}),Be())}),$.observe(document.body,{childList:!0,subtree:!0,characterData:!0}))};async function qn(){if(F){Be(),st();return}F=!0,en(),mn(),qe(),st(),yt(),m("start")}function Bn(){$&&($.disconnect(),$=null),L!==null&&(clearTimeout(L),L=null),me.forEach(e=>clearTimeout(e)),me.clear(),dn(),ie(),document.getElementById(Se)?.remove(),de=!1,F=!1,m("stop")}function Fn(e){ae=e,m("render-toggle",{enabled:e}),Be()}const Me="gm-thought-translation-style",G="gm-thought-translation-layout",H="gm-thought-original",d="gm-thought-translation",P="data-gm-thought-translated",K="data-gm-thought-processing",Fe="data-gm-thought-source",S="data-gm-thought-error",N="data-gm-thought-mode",Nt=['[data-test-id="thoughts-content"]',".thoughts-content",".thoughts-content-expanded",".thoughts-streaming",".thoughts-container",".thoughts-wrapper"],un=[":scope .markdown.markdown-main-panel",":scope > .markdown.markdown-main-panel",":scope .message-container message-content .markdown.markdown-main-panel",":scope .message-container message-content .markdown",":scope message-content .markdown.markdown-main-panel",":scope message-content .markdown",":scope .thought-content"],_='[data-test-id="thoughts-content"], .thoughts-content, .thoughts-content-expanded, .thoughts-streaming, .thoughts-container, .thoughts-wrapper',it='pre, code-block, .code-block, [data-test-id*="code-block"], [data-test-id*="code_block"]',gn=[`.${d}`,"script","style",".katex","math","svg","button",'[role="button"]',"mat-icon",".google-symbols","pre","code-block",".code-block",'[data-test-id*="code-block"]','[data-test-id*="code_block"]'].join(", "),Ot=new Set(["P","LI","H1","H2","H3","H4","H5","H6","BLOCKQUOTE","TD","TH","DT","DD"]),ne=2800,lt=260,pn=1,hn=3,fn=260,bn=2400;let J=!0,q=null,O=null,Ue="compare";const ue=new Set,ct=new Map,dt=new Map,Mt=new WeakMap,A=new WeakMap,Dt=new WeakMap,ge=new WeakMap,X=new WeakMap;let le=0;const pe=(e,t)=>{},Rt=e=>e==="replace"?"replace":"compare",fe=e=>{e.setAttribute(N,Ue)},En=()=>{if(document.getElementById(Me))return;const e=document.createElement("style");e.id=Me,e.textContent=`
    .${G} {
      display: grid !important;
      grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) !important;
      align-items: start !important;
      gap: 24px !important;
      width: 100% !important;
      max-width: 100% !important;
    }

    .${H},
    .${d} {
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

    .${d}::before {
      content: '\\601D\\7EF4\\94FE\\7FFB\\8BD1';
      display: block;
      margin-bottom: 12px;
      color: inherit;
      opacity: 0.72;
      font: inherit;
      font-weight: 600;
    }

    .${d} {
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

    .${d},
    .${d} * {
      font-family: inherit !important;
      font-size: inherit !important;
      line-height: inherit !important;
      max-width: 100% !important;
      color: inherit !important;
      background: transparent !important;
    }

    .${d} .gm-thought-translation-content {
      white-space: normal !important;
    }

    .${d} .gm-thought-translation-content p {
      margin: 0 0 1em 0 !important;
    }

    .${d} .gm-thought-translation-content p:last-child {
      margin-bottom: 0 !important;
    }

    .${d} .gm-thought-translation-code {
      margin: 0 0 1em 0 !important;
      padding: 12px 14px !important;
      border-radius: 10px !important;
      overflow-x: auto !important;
      white-space: pre !important;
      background: rgba(15, 23, 42, 0.06) !important;
      border: 0 !important;
    }

    .${d} .gm-thought-translation-code:last-child {
      margin-bottom: 0 !important;
    }

    .${d} .gm-thought-translation-code code {
      white-space: pre !important;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace !important;
      font-size: 0.92em !important;
      line-height: 1.5 !important;
    }

    .${d}[${S}="1"] {
      color: #b42318 !important;
    }

    .${d}[${S}="1"]::before {
      content: '\\601D\\7EF4\\94FE\\7FFB\\8BD1\\91CD\\8BD5\\4E2D';
    }

    [${N}="replace"] > .${G} {
      grid-template-columns: minmax(0, 1fr) !important;
      gap: 0 !important;
    }

    [${N}="replace"] .${H} {
      display: none !important;
    }

    [${N}="replace"] .${d} {
      border: 0 !important;
      border-left: 1px solid rgba(0, 0, 0, 0.12) !important;
      background: transparent !important;
      padding: 0 20px 0 24px !important;
      margin: 0 !important;
      font: inherit !important;
    }

    [${N}="replace"] .${d}::before {
      display: none !important;
    }

    @media (prefers-color-scheme: dark) {
      .${d} {
        background: #000000 !important;
        border-left-color: rgba(255, 255, 255, 0.14) !important;
      }

      .${d} .gm-thought-translation-code {
        background: rgba(148, 163, 184, 0.18) !important;
      }
    }

    @media (max-width: 1100px) {
      .${G} {
        grid-template-columns: minmax(0, 1fr) !important;
      }

      .${d} {
        border-left: 0 !important;
        border-top: 1px solid rgba(0, 0, 0, 0.12) !important;
        padding: 20px 0 0 0 !important;
      }
    }

    @media (max-width: 1100px) and (prefers-color-scheme: dark) {
      .${d} {
        border-top-color: rgba(255, 255, 255, 0.14) !important;
      }
    }
  `,document.head.appendChild(e)},x=e=>e.replace(/\u00a0/g," ").replace(/\r/g,"").replace(/[ \t]+\n/g,`
`).replace(/\n{3,}/g,`

`).trim(),z=e=>e.replace(/\u00a0/g," ").replace(/\r/g,"").replace(/\u200b/g,"").trim(),_n=e=>e.replace(/([\u4e00-\u9fff\u3002\uff0c\uff1b\uff1a\uff01\uff1f\uff09\u3011])(?:\s*(?:en){2,})(?=\s|$)/gi,"$1").replace(/(^|\s)(?:en){2,}(?=\s|$)/gi,"$1").replace(/[ \t]{2,}/g," ").trim(),mt=e=>e.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;"),yn=e=>{const t=e.split(/\n{2,}/),n=[];let r="";return t.forEach(o=>{const a=r?`${r}

${o}`:o;if(a.length<=ne){r=a;return}if(r&&n.push(r),o.length<=ne){r=o;return}for(let s=0;s<o.length;s+=ne)n.push(o.slice(s,s+ne));r=""}),r&&n.push(r),n.length>0?n:[e]},ut=e=>x(e.textContent||""),gt=e=>{let t=0,n=e;for(;n.parentNode;)n=n.parentNode,t+=1;return t},Tn=(e,t)=>{if(e===t)return 0;const n=e.compareDocumentPosition(t);return n&Node.DOCUMENT_POSITION_PRECEDING?1:n&Node.DOCUMENT_POSITION_FOLLOWING?-1:0},wn=e=>{const t=e.closest("model-thoughts, .model-thoughts");if(!t)return null;const n=t.querySelector("button.thoughts-header-button[aria-expanded]")??t.querySelector('button[aria-expanded][data-test-id*="thought"]')??t.querySelector('button[aria-expanded][class*="thought"]')??t.querySelector('[role="button"][aria-expanded][data-test-id*="thought"]');if(!n)return null;const r=n.getAttribute("aria-expanded");return r==="true"?!0:r==="false"?!1:null},It=e=>{if(!(e.matches(".thoughts-content-expanded")||e.matches(".thoughts-streaming"))||wn(e)===!1||e.getAttribute("aria-hidden")==="true"||e.hasAttribute("hidden")||e.closest('[aria-hidden="true"], [hidden]'))return!1;const r=window.getComputedStyle(e);if(r.display==="none"||r.visibility==="hidden")return!1;const o=e.getBoundingClientRect();return o.width>1&&o.height>1},Sn=e=>{const t=new Set;e.matches(".markdown, .markdown.markdown-main-panel")&&t.add(e),un.forEach(a=>{e.querySelectorAll(a).forEach(s=>t.add(s))});const o=Array.from(t).filter(a=>a.closest(`.${d}`)?!1:ut(a).length>0).sort((a,s)=>gt(a)-gt(s)).filter((a,s,i)=>!i.some(l=>l!==a&&l.contains(a))).sort(Tn);return o.length>0?o:ut(e)?[e]:[]},je=e=>{const t=e.cloneNode(!0);return t instanceof HTMLElement?(t.querySelectorAll(gn).forEach(n=>n.remove()),x(t.textContent||"")):""},An=e=>{if(e.matches("pre"))return e;const t=e.querySelector("pre");if(t)return t;if(e.matches(it))return e;const n=e.querySelector(it);return!n||Ot.has(e.tagName)&&je(e).length>0?null:n},vn=e=>{const t=e.matches("pre")?e:e.querySelector("pre");if(t)return z(t.textContent||"");const n=e.matches("code")?e:e.querySelector("code");return z(n?n.textContent||"":e.textContent||"")},De=(e,t,n,r,o="text")=>{const a=o==="code"?z(r):x(r);return a?(e.push({id:`node-${t}-block-${n}`,text:a,kind:o}),n+1):n},Re=(e,t,n,r)=>{if(r.closest(`.${d}`)||r.matches("br"))return n;if(r.matches("ul, ol")){let a=n;return Array.from(r.children).forEach(s=>{s instanceof HTMLElement&&(a=Re(e,t,a,s))}),a}const o=An(r);if(o)return De(e,t,n,vn(o),"code");if(!Ot.has(r.tagName)&&r.children.length>0){let a=n;if(Array.from(r.children).forEach(s=>{s instanceof HTMLElement&&(a=Re(e,t,a,s))}),a>n)return a}return De(e,t,n,je(r),"text")},xn=(e,t)=>{const n=[];let r=0;if(Array.from(e.childNodes).forEach(a=>{if(a.nodeType===Node.TEXT_NODE){r=De(n,t,r,a.textContent||"","text");return}a instanceof HTMLElement&&(r=Re(n,t,r,a))}),n.length>0)return n;const o=je(e);return o?[{id:`node-${t}-block-fallback`,text:o,kind:"text"}]:[]},Cn=e=>{const t=Sn(e);if(t.length===0)return null;const n=t.flatMap((o,a)=>xn(o,a)),r=x(n.filter(o=>o.kind==="text").map(o=>o.text).join(`

`));return n.length===0?null:{sourceNodes:t,sourceText:r,blocks:n,signature:n.map(o=>`${o.kind}:${o.text}`).join("␟")}},Ln=(e,t)=>`<div class="gm-thought-translation-content markdown markdown-main-panel">${e.map((r,o)=>{const a=t[o]??r.text;if(r.kind==="code"){const i=z(a);return i?`<pre class="gm-thought-translation-code"><code>${mt(i)}</code></pre>`:""}const s=x(a);return s?`<p>${mt(s).replace(/\n/g,"<br>")}</p>`:""}).join("")}</div>`,Nn=(e,t)=>{fe(e);let n=e.querySelector(`:scope > .${G}`),r=n?.querySelector(`:scope > .${H}`)??null,o=n?.querySelector(`:scope > .${d}`)??null;return n instanceof HTMLDivElement||(n=document.createElement("div"),n.className=G,e.appendChild(n)),r instanceof HTMLDivElement||(r=document.createElement("div"),r.className=H,n.appendChild(r)),t.forEach(a=>{a instanceof HTMLElement&&e.contains(a)&&(a.closest(`.${d}`)||a.parentElement!==r&&r.appendChild(a))}),o instanceof HTMLDivElement||(o=document.createElement("div"),o.className=d,n.appendChild(o)),{originalNode:r,translationNode:o}},kt=e=>{const t=e.querySelector(`:scope > .${G}`);if(!(t instanceof HTMLDivElement))return;const n=t.querySelector(`:scope > .${H}`);if(n instanceof HTMLDivElement)for(;n.firstChild;)e.insertBefore(n.firstChild,t);t.remove()},On=()=>{const e=new Set;Nt.forEach(o=>{document.querySelectorAll(o).forEach(a=>e.add(a))}),document.querySelectorAll(".thoughts-container .markdown.markdown-main-panel").forEach(o=>{const a=o.closest(_)??o;e.add(a)});const t=Array.from(e).filter(It),n=t.filter(o=>!t.some(a=>a!==o&&o.contains(a))),r=n.filter(o=>o.matches(".thoughts-content-expanded"));return r.length>0?r:n},v=e=>Mt.get(e)??0,We=e=>{const t=v(e)+1;return Mt.set(e,t),t},ze=e=>{const t=ge.get(e);t!==void 0&&(clearTimeout(t),ge.delete(e))},$t=(e,t)=>{ze(e);const n=window.setTimeout(()=>{ge.delete(e),B()},Math.max(30,t));ge.set(e,n)},be=e=>{X.delete(e)},pt=(e,t)=>{const n=X.get(e),r=n&&n.signature===t.signature?n.attempt+1:1;X.set(e,{signature:t.signature,attempt:r});const o=Math.min(bn,fn*r);$t(e,o)},Gt=e=>{We(e),ze(e),be(e),A.delete(e),e.removeAttribute(P),e.removeAttribute(K),e.removeAttribute(Fe),e.removeAttribute(S)},Mn=async e=>{const t=x(e);if(!t)return"";const n=ct.get(t);if(n)return n;const r=yn(t),o=[];for(const s of r){const i=dt.get(s);if(i){o.push(i);continue}const l=await chrome.runtime.sendMessage({type:"gm.translateThought",text:s,targetLang:"zh-CN"});if(!l||l.ok!==!0){const p=l&&"error"in l?l.error:void 0;throw new Error(p||"translation_failed")}const c=x(_n(l.translatedText));if(!c)throw new Error("translation_empty_chunk");dt.set(s,c),o.push(c)}const a=x(o.join(`

`));if(!a)throw new Error("translation_empty");return ct.set(t,a),a},we=(e,t,n)=>{e.innerHTML=Ln(t,n),e.removeAttribute(S)},Dn=async(e,t,n,r)=>{const o=t.blocks,a=o.map(u=>u.kind==="code"?u.text:null);we(r,o,a);const s=o.map((u,g)=>u.kind==="text"?g:-1).filter(u=>u>=0);if(s.length===0)return{incompleteCount:0};let i=0,l=0;const c=Math.max(1,Math.min(hn,s.length)),p=async()=>{for(;;){const u=l;if(l+=1,u>=s.length)return;const g=s[u],D=o[g]?.text??"";if(!D){if(a[g]="",v(e)!==n)return;we(r,o,a);continue}try{const R=await Mn(D);if(v(e)!==n)return;a[g]=R}catch{i+=1,a[g]=null,pe("block-translation-failed",{blockId:t.blocks[g]?.id})}if(v(e)!==n)return;we(r,o,a)}};return await Promise.all(Array.from({length:c},()=>p())),v(e)!==n?{incompleteCount:s.length}:{incompleteCount:i}},Rn=(e,t)=>{const n=Date.now(),r=We(e);A.delete(e),Dt.set(e,n),le+=1,e.setAttribute(K,"1"),e.setAttribute(Fe,t.sourceText),e.removeAttribute(S),fe(e);const{translationNode:o}=Nn(e,t.sourceNodes);o.textContent||(o.textContent="翻译中..."),Dn(e,t,r,o).then(a=>{if(v(e)===r){if(a.incompleteCount>0){e.removeAttribute(P),A.set(e,t),pt(e,t),pe("thought-translation-incomplete",{incompleteCount:a.incompleteCount,blockCount:t.blocks.length});return}e.setAttribute(P,"1"),e.removeAttribute(S),be(e),pe("thought-translation-completed",{blockCount:t.blocks.length,sourceLength:t.sourceText.length})}}).catch(a=>{if(v(e)!==r)return;const s=`翻译重试中: ${String(a)}`;o.textContent=s,o.setAttribute(S,"1"),e.setAttribute(S,"1"),e.removeAttribute(P),A.set(e,t),pt(e,t)}).finally(()=>{le=Math.max(0,le-1),v(e)===r&&e.removeAttribute(K),B()})},Ve=()=>{Nt.forEach(e=>{document.querySelectorAll(e).forEach(t=>{kt(t),Gt(t),t.removeAttribute(N)})})},In=e=>{const t=Cn(e);if(!t)return;const n=X.get(e);n&&n.signature!==t.signature&&be(e);const r=e.getAttribute(Fe)??"",o=e.getAttribute(K)==="1",a=Date.now(),s=r===t.sourceText,i=A.has(e),l=X.get(e)?.signature===t.signature;if(e.getAttribute(P)==="1"&&!o&&s&&!i&&!l)return;if(o){s||A.set(e,t);return}if(le>=pn){A.set(e,t);return}const c=Dt.get(e)??0;if(r&&!s&&a-c<lt){A.set(e,t),$t(e,lt-(a-c));return}Rn(e,t)},Pt=()=>{if(!J){Ve();return}const e=On();pe("thought-container-scan",{count:e.length}),document.querySelectorAll(`.${d}, ${_}`).forEach(t=>{const n=t.matches(_)?t:t.closest(_);n&&!e.includes(n)&&(kt(n),Gt(n),n.removeAttribute(N))}),e.forEach(t=>In(t))},j=e=>(e instanceof Element?e:e.parentElement)?.closest(`.${d}`)!==null,kn=e=>(e instanceof Element?e:e.parentElement)?.closest(_)!==null,$n=e=>{const t=e instanceof Element?e:e.parentElement;return t?t.closest(_):null},re=e=>{const t=$n(e);return t?It(t):!1},Gn=e=>e.some(t=>{if(t.type==="attributes")return j(t.target)?!1:kn(t.target);if(t.type==="characterData")return j(t.target)?!1:re(t.target);if(j(t.target))return!1;if(re(t.target))return!0;for(const n of Array.from(t.addedNodes))if(!j(n)&&re(n))return!0;for(const n of Array.from(t.removedNodes))if(!j(n)&&re(n))return!0;return!1}),B=()=>{if(!J){Ve();return}O!==null&&clearTimeout(O),O=window.setTimeout(()=>{O=null,Pt()},160)},Pn=()=>{[180,800,1800,3200].forEach(e=>{const t=window.setTimeout(()=>{ue.delete(t),J&&Pt()},e);ue.add(t)})},Ie=(e,t)=>{if(t!=="local")return;const n=e[b.THOUGHT_TRANSLATION_MODE];n&&(Ue=Rt(n.newValue),document.querySelectorAll(_).forEach(r=>{fe(r),We(r),r.removeAttribute(K),r.removeAttribute(P)}),B())};function Un(){J=!0,En(),chrome.storage.local.get([b.THOUGHT_TRANSLATION_MODE],e=>{Ue=Rt(e[b.THOUGHT_TRANSLATION_MODE]),document.querySelectorAll(_).forEach(t=>{fe(t)}),B()}),chrome.storage.onChanged.removeListener(Ie),chrome.storage.onChanged.addListener(Ie),!q&&document.body&&(q=new MutationObserver(e=>{Gn(e)&&B()}),q.observe(document.body,{childList:!0,subtree:!0,characterData:!0,attributes:!0,attributeFilter:["class","style","aria-hidden","hidden"]})),B(),Pn()}function jn(){J=!1,chrome.storage.onChanged.removeListener(Ie),q&&(q.disconnect(),q=null),O!==null&&(clearTimeout(O),O=null),ue.forEach(e=>clearTimeout(e)),ue.clear(),document.querySelectorAll(_).forEach(e=>{ze(e),be(e)}),Ve(),document.getElementById(Me)?.remove()}export{b as S,jt as _,jn as a,qn as b,Fn as c,Bt as d,Un as e,Bn as s};
