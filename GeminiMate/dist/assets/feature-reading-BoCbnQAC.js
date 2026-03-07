const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/vendor-mermaid-DJOcXJMk.js","assets/vendor-react-B-sxFqXu.js"])))=>i.map(i=>d[i]);
const T={FOLDER_DATA:"gvFolderData",FOLDER_DATA_AISTUDIO:"gvFolderDataAIStudio",LATEX_FIXER_ENABLED:"geminimate_latex_enabled",MARKDOWN_REPAIR_ENABLED:"geminimate_markdown_enabled",MERMAID_RENDER_ENABLED:"geminimate_mermaid_enabled",THOUGHT_TRANSLATION_ENABLED:"geminimate_thought_translation_enabled",FORMULA_COPY_ENABLED:"geminimate_formula_copy_enabled",FORMULA_COPY_FORMAT:"geminimate_formula_copy_format",WATERMARK_REMOVER_ENABLED:"geminiWatermarkRemoverEnabled",QUOTE_REPLY_ENABLED:"gvQuoteReplyEnabled",BOTTOM_CLEANUP_ENABLED:"geminimate_bottom_cleanup_enabled",DEBUG_MODE:"geminimate_debug_mode",DEBUG_LOGS:"geminimate_debug_logs",DEBUG_FILE_LOG_ENABLED:"geminimate_debug_file_log_enabled",DEBUG_CACHE_CAPTURE_ENABLED:"geminimate_debug_cache_capture_enabled",LANGUAGE:"geminimate_language",TIMELINE_ENABLED:"geminimate_timeline_enabled",TIMELINE_WIDTH:"geminimate_timeline_width",TIMELINE_AUTO_HIDE:"geminimate_timeline_auto_hide",TIMELINE_STARRED_MESSAGES:"geminiTimelineStarred",TIMELINE_SCROLL_MODE:"geminiTimelineScrollMode",GEMINI_CHAT_WIDTH:"geminimate_chat_width",GEMINI_EDIT_INPUT_WIDTH:"geminimate_edit_input_width",GEMINI_SIDEBAR_WIDTH:"geminimate_sidebar_width",GEMINI_SIDEBAR_AUTO_HIDE:"geminimate_sidebar_auto_hide",GEMINI_ZOOM_LEVEL:"geminimate_zoom_level",GEMINI_FONT_SIZE_SCALE:"geminimate_font_size_scale",GEMINI_FONT_WEIGHT:"geminimate_font_weight",GEMINI_FONT_FAMILY:"geminimate_font_family",GEMINI_SANS_PRESET:"geminimate_sans_preset",GEMINI_SERIF_PRESET:"geminimate_serif_preset",GEMINI_CUSTOM_FONTS:"geminimate_custom_fonts",GEMINI_LETTER_SPACING:"geminimate_letter_spacing",GEMINI_LINE_HEIGHT:"geminimate_line_height",GEMINI_PARAGRAPH_INDENT_ENABLED:"geminimate_paragraph_indent_enabled",GEMINI_EMPHASIS_MODE:"geminimate_emphasis_mode",GV_FOLDER_FILTER_USER_ONLY:"gvFolderFilterUserOnly",GV_FOLDER_TREE_INDENT:"gvFolderTreeIndent",GV_ACCOUNT_ISOLATION_ENABLED:"gvAccountIsolationEnabled",GV_ACCOUNT_ISOLATION_ENABLED_GEMINI:"gvAccountIsolationEnabledGemini",GV_ACCOUNT_ISOLATION_ENABLED_AISTUDIO:"gvAccountIsolationEnabledAIStudio",GV_ACCOUNT_PROFILE_MAP:"gvAccountProfileMap"},ae=2e3,se=`${T.DEBUG_LOGS}:`,Ae=e=>{if(e!==void 0)try{return JSON.parse(JSON.stringify(e))}catch{return String(e)}};class S{static instance;enabled=!1;initialized=!1;context="unknown";logsStorageKey=`${se}unknown`;logs=[];flushTimer=null;storageListener=null;static getInstance(){return S.instance||(S.instance=new S),S.instance}async init(t){if(this.context=t,this.logsStorageKey=`${se}${this.normalizeContext(t)}`,!this.initialized){this.initialized=!0;try{const n=await chrome.storage.local.get([T.DEBUG_MODE,this.logsStorageKey,T.DEBUG_LOGS]);this.enabled=n[T.DEBUG_MODE]===!0;const r=n[this.logsStorageKey]??n[T.DEBUG_LOGS];this.logs=Array.isArray(r)?r.slice(-ae).map(o=>Ae(o)):[]}catch(n){console.warn("[GeminiMate][Debug] Failed to initialize debug service from storage",n),this.enabled=!1,this.logs=[]}this.storageListener=(n,r)=>{if(r!=="local")return;const o=n[T.DEBUG_MODE];o&&(this.enabled=o.newValue===!0,console.info("[GeminiMate][Debug] Debug mode changed",{enabled:this.enabled}),this.enabled&&this.log("debug","mode-enabled",{context:this.context}))},chrome.storage.onChanged.addListener(this.storageListener),console.info("[GeminiMate][Debug] Debug service initialized",{context:this.context,enabled:this.enabled})}}isEnabled(){return this.enabled}log(t,n,r){if(!this.enabled)return;const o={id:`${Date.now()}-${Math.random().toString(36).slice(2,8)}`,ts:new Date().toISOString(),source:t,action:n,context:this.context,detail:Ae(r)};this.logs.push(o),this.logs.length>ae&&(this.logs=this.logs.slice(-ae)),this.forwardToBackground(o),this.scheduleFlush()}async clearLogs(){this.logs=[];try{const t=await chrome.storage.local.get(null),n=Object.keys(t).filter(r=>r.startsWith(se));n.length>0&&await chrome.storage.local.remove(n),await chrome.storage.local.set({[T.DEBUG_LOGS]:[]})}catch(t){console.warn("[GeminiMate][Debug] Failed to clear debug logs",t)}}scheduleFlush(){this.flushTimer===null&&(this.flushTimer=setTimeout(()=>{this.flushTimer=null,this.flush()},250))}async flush(){try{await chrome.storage.local.set({[this.logsStorageKey]:this.logs})}catch(t){console.warn("[GeminiMate][Debug] Failed to flush debug logs",t)}}normalizeContext(t){const n=t.trim().toLowerCase().replace(/[^a-z0-9_-]+/g,"-");return n.length>0?n:"unknown"}forwardToBackground(t){try{if(!chrome?.runtime?.id)return;const n={type:"gm.debug.ingest",entry:t};chrome.runtime.sendMessage(n)}catch{}}}const kt=S.getInstance(),Je="modulepreload",et=function(e){return"/"+e},xe={},tt=function(t,n,r){let o=Promise.resolve();if(n&&n.length>0){let m=function(l){return Promise.all(l.map(c=>Promise.resolve(c).then(u=>({status:"fulfilled",value:u}),u=>({status:"rejected",reason:u}))))};document.getElementsByTagName("link");const s=document.querySelector("meta[property=csp-nonce]"),i=s?.nonce||s?.getAttribute("nonce");o=m(n.map(l=>{if(l=et(l),l in xe)return;xe[l]=!0;const c=l.endsWith(".css"),u=c?'[rel="stylesheet"]':"";if(document.querySelector(`link[href="${l}"]${u}`))return;const h=document.createElement("link");if(h.rel=c?"stylesheet":Je,c||(h.as="script"),h.crossOrigin="",h.href=l,i&&h.setAttribute("nonce",i),document.head.appendChild(h),c)return new Promise((re,oe)=>{h.addEventListener("load",re),h.addEventListener("error",()=>oe(new Error(`Unable to preload CSS for ${l}`)))})}))}function a(s){const i=new Event("vite:preloadError",{cancelable:!0});if(i.payload=s,window.dispatchEvent(i),!i.defaultPrevented)throw s}return o.then(s=>{for(const i of s||[])i.status==="rejected"&&a(i.reason);return t().catch(a)})},le="gm-mermaid-style",$="gm-mermaid-diagram",_="gm-mermaid-toggle",g="gm-mermaid-toggle-button",be="gm-code-download-button",E="gm-code-action-button",x="data-gm-mermaid-host",F="data-gm-code-download",te="data-gm-mermaid-view",ce="data-gm-mermaid-code",K="data-gm-mermaid-processing",de="data-gm-mermaid-font";let P=null,ve=!1,Z=!1,N=!1,Fe=!0,L=null,w=null;const Q=new Set;let G=null,X=null;const Ue="Google Sans, Roboto, sans-serif";let f=Ue;const Se=new WeakSet,Le=new WeakSet,Ce=new WeakSet,nt=new Set(["代码段","代码","代码块","示例","示例代码","code","code snippet","snippet","example","sample","text","plain","plaintext","raw","output","result"]),rt=["%%","graph","flowchart","sequenceDiagram","classDiagram","stateDiagram","erDiagram","gantt","pie","gitGraph","journey","mindmap","timeline","zenuml","quadrantChart","requirementDiagram","requirement","sankey-beta","sankey","C4Context","C4Container","C4Component","C4Dynamic","C4Deployment","xychart-beta","xychart","block-beta","block","packet-beta","packet","architecture-beta","architecture","kanban","radar-beta","treemap"],ot={bash:"sh",shell:"sh",sh:"sh",zsh:"sh",powershell:"ps1",ps1:"ps1",python:"py",py:"py",javascript:"js",js:"js",typescript:"ts",ts:"ts",tsx:"tsx",jsx:"jsx",json:"json",html:"html",css:"css",scss:"scss",sass:"sass",less:"less",markdown:"md",md:"md",yaml:"yml",yml:"yml",xml:"xml",sql:"sql",c:"c",cpp:"cpp","c++":"cpp",csharp:"cs",cs:"cs",java:"java",kotlin:"kt",go:"go",rust:"rs",ruby:"rb",php:"php",swift:"swift",dart:"dart",mermaid:"mmd"},at=`
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 3a1 1 0 0 1 1 1v8.59l2.3-2.29a1 1 0 1 1 1.4 1.41l-4 4a1 1 0 0 1-1.4 0l-4-4a1 1 0 0 1 1.4-1.41L11 12.59V4a1 1 0 0 1 1-1Zm-7 14a1 1 0 0 1 1 1v1h12v-1a1 1 0 1 1 2 0v2a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-2a1 1 0 0 1 1-1Z" fill="currentColor"/>
  </svg>
`,p=(e,t)=>{},qe=e=>e.replace(/[\u00A0\u2002\u2003\u2009\u3000]/g," ").replace(/[\u200B\u200C\u200D\uFEFF]/g,""),Pe=()=>{const e=[".markdown-main-panel",".markdown","body"];for(const t of e){const n=document.querySelector(t);if(!(n instanceof HTMLElement))continue;const r=(window.getComputedStyle(n).fontFamily||"").trim();if(r.length>0)return r}return Ue},st=()=>{const e=Pe();return e===f?!1:(f=e,Z=!1,!0)},it=e=>e?nt.has(e.toLowerCase()):!0,lt=e=>{const t=qe(e).trim();if(t.length<20||!rt.some(s=>t.toLowerCase().startsWith(s.toLowerCase())))return!1;const r=t.split(`
`).filter(s=>s.trim().length>0);if(r.length<2)return!1;const o=r[r.length-1].trim();return!["-->","---","-.","==>",":::","[","(","{","|","&",","].some(s=>o.endsWith(s))},ct=()=>{if(document.getElementById(le))return;const e=document.createElement("style");e.id=le,e.textContent=`
    .${_} {
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

    .${_} {
      order: 1;
      flex: 0 0 auto;
    }

    .${be} {
      order: 2;
      flex: 0 0 auto;
    }

    .code-block-decoration .buttons > .copy-button,
    .code-block-decoration .buttons > button.copy-button {
      order: 3;
      flex: 0 0 auto;
    }

    .${g} {
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

    .${g}.active {
      background: rgba(59, 130, 246, 0.16);
      color: #1d4ed8;
    }

    .${E} {
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

    .${E}:hover {
      background: rgba(148, 163, 184, 0.14);
      color: var(--gem-sys-color--on-surface, #111827);
    }

    .${E}:disabled {
      cursor: not-allowed;
      opacity: 0.45;
    }

    .${E} svg {
      width: 18px;
      height: 18px;
      display: block;
      fill: currentColor;
    }

    .${$} {
      display: none;
      padding: 16px 18px 18px;
      overflow-x: auto;
      text-align: center;
      cursor: zoom-in;
      border-top: 1px solid rgba(148, 163, 184, 0.16);
    }

    .${$} svg {
      max-width: 100%;
      height: auto;
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

    .dark-theme .${_},
    html.dark .${_},
    body.dark .${_} {
      background: rgba(15, 23, 42, 0.72);
      border-color: rgba(148, 163, 184, 0.18);
    }

    .dark-theme .${g},
    html.dark .${g},
    body.dark .${g} {
      color: rgba(226, 232, 240, 0.88);
    }

    .dark-theme .${g}.active,
    html.dark .${g}.active,
    body.dark .${g}.active {
      color: #93c5fd;
      background: rgba(59, 130, 246, 0.2);
    }

    .dark-theme .${E},
    html.dark .${E},
    body.dark .${E} {
      color: rgba(226, 232, 240, 0.88);
    }
  `,document.head.appendChild(e)},ne=e=>{const t=e.closest(".code-block, code-block");if(!t)return null;const n=[e,e.closest("pre"),t];for(const s of n){if(!s)continue;const i=s.getAttribute("data-language")||s.getAttribute("data-lang")||s.getAttribute("lang");if(i?.trim())return i.trim().toLowerCase();const l=(s instanceof HTMLElement?s.className:s.getAttribute("class")||"").match(/(?:language|lang)-([a-z0-9+#._-]+)/i);if(l?.[1])return l[1].toLowerCase()}const r=t.querySelector(".code-block-decoration");return r&&r.querySelector(":scope > span")?.textContent?.trim().toLowerCase()||null},Be=async()=>{if(P)return P;if(ve)return null;try{return P=(await tt(()=>import("./vendor-mermaid-DJOcXJMk.js").then(t=>t.m),__vite__mapDeps([0,1]))).default,P}catch{return ve=!0,null}},ze=async()=>{if(Z)return!0;const e=await Be();if(!e)return!1;const t=document.body.classList.contains("dark-theme")||document.body.getAttribute("data-theme")==="dark"||document.documentElement.classList.contains("dark")||window.matchMedia("(prefers-color-scheme: dark)").matches;return f=Pe(),e.initialize({startOnLoad:!1,theme:t?"dark":"default",securityLevel:"loose",fontFamily:f,themeVariables:{fontFamily:f},logLevel:5}),Z=!0,!0},Ee=e=>e.replace(/\r\n/g,`
`).replace(/\r/g,`
`),je=e=>e.closest(".code-block, code-block"),dt=e=>e.querySelector(".code-block-decoration"),Ve=e=>{const t=dt(e);if(!t)return null;const n=t.querySelector(":scope > .buttons");if(n instanceof HTMLElement)return n;const r=document.createElement("div");return r.className="buttons",t.appendChild(r),r},We=e=>e.querySelector(".code-block-decoration .buttons > .copy-button, .code-block-decoration .buttons > button.copy-button"),U=e=>e.querySelector('code[data-test-id="code-content"]')??e.querySelector(".formatted-code-block-internal-container code")??e.querySelector("pre code")??e.querySelector("code.code-container"),_e=(e,t)=>e.querySelector(".formatted-code-block-internal-container")??t?.closest(".formatted-code-block-internal-container")??t?.closest("pre")??t??null,M=e=>e.querySelector(`.${$}`),ut=e=>{const t=e.querySelector("defs")??e.insertBefore(document.createElementNS("http://www.w3.org/2000/svg","defs"),e.firstChild);let n=t.querySelector('style[data-gm-mermaid-font="1"]');n||(n=document.createElementNS("http://www.w3.org/2000/svg","style"),n.setAttribute("data-gm-mermaid-font","1"),t.appendChild(n)),n.textContent=`text, tspan, .label, .nodeLabel, .edgeLabel, foreignObject, foreignObject * { font-family: ${f} !important; }`},mt=e=>{const t=e.cloneNode(!0);if(!(t instanceof SVGElement))return e.outerHTML;t.getAttribute("xmlns")||t.setAttribute("xmlns","http://www.w3.org/2000/svg"),t.getAttribute("xmlns:xlink")||t.setAttribute("xmlns:xlink","http://www.w3.org/1999/xlink");const n=t.querySelector("defs")??t.insertBefore(document.createElementNS("http://www.w3.org/2000/svg","defs"),t.firstChild),r=document.createElementNS("http://www.w3.org/2000/svg","style");return r.textContent=`text, tspan, .label, .nodeLabel, .edgeLabel, foreignObject, foreignObject * { font-family: ${f} !important; }`,n.appendChild(r),new XMLSerializer().serializeToString(t)},Ne=e=>{const t=e.querySelector("svg");t instanceof SVGElement&&(t.style.setProperty("font-family",f,"important"),ut(t),t.querySelectorAll("text, tspan, .label, .nodeLabel, .edgeLabel, foreignObject, foreignObject *").forEach(n=>{if(n instanceof SVGElement){n.style.setProperty("font-family",f,"important");return}n instanceof HTMLElement&&n.style.setProperty("font-family",f,"important")}))},Ie=(e,t)=>{Se.has(e)||(e.addEventListener("click",n=>{n.preventDefault(),n.stopPropagation(),gt(t)}),Se.add(e))},B=(e,t,n)=>{Le.has(e)||(e.addEventListener("click",r=>{r.preventDefault(),r.stopPropagation(),He(t,n)}),Le.add(e))},ue=e=>{Ce.has(e)||(e.addEventListener("click",()=>{e.querySelector("svg")&&bt(e.innerHTML)}),Ce.add(e))},Me=()=>new Date().toISOString().replace(/[:.]/g,"-").replace("T","_").replace("Z",""),Ke=e=>{const t=(e??"").trim().toLowerCase();return t?ot[t]??"txt":"txt"},De=(e,t,n)=>{const r=new Blob(e,{type:n}),o=URL.createObjectURL(r),a=document.createElement("a");a.href=o,a.download=t,a.style.display="none",document.body.appendChild(a),a.click(),a.remove(),window.setTimeout(()=>URL.revokeObjectURL(o),1e3)},me=e=>e.getAttribute(te)==="code"?"code":"diagram",q=e=>{const t=e.querySelector(`[${F}="1"]`);if(!t)return;const n=U(e);Ee(n?.textContent||"");const r=ne(n??e),a=e.getAttribute(x)==="1"&&me(e)==="diagram",s=M(e)?.querySelector("svg");if(a&&s instanceof SVGElement){t.disabled=!1,t.title="下载 Mermaid 图像",t.setAttribute("aria-label","下载 Mermaid 图像");return}t.disabled=!1;const i=Ke(r);t.title=`下载代码 (.${i})`,t.setAttribute("aria-label",`下载代码 (.${i})`)},gt=e=>{const t=U(e),n=Ee(t?.textContent||""),r=ne(t??e),o=e.getAttribute(x)==="1",a=o&&me(e)==="diagram",s=M(e)?.querySelector("svg");if(a&&s instanceof SVGElement){const c=mt(s),u=`geminimate-mermaid-${Me()}.svg`;De([c],u,"image/svg+xml;charset=utf-8");return}if(!n.trim())return;const i=Ke(r),m=`geminimate-code-${Me()}.${i}`;De([n],m,i==="json"?"application/json;charset=utf-8":i==="svg"?"image/svg+xml;charset=utf-8":"text/plain;charset=utf-8"),p("download-code",{view:o?me(e):"code"})},ht=e=>{const t=document.createElement("button");return t.type="button",t.className=`${E} ${be}`,t.innerHTML=at,t.title=e,t.setAttribute("aria-label",e),t.setAttribute(F,"1"),t},ge=e=>{const t=Ve(e);if(!t)return;let n=t.querySelector(`[${F}="1"]`);if(n)Ie(n,e);else{const r=We(e);n=ht("下载代码"),Ie(n,e),r?t.insertBefore(n,r):t.appendChild(n),p("download-button-inserted",{language:ne(U(e)??e)})}q(e)},Xe=e=>e.querySelector(`.${_}`),He=(e,t)=>{const n=M(e),r=_e(e,U(e)??void 0),o=t==="diagram"&&n?"diagram":"code";e.setAttribute(te,o),n&&(n.style.display=o==="diagram"?"block":"none"),r&&(r.style.display=o==="diagram"?"none":""),e.querySelectorAll(`.${g}`).forEach(s=>{s.classList.toggle("active",s.dataset.view===o)}),q(e),p("view-updated",{mermaidHost:e.getAttribute(x)==="1"})},ft=(e,t)=>{let n=M(e);return n?(ue(n),n):(n=document.createElement("div"),n.className=$,ue(n),t.parentElement?.insertBefore(n,t),n)},Oe=e=>{const t=Ve(e);if(!t)return;const n=Xe(e);if(n){const l=n.querySelector(`.${g}[data-view="diagram"]`),c=n.querySelector(`.${g}[data-view="code"]`);if(l&&c){B(l,e,"diagram"),B(c,e,"code");return}n.remove()}const r=document.createElement("div");r.className=_;const o=document.createElement("button");o.type="button",o.className=`${g} active`,o.dataset.view="diagram",o.textContent="图表";const a=document.createElement("button");a.type="button",a.className=g,a.dataset.view="code",a.textContent="代码",B(o,e,"diagram"),B(a,e,"code"),r.append(o,a);const s=t.querySelector(`[${F}="1"]`),i=We(e),m=s??i;m?t.insertBefore(r,m):t.appendChild(r)},pt=(e,t)=>{const n=t.length>240?`${t.slice(0,240)}...`:t;e.innerHTML=`
    <div class="gm-mermaid-render-error">
      <strong>Mermaid 渲染失败</strong>
      <div>${n}</div>
      <div style="margin-top:8px;font-size:12px;">你仍然可以切回代码视图或直接下载源码。</div>
    </div>
  `},he=(e,t)=>{M(e)?.remove(),Xe(e)?.remove(),t?e.querySelector(`[${F}="1"]`)?.remove():q(e);const o=_e(e,U(e)??void 0);o&&(o.style.display=""),e.removeAttribute(x),e.removeAttribute(te),e.removeAttribute(ce),e.removeAttribute(de),e.removeAttribute(K)},H=()=>{if(X&&(document.removeEventListener("keydown",X),X=null),!G)return;const e=G;e.classList.remove("visible"),G=null,window.setTimeout(()=>e.remove(),160)},bt=e=>{if(G)return;const t=document.createElement("div");t.className="gm-mermaid-modal";const n=document.createElement("button");n.className="gm-mermaid-modal-close",n.type="button",n.textContent="×";const r=document.createElement("div");r.className="gm-mermaid-modal-content",r.innerHTML=e,t.append(n,r),document.body.appendChild(t),G=t,n.addEventListener("click",H),t.addEventListener("click",a=>{a.target===t&&H()});const o=a=>{a.key==="Escape"&&H()};X=o,document.addEventListener("keydown",o),requestAnimationFrame(()=>t.classList.add("visible"))},Et=async(e,t)=>{const n=qe(t),r=je(e);if(!r)return;const o=st(),s=(r.getAttribute(de)??"")!==f,i=M(r),m=i?.querySelector("svg")instanceof SVGElement;if(r.getAttribute(ce)===n&&!o&&!s&&m){ge(r),Oe(r),i&&(ue(i),Ne(i)),q(r);return}if(r.getAttribute(K)==="1")return;const l=_e(r,e);if(l){r.setAttribute(K,"1");try{if(!await ze()){p("load-unavailable");return}const u=await Be();if(!u)return;const h=ft(r,l);ge(r),Oe(r),r.setAttribute(x,"1");const re=`gm-mermaid-${Math.random().toString(36).slice(2,10)}`;try{const v=await u.render(re,n),Qe=typeof v=="string"?v:v.svg;h.innerHTML=Qe,Ne(h),p("rendered",{codeLength:n.length})}catch(v){pt(h,String(v)),p("render-failed",{error:String(v)})}r.setAttribute(ce,n),r.setAttribute(de,f);const oe=r.getAttribute(te);He(r,oe==="code"?"code":"diagram")}finally{r.removeAttribute(K)}}},ye=()=>{if(!N)return;const e=document.querySelectorAll('code[data-test-id="code-content"], .formatted-code-block-internal-container code, .code-block pre code, code.code-container'),t=new Set;p("scan-start",{codeCount:e.length}),e.forEach(n=>{const r=je(n);if(!r)return;t.add(r),ge(r);const o=Ee(n.textContent||""),a=ne(n),s=r.closest('model-response, .model-response, [data-message-author-role="model"]'),i=!s||s.querySelector("message-actions")!==null;if(Fe&&i&&(a==="mermaid"||it(a)&&lt(o))){Et(n,o);return}r.getAttribute(x)==="1"?(he(r,!1),p("mermaid-host-rolled-back",{codeLength:o.length})):q(r)}),document.querySelectorAll(`[${x}="1"]`).forEach(n=>{t.has(n)||he(n,!1)}),p("scan-end",{activeHostCount:t.size})},_t=()=>{document.querySelectorAll(".code-block, code-block").forEach(e=>{he(e,!0)})},Te=()=>{N&&(w!==null&&clearTimeout(w),w=window.setTimeout(()=>{w=null,ye()},350))},Re=()=>{[120,700,1600,3e3].forEach(e=>{const t=window.setTimeout(()=>{Q.delete(t),N&&ye()},e);Q.add(t)})},yt=()=>{L||!document.body||(L=new MutationObserver(e=>{e.some(n=>{const r=n.target instanceof Element?n.target:n.target.parentElement;if(r?.closest(`.${$}, .${_}, .${be}`))return!1;if(r?.closest(".code-block, code-block, model-response"))return!0;for(const o of Array.from(n.addedNodes))if((o instanceof Element?o:o.parentElement)?.closest(".code-block, code-block, model-response"))return!0;return!1})&&(p("mutation-detected",{count:e.length}),Te())}),L.observe(document.body,{childList:!0,subtree:!0,characterData:!0}))};async function Gt(){if(N){Te(),Re();return}N=!0,ct(),yt(),ye(),Re(),ze()}function $t(){L&&(L.disconnect(),L=null),w!==null&&(clearTimeout(w),w=null),Q.forEach(e=>clearTimeout(e)),Q.clear(),_t(),H(),document.getElementById(le)?.remove(),Z=!1,N=!1}function Ft(e){Fe=e,Te()}const fe="gm-thought-translation-style",d="gm-thought-translation",R="data-gm-thought-translated",k="data-gm-thought-processing",Y="data-gm-thought-source",b="data-gm-thought-error",Ye=['[data-test-id="thoughts-content"]',".thoughts-content",".thoughts-content-expanded",".thoughts-streaming",".thoughts-container"],Tt=[":scope .markdown.markdown-main-panel",":scope > .markdown.markdown-main-panel",":scope .message-container message-content .markdown.markdown-main-panel",":scope .message-container message-content .markdown",":scope message-content .markdown.markdown-main-panel",":scope message-content .markdown",":scope .thought-content"],z=2800,wt=120,At=450,xt='[data-test-id="thoughts-content"], .thoughts-content, .thoughts-content-expanded, .thoughts-streaming, .thoughts-container, .thoughts-wrapper',vt=1,ke="__GM_THOUGHT_NL_9F2E__";let I=!0,C=null,A=null;const J=new Set,Ge=new Map,$e=new Map,D=new WeakMap,O=new WeakMap,ie=new WeakMap;let j=0;const y=(e,t)=>{},St=()=>{if(document.getElementById(fe))return;const e=document.createElement("style");e.id=fe,e.textContent=`
    .${d} {
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

    .${d}::before {
      content: '思维链翻译';
      display: block;
      margin-bottom: 8px;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.08em;
      color: #2563eb;
    }

    .${d}[${b}="1"] {
      border-color: rgba(239, 68, 68, 0.24);
      background: rgba(239, 68, 68, 0.06);
    }

    .${d}[${b}="1"]::before {
      content: '思维链翻译失败';
      color: #dc2626;
    }

    /* ── Right-side side-by-side layout ── */
    /* When a translation block is present, show thought content and translation
       in a two-column flex row so the translation appears to the RIGHT. */
    .thoughts-content-expanded:has(.${d}),
    .thoughts-streaming:has(.${d}),
    .thoughts-content:has(.${d}) {
      display: flex !important;
      flex-direction: row !important;
      align-items: flex-start !important;
      gap: 20px !important;
    }

    /* Thought text takes the remaining space on the left */
    .thoughts-content-expanded > :not(.${d}),
    .thoughts-streaming > :not(.${d}),
    .thoughts-content > :not(.${d}) {
      flex: 1 1 0 !important;
      min-width: 0 !important;
    }

    /* Translation block is fixed-width on the right */
    .thoughts-content-expanded > .${d},
    .thoughts-streaming > .${d},
    .thoughts-content > .${d} {
      flex: 0 0 38% !important;
      max-width: 38% !important;
      margin-top: 0 !important;
      position: sticky;
      top: 8px;
      align-self: flex-start;
    }
  `,document.head.appendChild(e)},ee=e=>e.replace(/\u00a0/g," ").replace(/\r/g,"").replace(/[ \t]+\n/g,`
`).replace(/\n{3,}/g,`

`).trim(),Lt=e=>{const t=e.split(/\n{2,}/),n=[];let r="";return t.forEach(o=>{const a=r?`${r}

${o}`:o;if(a.length<=z){r=a;return}if(r&&n.push(r),o.length<=z){r=o;return}for(let s=0;s<o.length;s+=z)n.push(o.slice(s,s+z));r=""}),r&&n.push(r),n.length>0?n:[e]},Ct=e=>e.matches(".thoughts-content-expanded")?!0:e.getAttribute("aria-hidden")==="true"||e.hasAttribute("hidden")?!1:e.offsetParent!==null||e.getClientRects().length>0?!0:e.closest(".thoughts-wrapper, .thoughts-container, thoughts-entry")!==null,Nt=e=>{if(e.matches(".markdown.markdown-main-panel"))return e;const t=Tt.flatMap(a=>Array.from(e.querySelectorAll(a))).filter(a=>!a.closest(`.${d}`));let n=null,r=0;const o=a=>{const s=typeof a.innerText=="string"&&a.innerText.length>0?a.innerText:a.textContent||"";return ee(s)};return t.forEach(a=>{const s=o(a);s&&s.length>r&&(n=a,r=s.length)}),n},It=()=>{const e=new Set;Ye.forEach(o=>{document.querySelectorAll(o).forEach(a=>{e.add(a)})}),document.querySelectorAll(".thoughts-container .markdown.markdown-main-panel").forEach(o=>{const a=o.closest('[data-test-id="thoughts-content"], .thoughts-content, .thoughts-container')??o;e.add(a)});const t=Array.from(e).filter(Ct),n=t.filter(o=>!t.some(a=>a!==o&&o.contains(a))),r=n.filter(o=>o.matches(".thoughts-content-expanded"));return r.length>0?r:n},Mt=async e=>{const t=ee(e);if(!t)return"";const n=Ge.get(t);if(n)return n;const r=Lt(t),o=[];for(const s of r){const i=$e.get(s);if(i){o.push(i);continue}const m=s.replace(/\n/g,` ${ke} `),l=await chrome.runtime.sendMessage({type:"gm.translateThought",text:m,targetLang:"zh-CN"});if(!l?.ok)throw new Error(l?.error||"translation_failed");const c=new RegExp(`\\s*${ke}\\s*`,"g"),u=l.translatedText.replace(c,`
`);$e.set(s,u),o.push(u)}const a=ee(o.join(`

`));return Ge.set(t,a),a},Dt=e=>{const t=e.querySelector(`:scope > .${d}`);if(t instanceof HTMLDivElement)return t;const n=document.createElement("div");return n.className=d,e.appendChild(n),n},we=()=>{document.querySelectorAll(`.${d}`).forEach(e=>e.remove()),Ye.forEach(e=>{document.querySelectorAll(e).forEach(t=>{t.removeAttribute(R),t.removeAttribute(k),t.removeAttribute(Y),t.removeAttribute(b)})})},Ze=()=>{if(!I){we();return}const e=It();y("thought-container-scan",{count:e.length}),document.querySelectorAll(`.${d}`).forEach(t=>{const n=t.parentElement;n&&!e.includes(n)&&(t.remove(),n.removeAttribute(R),n.removeAttribute(k),n.removeAttribute(Y),n.removeAttribute(b))}),e.forEach(t=>{y("thought-root-found",{className:t.className});const n=Nt(t);if(!n)return;const r=ee(typeof n.innerText=="string"&&n.innerText.length>0?n.innerText:n.textContent||"");if(y("thought-text-extracted",{length:r.length,preview:r.slice(0,80)}),!r)return;const o=t.getAttribute(Y)??"",a=t.getAttribute(k)==="1",s=r.length-o.length,i=Date.now();if(a){s>=wt&&O.set(t,r);return}if(j>=vt){O.set(t,r);return}const m=ie.get(t)??0;if(o&&r!==o&&i-m<At)return;const l=Dt(t);if(!a&&t.getAttribute(R)==="1"&&o===r&&l.textContent){y("thought-translation-skipped-already-processed",{sourceLength:r.length});return}const c=(D.get(t)??0)+1;D.set(t,c),O.delete(t),ie.set(t,i),j+=1,t.setAttribute(k,"1"),t.setAttribute(Y,r),(!l.textContent||l.textContent==="翻译中...")&&(l.textContent="翻译中..."),l.removeAttribute(b),y("thought-translation-requested",{sourceLength:r.length}),Mt(r).then(u=>{D.get(t)===c&&I&&(l.textContent=u||"未返回可用翻译。",l.removeAttribute(b),t.setAttribute(R,"1"),t.removeAttribute(b),y("thought-translation-inserted",{sourceLength:r.length,translatedLength:u.length}))}).catch(u=>{D.get(t)===c&&(l.textContent=`翻译失败：${String(u)}`,l.setAttribute(b,"1"),t.setAttribute(b,"1"),t.removeAttribute(R),y("translate-failed",{sourceLength:r.length}))}).finally(()=>{j=Math.max(0,j-1),D.get(t)===c&&t.removeAttribute(k),O.has(t)&&(ie.delete(t),O.delete(t)),pe()})})},V=e=>(e instanceof Element?e:e.parentElement)?.closest(`.${d}`)!==null,W=e=>(e instanceof Element?e:e.parentElement)?.closest(xt)!==null,Ot=e=>e.some(t=>{if(t.type==="characterData")return V(t.target)?!1:W(t.target);if(V(t.target))return!1;if(W(t.target))return!0;for(const n of Array.from(t.addedNodes))if(!V(n)&&W(n))return!0;for(const n of Array.from(t.removedNodes))if(!V(n)&&W(n))return!0;return!1}),pe=()=>{if(!I){we();return}A!==null&&clearTimeout(A),A=window.setTimeout(()=>{A=null,Ze()},220)},Rt=()=>{[180,800,1800,3200].forEach(e=>{const t=window.setTimeout(()=>{J.delete(t),I&&Ze()},e);J.add(t)})};function Ut(){I=!0,St(),!C&&document.body&&(C=new MutationObserver(e=>{Ot(e)&&pe()}),C.observe(document.body,{childList:!0,subtree:!0,characterData:!0})),pe(),Rt()}function qt(){I=!1,C&&(C.disconnect(),C=null),A!==null&&(clearTimeout(A),A=null),J.forEach(e=>clearTimeout(e)),J.clear(),we(),document.getElementById(fe)?.remove()}export{T as S,tt as _,qt as a,Gt as b,Ut as c,kt as d,Ft as e,$t as s};
