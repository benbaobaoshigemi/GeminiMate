const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/vendor-mermaid-DekUzk_f.js","assets/vendor-react-B-sxFqXu.js"])))=>i.map(i=>d[i]);
const T={FOLDER_DATA:"gvFolderData",FOLDER_DATA_AISTUDIO:"gvFolderDataAIStudio",LATEX_FIXER_ENABLED:"geminimate_latex_enabled",MARKDOWN_REPAIR_ENABLED:"geminimate_markdown_enabled",MERMAID_RENDER_ENABLED:"geminimate_mermaid_enabled",SVG_RENDER_ENABLED:"geminimate_svg_render_enabled",THOUGHT_TRANSLATION_ENABLED:"geminimate_thought_translation_enabled",FORMULA_COPY_ENABLED:"geminimate_formula_copy_enabled",FORMULA_COPY_FORMAT:"geminimate_formula_copy_format",WATERMARK_REMOVER_ENABLED:"geminiWatermarkRemoverEnabled",QUOTE_REPLY_ENABLED:"gvQuoteReplyEnabled",BOTTOM_CLEANUP_ENABLED:"geminimate_bottom_cleanup_enabled",DEBUG_MODE:"geminimate_debug_mode",DEBUG_LOGS:"geminimate_debug_logs",DEBUG_FILE_LOG_ENABLED:"geminimate_debug_file_log_enabled",DEBUG_CACHE_CAPTURE_ENABLED:"geminimate_debug_cache_capture_enabled",LANGUAGE:"geminimate_language",TIMELINE_ENABLED:"geminimate_timeline_enabled",TIMELINE_WIDTH:"geminimate_timeline_width",TIMELINE_AUTO_HIDE:"geminimate_timeline_auto_hide",TIMELINE_STARRED_MESSAGES:"geminiTimelineStarred",TIMELINE_SCROLL_MODE:"geminiTimelineScrollMode",GEMINI_CHAT_WIDTH:"geminimate_chat_width",GEMINI_EDIT_INPUT_WIDTH:"geminimate_edit_input_width",GEMINI_SIDEBAR_WIDTH:"geminimate_sidebar_width",GEMINI_SIDEBAR_AUTO_HIDE:"geminimate_sidebar_auto_hide",GEMINI_ZOOM_LEVEL:"geminimate_zoom_level",GEMINI_FONT_SIZE_SCALE:"geminimate_font_size_scale",GEMINI_FONT_WEIGHT:"geminimate_font_weight",GEMINI_FONT_FAMILY:"geminimate_font_family",GEMINI_SANS_PRESET:"geminimate_sans_preset",GEMINI_SERIF_PRESET:"geminimate_serif_preset",GEMINI_CUSTOM_FONTS:"geminimate_custom_fonts",GEMINI_LETTER_SPACING:"geminimate_letter_spacing",GEMINI_LINE_HEIGHT:"geminimate_line_height",GEMINI_PARAGRAPH_INDENT_ENABLED:"geminimate_paragraph_indent_enabled",GEMINI_EMPHASIS_MODE:"geminimate_emphasis_mode",GV_FOLDER_FILTER_USER_ONLY:"gvFolderFilterUserOnly",GV_FOLDER_TREE_INDENT:"gvFolderTreeIndent",GV_ACCOUNT_ISOLATION_ENABLED:"gvAccountIsolationEnabled",GV_ACCOUNT_ISOLATION_ENABLED_GEMINI:"gvAccountIsolationEnabledGemini",GV_ACCOUNT_ISOLATION_ENABLED_AISTUDIO:"gvAccountIsolationEnabledAIStudio",GV_ACCOUNT_PROFILE_MAP:"gvAccountProfileMap"},ae=2e3,se=`${T.DEBUG_LOGS}:`,Ae=e=>{if(e!==void 0)try{return JSON.parse(JSON.stringify(e))}catch{return String(e)}};class L{static instance;enabled=!1;initialized=!1;context="unknown";logsStorageKey=`${se}unknown`;logs=[];flushTimer=null;storageListener=null;static getInstance(){return L.instance||(L.instance=new L),L.instance}async init(t){if(this.context=t,this.logsStorageKey=`${se}${this.normalizeContext(t)}`,!this.initialized){this.initialized=!0;try{const n=await chrome.storage.local.get([T.DEBUG_MODE,this.logsStorageKey,T.DEBUG_LOGS]);this.enabled=n[T.DEBUG_MODE]===!0;const r=n[this.logsStorageKey]??n[T.DEBUG_LOGS];this.logs=Array.isArray(r)?r.slice(-ae).map(o=>Ae(o)):[]}catch(n){console.warn("[GeminiMate][Debug] Failed to initialize debug service from storage",n),this.enabled=!1,this.logs=[]}this.storageListener=(n,r)=>{if(r!=="local")return;const o=n[T.DEBUG_MODE];o&&(this.enabled=o.newValue===!0,console.info("[GeminiMate][Debug] Debug mode changed",{enabled:this.enabled}),this.enabled&&this.log("debug","mode-enabled",{context:this.context}))},chrome.storage.onChanged.addListener(this.storageListener),console.info("[GeminiMate][Debug] Debug service initialized",{context:this.context,enabled:this.enabled})}}isEnabled(){return this.enabled}log(t,n,r){if(!this.enabled)return;const o={id:`${Date.now()}-${Math.random().toString(36).slice(2,8)}`,ts:new Date().toISOString(),source:t,action:n,context:this.context,detail:Ae(r)};this.logs.push(o),this.logs.length>ae&&(this.logs=this.logs.slice(-ae)),this.forwardToBackground(o),this.scheduleFlush()}async clearLogs(){this.logs=[];try{const t=await chrome.storage.local.get(null),n=Object.keys(t).filter(r=>r.startsWith(se));n.length>0&&await chrome.storage.local.remove(n),await chrome.storage.local.set({[T.DEBUG_LOGS]:[]})}catch(t){console.warn("[GeminiMate][Debug] Failed to clear debug logs",t)}}scheduleFlush(){this.flushTimer===null&&(this.flushTimer=setTimeout(()=>{this.flushTimer=null,this.flush()},250))}async flush(){try{await chrome.storage.local.set({[this.logsStorageKey]:this.logs})}catch(t){console.warn("[GeminiMate][Debug] Failed to flush debug logs",t)}}normalizeContext(t){const n=t.trim().toLowerCase().replace(/[^a-z0-9_-]+/g,"-");return n.length>0?n:"unknown"}forwardToBackground(t){try{if(!chrome?.runtime?.id)return;const n={type:"gm.debug.ingest",entry:t};chrome.runtime.sendMessage(n)}catch{}}}const Gt=L.getInstance(),Qe="modulepreload",et=function(e){return"/"+e},ve={},tt=function(t,n,r){let o=Promise.resolve();if(n&&n.length>0){let m=function(l){return Promise.all(l.map(c=>Promise.resolve(c).then(u=>({status:"fulfilled",value:u}),u=>({status:"rejected",reason:u}))))};document.getElementsByTagName("link");const s=document.querySelector("meta[property=csp-nonce]"),i=s?.nonce||s?.getAttribute("nonce");o=m(n.map(l=>{if(l=et(l),l in ve)return;ve[l]=!0;const c=l.endsWith(".css"),u=c?'[rel="stylesheet"]':"";if(document.querySelector(`link[href="${l}"]${u}`))return;const h=document.createElement("link");if(h.rel=c?"stylesheet":Qe,c||(h.as="script"),h.crossOrigin="",h.href=l,i&&h.setAttribute("nonce",i),document.head.appendChild(h),c)return new Promise((re,oe)=>{h.addEventListener("load",re),h.addEventListener("error",()=>oe(new Error(`Unable to preload CSS for ${l}`)))})}))}function a(s){const i=new Event("vite:preloadError",{cancelable:!0});if(i.payload=s,window.dispatchEvent(i),!i.defaultPrevented)throw s}return o.then(s=>{for(const i of s||[])i.status==="rejected"&&a(i.reason);return t().catch(a)})},le="gm-mermaid-style",b="gm-mermaid-diagram",y="gm-mermaid-toggle",g="gm-mermaid-toggle-button",be="gm-code-download-button",_="gm-code-action-button",x="data-gm-mermaid-host",F="data-gm-code-download",te="data-gm-mermaid-view",ce="data-gm-mermaid-code",K="data-gm-mermaid-processing",de="data-gm-mermaid-font";let P=null,xe=!1,Z=!1,I=!1,Fe=!0,C=null,A=null;const J=new Set;let k=null,X=null;const Ue="'Google Sans', Roboto, 'PingFang SC', 'Noto Sans CJK SC', 'Microsoft YaHei', sans-serif";let f=Ue;const Se=new WeakSet,Le=new WeakSet,Ce=new WeakSet,nt=new Set(["代码段","代码","代码块","示例","示例代码","code","code snippet","snippet","example","sample","text","plain","plaintext","raw","output","result"]),rt=["%%","graph","flowchart","sequenceDiagram","classDiagram","stateDiagram","erDiagram","gantt","pie","gitGraph","journey","mindmap","timeline","zenuml","quadrantChart","requirementDiagram","requirement","sankey-beta","sankey","C4Context","C4Container","C4Component","C4Dynamic","C4Deployment","xychart-beta","xychart","block-beta","block","packet-beta","packet","architecture-beta","architecture","kanban","radar-beta","treemap"],ot={bash:"sh",shell:"sh",sh:"sh",zsh:"sh",powershell:"ps1",ps1:"ps1",python:"py",py:"py",javascript:"js",js:"js",typescript:"ts",ts:"ts",tsx:"tsx",jsx:"jsx",json:"json",html:"html",css:"css",scss:"scss",sass:"sass",less:"less",markdown:"md",md:"md",yaml:"yml",yml:"yml",xml:"xml",sql:"sql",c:"c",cpp:"cpp","c++":"cpp",csharp:"cs",cs:"cs",java:"java",kotlin:"kt",go:"go",rust:"rs",ruby:"rb",php:"php",swift:"swift",dart:"dart",mermaid:"mmd"},at=`
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 3a1 1 0 0 1 1 1v8.59l2.3-2.29a1 1 0 1 1 1.4 1.41l-4 4a1 1 0 0 1-1.4 0l-4-4a1 1 0 0 1 1.4-1.41L11 12.59V4a1 1 0 0 1 1-1Zm-7 14a1 1 0 0 1 1 1v1h12v-1a1 1 0 1 1 2 0v2a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-2a1 1 0 0 1 1-1Z" fill="currentColor"/>
  </svg>
`,p=(e,t)=>{},qe=e=>e.replace(/[\u00A0\u2002\u2003\u2009\u3000]/g," ").replace(/[\u200B\u200C\u200D\uFEFF]/g,""),Pe=()=>Ue,st=()=>{const e=Pe();return e===f?!1:(f=e,Z=!1,!0)},it=async()=>{if(!document.fonts?.ready)return;const e=document.fonts.ready;await Promise.race([e,new Promise(t=>{window.setTimeout(t,1200)})])},lt=e=>e?nt.has(e.toLowerCase()):!0,ct=e=>{const t=qe(e).trim();if(t.length<20||!rt.some(s=>t.toLowerCase().startsWith(s.toLowerCase())))return!1;const r=t.split(`
`).filter(s=>s.trim().length>0);if(r.length<2)return!1;const o=r[r.length-1].trim();return!["-->","---","-.","==>",":::","[","(","{","|","&",","].some(s=>o.endsWith(s))},dt=()=>{if(document.getElementById(le))return;const e=document.createElement("style");e.id=le,e.textContent=`
    .${y} {
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

    .${y} {
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

    .dark-theme .${y},
    html.dark .${y},
    body.dark .${y} {
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

    .dark-theme .${_},
    html.dark .${_},
    body.dark .${_} {
      color: rgba(226, 232, 240, 0.88);
    }
  `,document.head.appendChild(e)},ne=e=>{const t=e.closest(".code-block, code-block");if(!t)return null;const n=[e,e.closest("pre"),t];for(const s of n){if(!s)continue;const i=s.getAttribute("data-language")||s.getAttribute("data-lang")||s.getAttribute("lang");if(i?.trim())return i.trim().toLowerCase();const l=(s instanceof HTMLElement?s.className:s.getAttribute("class")||"").match(/(?:language|lang)-([a-z0-9+#._-]+)/i);if(l?.[1])return l[1].toLowerCase()}const r=t.querySelector(".code-block-decoration");return r&&r.querySelector(":scope > span")?.textContent?.trim().toLowerCase()||null},Be=async()=>{if(P)return P;if(xe)return null;try{return P=(await tt(()=>import("./vendor-mermaid-DekUzk_f.js").then(t=>t.m),__vite__mapDeps([0,1]))).default,P}catch{return xe=!0,null}},ze=async()=>{if(Z)return!0;const e=await Be();if(!e)return!1;const t=document.body.classList.contains("dark-theme")||document.body.getAttribute("data-theme")==="dark"||document.documentElement.classList.contains("dark")||window.matchMedia("(prefers-color-scheme: dark)").matches;return f=Pe(),e.initialize({startOnLoad:!1,theme:t?"dark":"default",securityLevel:"loose",fontFamily:f,themeVariables:{fontFamily:f},logLevel:5}),Z=!0,!0},Ee=e=>e.replace(/\r\n/g,`
`).replace(/\r/g,`
`),je=e=>e.closest(".code-block, code-block"),ut=e=>e.querySelector(".code-block-decoration"),Ve=e=>{const t=ut(e);if(!t)return null;const n=t.querySelector(":scope > .buttons");if(n instanceof HTMLElement)return n;const r=document.createElement("div");return r.className="buttons",t.appendChild(r),r},We=e=>e.querySelector(".code-block-decoration .buttons > .copy-button, .code-block-decoration .buttons > button.copy-button"),U=e=>e.querySelector('code[data-test-id="code-content"]')??e.querySelector(".formatted-code-block-internal-container code")??e.querySelector("pre code")??e.querySelector("code.code-container"),_e=(e,t)=>e.querySelector(".formatted-code-block-internal-container")??t?.closest(".formatted-code-block-internal-container")??t?.closest("pre")??t??null,D=e=>e.querySelector(`.${b}`),mt=e=>{const t=e.querySelector("defs")??e.insertBefore(document.createElementNS("http://www.w3.org/2000/svg","defs"),e.firstChild);let n=t.querySelector('style[data-gm-mermaid-font="1"]');n||(n=document.createElementNS("http://www.w3.org/2000/svg","style"),n.setAttribute("data-gm-mermaid-font","1"),t.appendChild(n)),n.textContent=`
    text, tspan, .label, .nodeLabel, .edgeLabel, foreignObject, foreignObject * {
      font-family: ${f} !important;
    }
    .label, .edgeLabel, foreignObject, foreignObject * {
      overflow: visible !important;
      line-height: 1.25 !important;
    }
  `},gt=e=>{const t=e.cloneNode(!0);if(!(t instanceof SVGElement))return e.outerHTML;t.getAttribute("xmlns")||t.setAttribute("xmlns","http://www.w3.org/2000/svg"),t.getAttribute("xmlns:xlink")||t.setAttribute("xmlns:xlink","http://www.w3.org/1999/xlink");const n=t.querySelector("defs")??t.insertBefore(document.createElementNS("http://www.w3.org/2000/svg","defs"),t.firstChild),r=document.createElementNS("http://www.w3.org/2000/svg","style");return r.textContent=`text, tspan, .label, .nodeLabel, .edgeLabel, foreignObject, foreignObject * { font-family: ${f} !important; }`,n.appendChild(r),new XMLSerializer().serializeToString(t)},Ne=e=>{const t=e.querySelector("svg");t instanceof SVGElement&&(t.style.setProperty("font-family",f,"important"),t.style.setProperty("overflow","visible","important"),mt(t),t.querySelectorAll(".label, .edgeLabel, foreignObject, foreignObject *").forEach(n=>{if(n instanceof SVGElement){n.style.setProperty("overflow","visible","important");return}n instanceof HTMLElement&&(n.style.setProperty("overflow","visible","important"),n.style.setProperty("line-height","1.25","important"))}))},Ie=(e,t)=>{Se.has(e)||(e.addEventListener("click",n=>{n.preventDefault(),n.stopPropagation(),ht(t)}),Se.add(e))},B=(e,t,n)=>{Le.has(e)||(e.addEventListener("click",r=>{r.preventDefault(),r.stopPropagation(),Ye(t,n)}),Le.add(e))},ue=e=>{Ce.has(e)||(e.addEventListener("click",()=>{e.querySelector("svg")&&Et(e.innerHTML)}),Ce.add(e))},Me=()=>new Date().toISOString().replace(/[:.]/g,"-").replace("T","_").replace("Z",""),Ke=e=>{const t=(e??"").trim().toLowerCase();return t?ot[t]??"txt":"txt"},De=(e,t,n)=>{const r=new Blob(e,{type:n}),o=URL.createObjectURL(r),a=document.createElement("a");a.href=o,a.download=t,a.style.display="none",document.body.appendChild(a),a.click(),a.remove(),window.setTimeout(()=>URL.revokeObjectURL(o),1e3)},me=e=>e.getAttribute(te)==="code"?"code":"diagram",q=e=>{const t=e.querySelector(`[${F}="1"]`);if(!t)return;const n=U(e);Ee(n?.textContent||"");const r=ne(n??e),a=e.getAttribute(x)==="1"&&me(e)==="diagram",s=D(e)?.querySelector("svg");if(a&&s instanceof SVGElement){t.disabled=!1,t.title="下载 Mermaid 图像",t.setAttribute("aria-label","下载 Mermaid 图像");return}t.disabled=!1;const i=Ke(r);t.title=`下载代码 (.${i})`,t.setAttribute("aria-label",`下载代码 (.${i})`)},ht=e=>{const t=U(e),n=Ee(t?.textContent||""),r=ne(t??e),o=e.getAttribute(x)==="1",a=o&&me(e)==="diagram",s=D(e)?.querySelector("svg");if(a&&s instanceof SVGElement){const c=gt(s),u=`geminimate-mermaid-${Me()}.svg`;De([c],u,"image/svg+xml;charset=utf-8");return}if(!n.trim())return;const i=Ke(r),m=`geminimate-code-${Me()}.${i}`;De([n],m,i==="json"?"application/json;charset=utf-8":i==="svg"?"image/svg+xml;charset=utf-8":"text/plain;charset=utf-8"),p("download-code",{view:o?me(e):"code"})},ft=e=>{const t=document.createElement("button");return t.type="button",t.className=`${_} ${be}`,t.innerHTML=at,t.title=e,t.setAttribute("aria-label",e),t.setAttribute(F,"1"),t},ge=e=>{const t=Ve(e);if(!t)return;let n=t.querySelector(`[${F}="1"]`);if(n)Ie(n,e);else{const r=We(e);n=ft("下载代码"),Ie(n,e),r?t.insertBefore(n,r):t.appendChild(n),p("download-button-inserted",{language:ne(U(e)??e)})}q(e)},Xe=e=>e.querySelector(`.${y}`),Ye=(e,t)=>{const n=D(e),r=_e(e,U(e)??void 0),o=t==="diagram"&&n?"diagram":"code";e.setAttribute(te,o),n&&(n.style.display=o==="diagram"?"block":"none"),r&&(r.style.display=o==="diagram"?"none":""),e.querySelectorAll(`.${g}`).forEach(s=>{s.classList.toggle("active",s.dataset.view===o)}),q(e),p("view-updated",{mermaidHost:e.getAttribute(x)==="1"})},pt=(e,t)=>{let n=D(e);return n?(ue(n),n):(n=document.createElement("div"),n.className=b,ue(n),t.parentElement?.insertBefore(n,t),n)},Oe=e=>{const t=Ve(e);if(!t)return;const n=Xe(e);if(n){const l=n.querySelector(`.${g}[data-view="diagram"]`),c=n.querySelector(`.${g}[data-view="code"]`);if(l&&c){B(l,e,"diagram"),B(c,e,"code");return}n.remove()}const r=document.createElement("div");r.className=y;const o=document.createElement("button");o.type="button",o.className=`${g} active`,o.dataset.view="diagram",o.textContent="图表";const a=document.createElement("button");a.type="button",a.className=g,a.dataset.view="code",a.textContent="代码",B(o,e,"diagram"),B(a,e,"code"),r.append(o,a);const s=t.querySelector(`[${F}="1"]`),i=We(e),m=s??i;m?t.insertBefore(r,m):t.appendChild(r)},bt=(e,t)=>{const n=t.length>240?`${t.slice(0,240)}...`:t;e.innerHTML=`
    <div class="gm-mermaid-render-error">
      <strong>Mermaid 渲染失败</strong>
      <div>${n}</div>
      <div style="margin-top:8px;font-size:12px;">你仍然可以切回代码视图或直接下载源码。</div>
    </div>
  `},he=(e,t)=>{D(e)?.remove(),Xe(e)?.remove(),t?e.querySelector(`[${F}="1"]`)?.remove():q(e);const o=_e(e,U(e)??void 0);o&&(o.style.display=""),e.removeAttribute(x),e.removeAttribute(te),e.removeAttribute(ce),e.removeAttribute(de),e.removeAttribute(K)},Y=()=>{if(X&&(document.removeEventListener("keydown",X),X=null),!k)return;const e=k;e.classList.remove("visible"),k=null,window.setTimeout(()=>e.remove(),160)},Et=e=>{if(k)return;const t=document.createElement("div");t.className="gm-mermaid-modal";const n=document.createElement("button");n.className="gm-mermaid-modal-close",n.type="button",n.textContent="×";const r=document.createElement("div");r.className="gm-mermaid-modal-content",r.innerHTML=e,t.append(n,r),document.body.appendChild(t),k=t,n.addEventListener("click",Y),t.addEventListener("click",a=>{a.target===t&&Y()});const o=a=>{a.key==="Escape"&&Y()};X=o,document.addEventListener("keydown",o),requestAnimationFrame(()=>t.classList.add("visible"))},_t=async(e,t)=>{const n=qe(t),r=je(e);if(!r)return;const o=st(),s=(r.getAttribute(de)??"")!==f,i=D(r),m=i?.querySelector("svg")instanceof SVGElement;if(r.getAttribute(ce)===n&&!o&&!s&&m){ge(r),Oe(r),i&&(ue(i),Ne(i)),q(r);return}if(r.getAttribute(K)==="1")return;const l=_e(r,e);if(l){r.setAttribute(K,"1");try{if(await it(),!await ze()){p("load-unavailable");return}const u=await Be();if(!u)return;const h=pt(r,l);ge(r),Oe(r),r.setAttribute(x,"1");const re=`gm-mermaid-${Math.random().toString(36).slice(2,10)}`;try{const S=await u.render(re,n),Je=typeof S=="string"?S:S.svg;h.innerHTML=Je,Ne(h),p("rendered",{codeLength:n.length})}catch(S){bt(h,String(S)),p("render-failed",{error:String(S)})}r.setAttribute(ce,n),r.setAttribute(de,f);const oe=r.getAttribute(te);Ye(r,oe==="code"?"code":"diagram")}finally{r.removeAttribute(K)}}},ye=()=>{if(!I)return;const e=document.querySelectorAll('code[data-test-id="code-content"], .formatted-code-block-internal-container code, .code-block pre code, code.code-container'),t=new Set;p("scan-start",{codeCount:e.length}),e.forEach(n=>{const r=je(n);if(!r)return;t.add(r),ge(r);const o=Ee(n.textContent||""),a=ne(n),s=r.closest('model-response, .model-response, [data-message-author-role="model"]'),i=!s||s.querySelector("message-actions")!==null;if(Fe&&i&&(a==="mermaid"||lt(a)&&ct(o))){_t(n,o);return}r.getAttribute(x)==="1"?(he(r,!1),p("mermaid-host-rolled-back",{codeLength:o.length})):q(r)}),document.querySelectorAll(`[${x}="1"]`).forEach(n=>{t.has(n)||he(n,!1)}),p("scan-end",{activeHostCount:t.size})},yt=()=>{document.querySelectorAll(".code-block, code-block").forEach(e=>{he(e,!0)})},we=()=>{I&&(A!==null&&clearTimeout(A),A=window.setTimeout(()=>{A=null,ye()},350))},Re=()=>{[120,700,1600,3e3].forEach(e=>{const t=window.setTimeout(()=>{J.delete(t),I&&ye()},e);J.add(t)})},wt=()=>{C||!document.body||(C=new MutationObserver(e=>{e.some(n=>{const r=n.target instanceof Element?n.target:n.target.parentElement;if(r?.closest(`.${b}, .${y}, .${be}`))return!1;if(r?.closest(".code-block, code-block, model-response"))return!0;for(const o of Array.from(n.addedNodes))if((o instanceof Element?o:o.parentElement)?.closest(".code-block, code-block, model-response"))return!0;return!1})&&(p("mutation-detected",{count:e.length}),we())}),C.observe(document.body,{childList:!0,subtree:!0,characterData:!0}))};async function kt(){if(I){we(),Re();return}I=!0,dt(),wt(),ye(),Re(),ze()}function Ft(){C&&(C.disconnect(),C=null),A!==null&&(clearTimeout(A),A=null),J.forEach(e=>clearTimeout(e)),J.clear(),yt(),Y(),document.getElementById(le)?.remove(),Z=!1,I=!1}function Ut(e){Fe=e,we()}const fe="gm-thought-translation-style",d="gm-thought-translation",$="data-gm-thought-translated",G="data-gm-thought-processing",H="data-gm-thought-source",E="data-gm-thought-error",He=['[data-test-id="thoughts-content"]',".thoughts-content",".thoughts-content-expanded",".thoughts-streaming",".thoughts-container"],Tt=[":scope .markdown.markdown-main-panel",":scope > .markdown.markdown-main-panel",":scope .message-container message-content .markdown.markdown-main-panel",":scope .message-container message-content .markdown",":scope message-content .markdown.markdown-main-panel",":scope message-content .markdown",":scope .thought-content"],z=2800,At=120,vt=450,xt='[data-test-id="thoughts-content"], .thoughts-content, .thoughts-content-expanded, .thoughts-streaming, .thoughts-container, .thoughts-wrapper',St=1,$e="__GM_THOUGHT_NL_9F2E__";let M=!0,N=null,v=null;const Q=new Set,Ge=new Map,ke=new Map,O=new WeakMap,R=new WeakMap,ie=new WeakMap;let j=0;const w=(e,t)=>{},Lt=()=>{if(document.getElementById(fe))return;const e=document.createElement("style");e.id=fe,e.textContent=`
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

    .${d}[${E}="1"] {
      border-color: rgba(239, 68, 68, 0.24);
      background: rgba(239, 68, 68, 0.06);
    }

    .${d}[${E}="1"]::before {
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

`).trim(),Ct=e=>{const t=e.split(/\n{2,}/),n=[];let r="";return t.forEach(o=>{const a=r?`${r}

${o}`:o;if(a.length<=z){r=a;return}if(r&&n.push(r),o.length<=z){r=o;return}for(let s=0;s<o.length;s+=z)n.push(o.slice(s,s+z));r=""}),r&&n.push(r),n.length>0?n:[e]},Nt=e=>e.matches(".thoughts-content-expanded")?!0:e.getAttribute("aria-hidden")==="true"||e.hasAttribute("hidden")?!1:e.offsetParent!==null||e.getClientRects().length>0?!0:e.closest(".thoughts-wrapper, .thoughts-container, thoughts-entry")!==null,It=e=>{if(e.matches(".markdown.markdown-main-panel"))return e;const t=Tt.flatMap(a=>Array.from(e.querySelectorAll(a))).filter(a=>!a.closest(`.${d}`));let n=null,r=0;const o=a=>{const s=typeof a.innerText=="string"&&a.innerText.length>0?a.innerText:a.textContent||"";return ee(s)};return t.forEach(a=>{const s=o(a);s&&s.length>r&&(n=a,r=s.length)}),n},Mt=()=>{const e=new Set;He.forEach(o=>{document.querySelectorAll(o).forEach(a=>{e.add(a)})}),document.querySelectorAll(".thoughts-container .markdown.markdown-main-panel").forEach(o=>{const a=o.closest('[data-test-id="thoughts-content"], .thoughts-content, .thoughts-container')??o;e.add(a)});const t=Array.from(e).filter(Nt),n=t.filter(o=>!t.some(a=>a!==o&&o.contains(a))),r=n.filter(o=>o.matches(".thoughts-content-expanded"));return r.length>0?r:n},Dt=async e=>{const t=ee(e);if(!t)return"";const n=Ge.get(t);if(n)return n;const r=Ct(t),o=[];for(const s of r){const i=ke.get(s);if(i){o.push(i);continue}const m=s.replace(/\n/g,` ${$e} `),l=await chrome.runtime.sendMessage({type:"gm.translateThought",text:m,targetLang:"zh-CN"});if(!l?.ok)throw new Error(l?.error||"translation_failed");const c=new RegExp(`\\s*${$e}\\s*`,"g"),u=l.translatedText.replace(c,`
`);ke.set(s,u),o.push(u)}const a=ee(o.join(`

`));return Ge.set(t,a),a},Ot=e=>{const t=e.querySelector(`:scope > .${d}`);if(t instanceof HTMLDivElement)return t;const n=document.createElement("div");return n.className=d,e.appendChild(n),n},Te=()=>{document.querySelectorAll(`.${d}`).forEach(e=>e.remove()),He.forEach(e=>{document.querySelectorAll(e).forEach(t=>{t.removeAttribute($),t.removeAttribute(G),t.removeAttribute(H),t.removeAttribute(E)})})},Ze=()=>{if(!M){Te();return}const e=Mt();w("thought-container-scan",{count:e.length}),document.querySelectorAll(`.${d}`).forEach(t=>{const n=t.parentElement;n&&!e.includes(n)&&(t.remove(),n.removeAttribute($),n.removeAttribute(G),n.removeAttribute(H),n.removeAttribute(E))}),e.forEach(t=>{w("thought-root-found",{className:t.className});const n=It(t);if(!n)return;const r=ee(typeof n.innerText=="string"&&n.innerText.length>0?n.innerText:n.textContent||"");if(w("thought-text-extracted",{length:r.length,preview:r.slice(0,80)}),!r)return;const o=t.getAttribute(H)??"",a=t.getAttribute(G)==="1",s=r.length-o.length,i=Date.now();if(a){s>=At&&R.set(t,r);return}if(j>=St){R.set(t,r);return}const m=ie.get(t)??0;if(o&&r!==o&&i-m<vt)return;const l=Ot(t);if(!a&&t.getAttribute($)==="1"&&o===r&&l.textContent){w("thought-translation-skipped-already-processed",{sourceLength:r.length});return}const c=(O.get(t)??0)+1;O.set(t,c),R.delete(t),ie.set(t,i),j+=1,t.setAttribute(G,"1"),t.setAttribute(H,r),(!l.textContent||l.textContent==="翻译中...")&&(l.textContent="翻译中..."),l.removeAttribute(E),w("thought-translation-requested",{sourceLength:r.length}),Dt(r).then(u=>{O.get(t)===c&&M&&(l.textContent=u||"未返回可用翻译。",l.removeAttribute(E),t.setAttribute($,"1"),t.removeAttribute(E),w("thought-translation-inserted",{sourceLength:r.length,translatedLength:u.length}))}).catch(u=>{O.get(t)===c&&(l.textContent=`翻译失败：${String(u)}`,l.setAttribute(E,"1"),t.setAttribute(E,"1"),t.removeAttribute($),w("translate-failed",{sourceLength:r.length}))}).finally(()=>{j=Math.max(0,j-1),O.get(t)===c&&t.removeAttribute(G),R.has(t)&&(ie.delete(t),R.delete(t)),pe()})})},V=e=>(e instanceof Element?e:e.parentElement)?.closest(`.${d}`)!==null,W=e=>(e instanceof Element?e:e.parentElement)?.closest(xt)!==null,Rt=e=>e.some(t=>{if(t.type==="characterData")return V(t.target)?!1:W(t.target);if(V(t.target))return!1;if(W(t.target))return!0;for(const n of Array.from(t.addedNodes))if(!V(n)&&W(n))return!0;for(const n of Array.from(t.removedNodes))if(!V(n)&&W(n))return!0;return!1}),pe=()=>{if(!M){Te();return}v!==null&&clearTimeout(v),v=window.setTimeout(()=>{v=null,Ze()},220)},$t=()=>{[180,800,1800,3200].forEach(e=>{const t=window.setTimeout(()=>{Q.delete(t),M&&Ze()},e);Q.add(t)})};function qt(){M=!0,Lt(),!N&&document.body&&(N=new MutationObserver(e=>{Rt(e)&&pe()}),N.observe(document.body,{childList:!0,subtree:!0,characterData:!0})),pe(),$t()}function Pt(){M=!1,N&&(N.disconnect(),N=null),v!==null&&(clearTimeout(v),v=null),Q.forEach(e=>clearTimeout(e)),Q.clear(),Te(),document.getElementById(fe)?.remove()}export{T as S,tt as _,Pt as a,kt as b,qt as c,Gt as d,Ut as e,Ft as s};
