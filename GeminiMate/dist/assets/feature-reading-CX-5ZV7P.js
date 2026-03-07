const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/vendor-mermaid-DbIDgO9_.js","assets/vendor-react-B-sxFqXu.js"])))=>i.map(i=>d[i]);
const y={FOLDER_DATA:"gvFolderData",FOLDER_DATA_AISTUDIO:"gvFolderDataAIStudio",LATEX_FIXER_ENABLED:"geminimate_latex_enabled",MARKDOWN_REPAIR_ENABLED:"geminimate_markdown_enabled",MERMAID_RENDER_ENABLED:"geminimate_mermaid_enabled",THOUGHT_TRANSLATION_ENABLED:"geminimate_thought_translation_enabled",FORMULA_COPY_ENABLED:"geminimate_formula_copy_enabled",FORMULA_COPY_FORMAT:"geminimate_formula_copy_format",WATERMARK_REMOVER_ENABLED:"geminiWatermarkRemoverEnabled",QUOTE_REPLY_ENABLED:"gvQuoteReplyEnabled",BOTTOM_CLEANUP_ENABLED:"geminimate_bottom_cleanup_enabled",DEBUG_MODE:"geminimate_debug_mode",DEBUG_LOGS:"geminimate_debug_logs",LANGUAGE:"geminimate_language",TIMELINE_ENABLED:"geminimate_timeline_enabled",TIMELINE_WIDTH:"geminimate_timeline_width",TIMELINE_AUTO_HIDE:"geminimate_timeline_auto_hide",TIMELINE_STARRED_MESSAGES:"geminiTimelineStarred",TIMELINE_SCROLL_MODE:"geminiTimelineScrollMode",GEMINI_CHAT_WIDTH:"geminimate_chat_width",GEMINI_EDIT_INPUT_WIDTH:"geminimate_edit_input_width",GEMINI_SIDEBAR_WIDTH:"geminimate_sidebar_width",GEMINI_SIDEBAR_AUTO_HIDE:"geminimate_sidebar_auto_hide",GEMINI_ZOOM_LEVEL:"geminimate_zoom_level",GEMINI_FONT_SIZE_SCALE:"geminimate_font_size_scale",GEMINI_FONT_WEIGHT:"geminimate_font_weight",GEMINI_FONT_FAMILY:"geminimate_font_family",GEMINI_SANS_PRESET:"geminimate_sans_preset",GEMINI_SERIF_PRESET:"geminimate_serif_preset",GEMINI_CUSTOM_FONTS:"geminimate_custom_fonts",GEMINI_LETTER_SPACING:"geminimate_letter_spacing",GEMINI_LINE_HEIGHT:"geminimate_line_height",GEMINI_PARAGRAPH_INDENT_ENABLED:"geminimate_paragraph_indent_enabled",GEMINI_EMPHASIS_MODE:"geminimate_emphasis_mode",GV_FOLDER_FILTER_USER_ONLY:"gvFolderFilterUserOnly",GV_FOLDER_TREE_INDENT:"gvFolderTreeIndent",GV_ACCOUNT_ISOLATION_ENABLED:"gvAccountIsolationEnabled",GV_ACCOUNT_ISOLATION_ENABLED_GEMINI:"gvAccountIsolationEnabledGemini",GV_ACCOUNT_ISOLATION_ENABLED_AISTUDIO:"gvAccountIsolationEnabledAIStudio",GV_ACCOUNT_PROFILE_MAP:"gvAccountProfileMap"},J=2e3,ee=`${y.DEBUG_LOGS}:`,be=e=>{if(e!==void 0)try{return JSON.parse(JSON.stringify(e))}catch{return String(e)}};class v{static instance;enabled=!1;initialized=!1;context="unknown";logsStorageKey=`${ee}unknown`;logs=[];flushTimer=null;storageListener=null;static getInstance(){return v.instance||(v.instance=new v),v.instance}async init(t){if(this.context=t,this.logsStorageKey=`${ee}${this.normalizeContext(t)}`,!this.initialized){this.initialized=!0;try{const n=await chrome.storage.local.get([y.DEBUG_MODE,this.logsStorageKey,y.DEBUG_LOGS]);this.enabled=n[y.DEBUG_MODE]===!0;const r=n[this.logsStorageKey]??n[y.DEBUG_LOGS];this.logs=Array.isArray(r)?r.slice(-J).map(o=>be(o)):[]}catch(n){console.warn("[GeminiMate][Debug] Failed to initialize debug service from storage",n),this.enabled=!1,this.logs=[]}this.storageListener=(n,r)=>{if(r!=="local")return;const o=n[y.DEBUG_MODE];o&&(this.enabled=o.newValue===!0,console.info("[GeminiMate][Debug] Debug mode changed",{enabled:this.enabled}),this.enabled&&this.log("debug","mode-enabled",{context:this.context}))},chrome.storage.onChanged.addListener(this.storageListener),console.info("[GeminiMate][Debug] Debug service initialized",{context:this.context,enabled:this.enabled})}}isEnabled(){return this.enabled}log(t,n,r){if(!this.enabled)return;const o={id:`${Date.now()}-${Math.random().toString(36).slice(2,8)}`,ts:new Date().toISOString(),source:t,action:n,context:this.context,detail:be(r)};this.logs.push(o),this.logs.length>J&&(this.logs=this.logs.slice(-J)),this.scheduleFlush()}async clearLogs(){this.logs=[];try{const t=await chrome.storage.local.get(null),n=Object.keys(t).filter(r=>r.startsWith(ee));n.length>0&&await chrome.storage.local.remove(n),await chrome.storage.local.set({[y.DEBUG_LOGS]:[]})}catch(t){console.warn("[GeminiMate][Debug] Failed to clear debug logs",t)}}scheduleFlush(){this.flushTimer===null&&(this.flushTimer=setTimeout(()=>{this.flushTimer=null,this.flush()},250))}async flush(){try{await chrome.storage.local.set({[this.logsStorageKey]:this.logs})}catch(t){console.warn("[GeminiMate][Debug] Failed to flush debug logs",t)}}normalizeContext(t){const n=t.trim().toLowerCase().replace(/[^a-z0-9_-]+/g,"-");return n.length>0?n:"unknown"}}const Tt=v.getInstance(),Fe="modulepreload",qe=function(e){return"/"+e},Ee={},Pe=function(t,n,r){let o=Promise.resolve();if(n&&n.length>0){let c=function(l){return Promise.all(l.map(d=>Promise.resolve(d).then(m=>({status:"fulfilled",value:m}),m=>({status:"rejected",reason:m}))))};document.getElementsByTagName("link");const a=document.querySelector("meta[property=csp-nonce]"),i=a?.nonce||a?.getAttribute("nonce");o=c(n.map(l=>{if(l=qe(l),l in Ee)return;Ee[l]=!0;const d=l.endsWith(".css"),m=d?'[rel="stylesheet"]':"";if(document.querySelector(`link[href="${l}"]${m}`))return;const f=document.createElement("link");if(f.rel=d?"stylesheet":Fe,d||(f.as="script"),f.crossOrigin="",f.href=l,i&&f.setAttribute("nonce",i),document.head.appendChild(f),d)return new Promise((Ge,Ue)=>{f.addEventListener("load",Ge),f.addEventListener("error",()=>Ue(new Error(`Unable to preload CSS for ${l}`)))})}))}function s(a){const i=new Event("vite:preloadError",{cancelable:!0});if(i.payload=a,window.dispatchEvent(i),!i.defaultPrevented)throw a}return o.then(a=>{for(const i of a||[])i.status==="rejected"&&s(i.reason);return t().catch(s)})},ne="gm-mermaid-style",k="gm-mermaid-diagram",E="gm-mermaid-toggle",g="gm-mermaid-toggle-button",ue="gm-code-download-button",b="gm-code-action-button",w="data-gm-mermaid-host",$="data-gm-code-download",Z="data-gm-mermaid-view",re="data-gm-mermaid-code",W="data-gm-mermaid-processing";let q=null,_e=!1,oe=!1,C=!1,xe=!0,x=null,A=null;const X=new Set;let R=null;const Se="Google Sans, Roboto, sans-serif";let S=Se;const ze=new Set(["代码段","代码","代码块","示例","示例代码","code","code snippet","snippet","example","sample","text","plain","plaintext","raw","output","result"]),Ve=["%%","graph","flowchart","sequenceDiagram","classDiagram","stateDiagram","erDiagram","gantt","pie","gitGraph","journey","mindmap","timeline","zenuml","quadrantChart","requirementDiagram","requirement","sankey-beta","sankey","C4Context","C4Container","C4Component","C4Dynamic","C4Deployment","xychart-beta","xychart","block-beta","block","packet-beta","packet","architecture-beta","architecture","kanban","radar-beta","treemap"],Be={bash:"sh",shell:"sh",sh:"sh",zsh:"sh",powershell:"ps1",ps1:"ps1",python:"py",py:"py",javascript:"js",js:"js",typescript:"ts",ts:"ts",tsx:"tsx",jsx:"jsx",json:"json",html:"html",css:"css",scss:"scss",sass:"sass",less:"less",markdown:"md",md:"md",yaml:"yml",yml:"yml",xml:"xml",sql:"sql",c:"c",cpp:"cpp","c++":"cpp",csharp:"cs",cs:"cs",java:"java",kotlin:"kt",go:"go",rust:"rs",ruby:"rb",php:"php",swift:"swift",dart:"dart",mermaid:"mmd"},We=`
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 3a1 1 0 0 1 1 1v8.59l2.3-2.29a1 1 0 1 1 1.4 1.41l-4 4a1 1 0 0 1-1.4 0l-4-4a1 1 0 0 1 1.4-1.41L11 12.59V4a1 1 0 0 1 1-1Zm-7 14a1 1 0 0 1 1 1v1h12v-1a1 1 0 1 1 2 0v2a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-2a1 1 0 0 1 1-1Z" fill="currentColor"/>
  </svg>
`,h=(e,t)=>{},Le=e=>e.replace(/[\u00A0\u2002\u2003\u2009\u3000]/g," ").replace(/[\u200B\u200C\u200D\uFEFF]/g,""),je=()=>{const e=[".markdown-main-panel",".markdown","body"];for(const t of e){const n=document.querySelector(t);if(!(n instanceof HTMLElement))continue;const r=(window.getComputedStyle(n).fontFamily||"").trim();if(r.length>0)return r}return Se},Ke=e=>e?ze.has(e.toLowerCase()):!0,Xe=e=>{const t=Le(e).trim();if(t.length<20||!Ve.some(a=>t.toLowerCase().startsWith(a.toLowerCase())))return!1;const r=t.split(`
`).filter(a=>a.trim().length>0);if(r.length<2)return!1;const o=r[r.length-1].trim();return!["-->","---","-.","==>",":::","[","(","{","|","&",","].some(a=>o.endsWith(a))},Ye=()=>{if(document.getElementById(ne))return;const e=document.createElement("style");e.id=ne,e.textContent=`
    .${E} {
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

    .${E} {
      order: 1;
      flex: 0 0 auto;
    }

    .${ue} {
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

    .${b} {
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

    .${b}:hover {
      background: rgba(148, 163, 184, 0.14);
      color: var(--gem-sys-color--on-surface, #111827);
    }

    .${b}:disabled {
      cursor: not-allowed;
      opacity: 0.45;
    }

    .${b} svg {
      width: 18px;
      height: 18px;
      display: block;
      fill: currentColor;
    }

    .${k} {
      display: none;
      padding: 16px 18px 18px;
      overflow-x: auto;
      text-align: center;
      cursor: zoom-in;
      border-top: 1px solid rgba(148, 163, 184, 0.16);
    }

    .${k} svg {
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

    .dark-theme .${E},
    html.dark .${E},
    body.dark .${E} {
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

    .dark-theme .${b},
    html.dark .${b},
    body.dark .${b} {
      color: rgba(226, 232, 240, 0.88);
    }
  `,document.head.appendChild(e)},Q=e=>{const t=e.closest(".code-block, code-block");if(!t)return null;const n=[e,e.closest("pre"),t];for(const a of n){if(!a)continue;const i=a.getAttribute("data-language")||a.getAttribute("data-lang")||a.getAttribute("lang");if(i?.trim())return i.trim().toLowerCase();const l=(a instanceof HTMLElement?a.className:a.getAttribute("class")||"").match(/(?:language|lang)-([a-z0-9+#._-]+)/i);if(l?.[1])return l[1].toLowerCase()}const r=t.querySelector(".code-block-decoration");return r&&r.querySelector(":scope > span")?.textContent?.trim().toLowerCase()||null},Ce=async()=>{if(q)return q;if(_e)return null;try{return q=(await Pe(()=>import("./vendor-mermaid-DbIDgO9_.js").then(t=>t.m),__vite__mapDeps([0,1]))).default,q}catch{return _e=!0,null}},Ie=async()=>{if(oe)return!0;const e=await Ce();if(!e)return!1;const t=document.body.classList.contains("dark-theme")||document.body.getAttribute("data-theme")==="dark"||document.documentElement.classList.contains("dark")||window.matchMedia("(prefers-color-scheme: dark)").matches;return S=je(),e.initialize({startOnLoad:!1,theme:t?"dark":"default",securityLevel:"loose",fontFamily:S,themeVariables:{fontFamily:S},logLevel:5}),oe=!0,!0},me=e=>e.replace(/\r\n/g,`
`).replace(/\r/g,`
`),Ne=e=>e.closest(".code-block, code-block"),He=e=>e.querySelector(".code-block-decoration"),Me=e=>{const t=He(e);if(!t)return null;const n=t.querySelector(":scope > .buttons");if(n instanceof HTMLElement)return n;const r=document.createElement("div");return r.className="buttons",t.appendChild(r),r},De=e=>e.querySelector(".code-block-decoration .buttons > .copy-button, .code-block-decoration .buttons > button.copy-button"),G=e=>e.querySelector('code[data-test-id="code-content"]')??e.querySelector(".formatted-code-block-internal-container code")??e.querySelector("pre code")??e.querySelector("code.code-container"),ge=(e,t)=>e.querySelector(".formatted-code-block-internal-container")??t?.closest(".formatted-code-block-internal-container")??t?.closest("pre")??t??null,U=e=>e.querySelector(`.${k}`),Ze=e=>{const t=e.cloneNode(!0);if(!(t instanceof SVGElement))return e.outerHTML;t.getAttribute("xmlns")||t.setAttribute("xmlns","http://www.w3.org/2000/svg"),t.getAttribute("xmlns:xlink")||t.setAttribute("xmlns:xlink","http://www.w3.org/1999/xlink");const n=t.querySelector("defs")??t.insertBefore(document.createElementNS("http://www.w3.org/2000/svg","defs"),t.firstChild),r=document.createElementNS("http://www.w3.org/2000/svg","style");return r.textContent=`text, tspan { font-family: ${S}; }`,n.appendChild(r),new XMLSerializer().serializeToString(t)},Qe=e=>{const t=e.querySelector("svg");t instanceof SVGElement&&(t.style.fontFamily=S,t.querySelectorAll("text, tspan").forEach(n=>{n instanceof SVGElement&&(n.style.fontFamily=S)}))},ye=()=>new Date().toISOString().replace(/[:.]/g,"-").replace("T","_").replace("Z",""),Oe=e=>{const t=(e??"").trim().toLowerCase();return t?Be[t]??"txt":"txt"},Ae=(e,t,n)=>{const r=new Blob(e,{type:n}),o=URL.createObjectURL(r),s=document.createElement("a");s.href=o,s.download=t,s.style.display="none",document.body.appendChild(s),s.click(),s.remove(),window.setTimeout(()=>URL.revokeObjectURL(o),1e3)},ae=e=>e.getAttribute(Z)==="code"?"code":"diagram",F=e=>{const t=e.querySelector(`[${$}="1"]`);if(!t)return;const n=G(e);me(n?.textContent||"");const r=Q(n??e),s=e.getAttribute(w)==="1"&&ae(e)==="diagram",a=U(e)?.querySelector("svg");if(s&&a instanceof SVGElement){t.disabled=!1,t.title="下载 Mermaid 图像",t.setAttribute("aria-label","下载 Mermaid 图像");return}t.disabled=!1;const i=Oe(r);t.title=`下载代码 (.${i})`,t.setAttribute("aria-label",`下载代码 (.${i})`)},Je=e=>{const t=G(e),n=me(t?.textContent||""),r=Q(t??e),o=e.getAttribute(w)==="1",s=o&&ae(e)==="diagram",a=U(e)?.querySelector("svg");if(s&&a instanceof SVGElement){const d=Ze(a),m=`geminimate-mermaid-${ye()}.svg`;Ae([d],m,"image/svg+xml;charset=utf-8");return}if(!n.trim())return;const i=Oe(r),c=`geminimate-code-${ye()}.${i}`;Ae([n],c,i==="json"?"application/json;charset=utf-8":i==="svg"?"image/svg+xml;charset=utf-8":"text/plain;charset=utf-8"),h("download-code",{view:o?ae(e):"code"})},et=e=>{const t=document.createElement("button");return t.type="button",t.className=`${b} ${ue}`,t.innerHTML=We,t.title=e,t.setAttribute("aria-label",e),t.setAttribute($,"1"),t},se=e=>{const t=Me(e);if(!t)return;let n=t.querySelector(`[${$}="1"]`);if(!n){const r=De(e);n=et("下载代码"),n.addEventListener("click",o=>{o.preventDefault(),o.stopPropagation(),Je(e)}),r?t.insertBefore(n,r):t.appendChild(n),h("download-button-inserted",{language:Q(G(e)??e)})}F(e)},Re=e=>e.querySelector(`.${E}`),ie=(e,t)=>{const n=U(e),r=ge(e,G(e)??void 0),o=t==="diagram"&&n?"diagram":"code";e.setAttribute(Z,o),n&&(n.style.display=o==="diagram"?"block":"none"),r&&(r.style.display=o==="diagram"?"none":""),e.querySelectorAll(`.${g}`).forEach(a=>{a.classList.toggle("active",a.dataset.view===o)}),F(e),h("view-updated",{mermaidHost:e.getAttribute(w)==="1"})},tt=(e,t)=>{let n=U(e);return n||(n=document.createElement("div"),n.className=k,n.addEventListener("click",()=>{n?.querySelector("svg")&&ot(n.innerHTML)}),t.parentElement?.insertBefore(n,t),n)},nt=e=>{const t=Me(e);if(!t||Re(e))return;const n=document.createElement("div");n.className=E;const r=document.createElement("button");r.type="button",r.className=`${g} active`,r.dataset.view="diagram",r.textContent="图表";const o=document.createElement("button");o.type="button",o.className=g,o.dataset.view="code",o.textContent="代码",r.addEventListener("click",c=>{c.preventDefault(),c.stopPropagation(),ie(e,"diagram")}),o.addEventListener("click",c=>{c.preventDefault(),c.stopPropagation(),ie(e,"code")}),n.append(r,o);const s=t.querySelector(`[${$}="1"]`),a=De(e),i=s??a;i?t.insertBefore(n,i):t.appendChild(n)},rt=(e,t)=>{const n=t.length>240?`${t.slice(0,240)}...`:t;e.innerHTML=`
    <div class="gm-mermaid-render-error">
      <strong>Mermaid 渲染失败</strong>
      <div>${n}</div>
      <div style="margin-top:8px;font-size:12px;">你仍然可以切回代码视图或直接下载源码。</div>
    </div>
  `},le=(e,t)=>{U(e)?.remove(),Re(e)?.remove(),t?e.querySelector(`[${$}="1"]`)?.remove():F(e);const o=ge(e,G(e)??void 0);o&&(o.style.display=""),e.removeAttribute(w),e.removeAttribute(Z),e.removeAttribute(re),e.removeAttribute(W)},j=()=>{if(!R)return;const e=R;e.classList.remove("visible"),R=null,window.setTimeout(()=>e.remove(),160)},ot=e=>{if(R)return;const t=document.createElement("div");t.className="gm-mermaid-modal";const n=document.createElement("button");n.className="gm-mermaid-modal-close",n.type="button",n.textContent="×";const r=document.createElement("div");r.className="gm-mermaid-modal-content",r.innerHTML=e,t.append(n,r),document.body.appendChild(t),R=t,n.addEventListener("click",j),t.addEventListener("click",s=>{s.target===t&&j()});const o=s=>{s.key==="Escape"&&(document.removeEventListener("keydown",o),j())};document.addEventListener("keydown",o),requestAnimationFrame(()=>t.classList.add("visible"))},at=async(e,t)=>{const n=Le(t),r=Ne(e);if(!r)return;if(r.getAttribute(re)===n){se(r),F(r);return}if(r.getAttribute(W)==="1")return;const o=ge(r,e);if(o){r.setAttribute(W,"1");try{if(!await Ie()){h("load-unavailable");return}const a=await Ce();if(!a)return;const i=tt(r,o);se(r),nt(r),r.setAttribute(w,"1");const c=`gm-mermaid-${Math.random().toString(36).slice(2,10)}`;try{const d=await a.render(c,n),m=typeof d=="string"?d:d.svg;i.innerHTML=m,Qe(i),h("rendered",{codeLength:n.length})}catch(d){rt(i,String(d)),h("render-failed",{error:String(d)})}r.setAttribute(re,n);const l=r.getAttribute(Z);ie(r,l==="code"?"code":"diagram")}finally{r.removeAttribute(W)}}},he=()=>{if(!C)return;const e=document.querySelectorAll('code[data-test-id="code-content"], .formatted-code-block-internal-container code, .code-block pre code, code.code-container'),t=new Set;h("scan-start",{codeCount:e.length}),e.forEach(n=>{const r=Ne(n);if(!r)return;t.add(r),se(r);const o=me(n.textContent||""),s=Q(n),a=r.closest('model-response, .model-response, [data-message-author-role="model"]'),i=!a||a.querySelector("message-actions")!==null;if(xe&&i&&(s==="mermaid"||Ke(s)&&Xe(o))){at(n,o);return}r.getAttribute(w)==="1"?(le(r,!1),h("mermaid-host-rolled-back",{codeLength:o.length})):F(r)}),document.querySelectorAll(`[${w}="1"]`).forEach(n=>{t.has(n)||le(n,!1)}),h("scan-end",{activeHostCount:t.size})},st=()=>{document.querySelectorAll(".code-block, code-block").forEach(e=>{le(e,!0)})},pe=()=>{C&&(A!==null&&clearTimeout(A),A=window.setTimeout(()=>{A=null,he()},350))},Te=()=>{[120,700,1600,3e3].forEach(e=>{const t=window.setTimeout(()=>{X.delete(t),C&&he()},e);X.add(t)})},it=()=>{x||!document.body||(x=new MutationObserver(e=>{e.some(n=>{const r=n.target instanceof Element?n.target:n.target.parentElement;if(r?.closest(`.${k}, .${E}, .${ue}`))return!1;if(r?.closest(".code-block, code-block, model-response"))return!0;for(const o of Array.from(n.addedNodes))if((o instanceof Element?o:o.parentElement)?.closest(".code-block, code-block, model-response"))return!0;return!1})&&(h("mutation-detected",{count:e.length}),pe())}),x.observe(document.body,{childList:!0,subtree:!0,characterData:!0}))};async function wt(){if(C){pe(),Te();return}C=!0,Ye(),it(),he(),Te(),Ie()}function vt(){x&&(x.disconnect(),x=null),A!==null&&(clearTimeout(A),A=null),X.forEach(e=>clearTimeout(e)),X.clear(),st(),j(),document.getElementById(ne)?.remove(),oe=!1,C=!1}function xt(e){xe=e,pe()}const ce="gm-thought-translation-style",u="gm-thought-translation",D="data-gm-thought-translated",O="data-gm-thought-processing",K="data-gm-thought-source",p="data-gm-thought-error",ke=['[data-test-id="thoughts-content"]',".thoughts-content",".thoughts-content-expanded",".thoughts-streaming",".thoughts-container"],lt=[":scope .markdown.markdown-main-panel",":scope > .markdown.markdown-main-panel",":scope .message-container message-content .markdown.markdown-main-panel",":scope .message-container message-content .markdown",":scope message-content .markdown.markdown-main-panel",":scope message-content .markdown",":scope .thought-content"],P=2800,ct=120,dt=450,ut='[data-test-id="thoughts-content"], .thoughts-content, .thoughts-content-expanded, .thoughts-streaming, .thoughts-container, .thoughts-wrapper',mt=1;let I=!0,L=null,T=null;const Y=new Set,we=new Map,ve=new Map,N=new WeakMap,M=new WeakMap,te=new WeakMap;let z=0;const _=(e,t)=>{},gt=()=>{if(document.getElementById(ce))return;const e=document.createElement("style");e.id=ce,e.textContent=`
    .${u} {
      margin-top: 12px;
      padding: 12px 14px;
      border-radius: 14px;
      border: 1px solid rgba(59, 130, 246, 0.18);
      background: rgba(59, 130, 246, 0.06);
      color: inherit;
      line-height: 1.72;
      white-space: pre-wrap;
    }

    .${u}::before {
      content: '思维链翻译';
      display: block;
      margin-bottom: 8px;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.08em;
      color: #2563eb;
    }

    .${u}[${p}="1"] {
      border-color: rgba(239, 68, 68, 0.24);
      background: rgba(239, 68, 68, 0.06);
    }

    .${u}[${p}="1"]::before {
      content: '思维链翻译失败';
      color: #dc2626;
    }

    /* ── Right-side side-by-side layout ── */
    /* When a translation block is present, show thought content and translation
       in a two-column flex row so the translation appears to the RIGHT. */
    .thoughts-content-expanded:has(.${u}),
    .thoughts-streaming:has(.${u}),
    .thoughts-content:has(.${u}) {
      display: flex !important;
      flex-direction: row !important;
      align-items: flex-start !important;
      gap: 20px !important;
    }

    /* Thought text takes the remaining space on the left */
    .thoughts-content-expanded > :not(.${u}),
    .thoughts-streaming > :not(.${u}),
    .thoughts-content > :not(.${u}) {
      flex: 1 1 0 !important;
      min-width: 0 !important;
    }

    /* Translation block is fixed-width on the right */
    .thoughts-content-expanded > .${u},
    .thoughts-streaming > .${u},
    .thoughts-content > .${u} {
      flex: 0 0 38% !important;
      max-width: 38% !important;
      margin-top: 0 !important;
      position: sticky;
      top: 8px;
      align-self: flex-start;
    }
  `,document.head.appendChild(e)},H=e=>e.replace(/\u00a0/g," ").replace(/\r/g,"").replace(/[ \t]+\n/g,`
`).replace(/\n{3,}/g,`

`).trim(),ht=e=>{const t=e.split(/\n{2,}/),n=[];let r="";return t.forEach(o=>{const s=r?`${r}

${o}`:o;if(s.length<=P){r=s;return}if(r&&n.push(r),o.length<=P){r=o;return}for(let a=0;a<o.length;a+=P)n.push(o.slice(a,a+P));r=""}),r&&n.push(r),n.length>0?n:[e]},pt=e=>e.matches(".thoughts-content-expanded")?!0:e.getAttribute("aria-hidden")==="true"||e.hasAttribute("hidden")?!1:e.offsetParent!==null||e.getClientRects().length>0?!0:e.closest(".thoughts-wrapper, .thoughts-container, thoughts-entry")!==null,ft=e=>{if(e.matches(".markdown.markdown-main-panel"))return e;const t=lt.flatMap(o=>Array.from(e.querySelectorAll(o))).filter(o=>!o.closest(`.${u}`));let n=null,r=0;return t.forEach(o=>{const s=H(o.textContent||"");s&&s.length>r&&(n=o,r=s.length)}),n},bt=()=>{const e=new Set;ke.forEach(o=>{document.querySelectorAll(o).forEach(s=>{e.add(s)})}),document.querySelectorAll(".thoughts-container .markdown.markdown-main-panel").forEach(o=>{const s=o.closest('[data-test-id="thoughts-content"], .thoughts-content, .thoughts-container')??o;e.add(s)});const t=Array.from(e).filter(pt),n=t.filter(o=>!t.some(s=>s!==o&&o.contains(s))),r=n.filter(o=>o.matches(".thoughts-content-expanded"));return r.length>0?r:n},Et=async e=>{const t=H(e);if(!t)return"";const n=we.get(t);if(n)return n;const r=ht(t),o=[];for(const a of r){const i=ve.get(a);if(i){o.push(i);continue}const c=await chrome.runtime.sendMessage({type:"gm.translateThought",text:a,targetLang:"zh-CN"});if(!c?.ok)throw new Error(c?.error||"translation_failed");ve.set(a,c.translatedText),o.push(c.translatedText)}const s=H(o.join(`

`));return we.set(t,s),s},_t=e=>{const t=e.querySelector(`:scope > .${u}`);if(t instanceof HTMLDivElement)return t;const n=document.createElement("div");return n.className=u,e.appendChild(n),n},fe=()=>{document.querySelectorAll(`.${u}`).forEach(e=>e.remove()),ke.forEach(e=>{document.querySelectorAll(e).forEach(t=>{t.removeAttribute(D),t.removeAttribute(O),t.removeAttribute(K),t.removeAttribute(p)})})},$e=()=>{if(!I){fe();return}const e=bt();_("thought-container-scan",{count:e.length}),document.querySelectorAll(`.${u}`).forEach(t=>{const n=t.parentElement;n&&!e.includes(n)&&(t.remove(),n.removeAttribute(D),n.removeAttribute(O),n.removeAttribute(K),n.removeAttribute(p))}),e.forEach(t=>{_("thought-root-found",{className:t.className});const n=ft(t);if(!n)return;const r=H(n.textContent||"");if(_("thought-text-extracted",{length:r.length,preview:r.slice(0,80)}),!r)return;const o=t.getAttribute(K)??"",s=t.getAttribute(O)==="1",a=r.length-o.length,i=Date.now();if(s){a>=ct&&M.set(t,r);return}if(z>=mt){M.set(t,r);return}const c=te.get(t)??0;if(o&&r!==o&&i-c<dt)return;const l=_t(t);if(!s&&t.getAttribute(D)==="1"&&o===r&&l.textContent){_("thought-translation-skipped-already-processed",{sourceLength:r.length});return}const d=(N.get(t)??0)+1;N.set(t,d),M.delete(t),te.set(t,i),z+=1,t.setAttribute(O,"1"),t.setAttribute(K,r),(!l.textContent||l.textContent==="翻译中...")&&(l.textContent="翻译中..."),l.removeAttribute(p),_("thought-translation-requested",{sourceLength:r.length}),Et(r).then(m=>{N.get(t)===d&&I&&(l.textContent=m||"未返回可用翻译。",l.removeAttribute(p),t.setAttribute(D,"1"),t.removeAttribute(p),_("thought-translation-inserted",{sourceLength:r.length,translatedLength:m.length}))}).catch(m=>{N.get(t)===d&&(l.textContent=`翻译失败：${String(m)}`,l.setAttribute(p,"1"),t.setAttribute(p,"1"),t.removeAttribute(D),_("translate-failed",{sourceLength:r.length}))}).finally(()=>{z=Math.max(0,z-1),N.get(t)===d&&t.removeAttribute(O),M.has(t)&&(te.delete(t),M.delete(t)),de()})})},V=e=>(e instanceof Element?e:e.parentElement)?.closest(`.${u}`)!==null,B=e=>(e instanceof Element?e:e.parentElement)?.closest(ut)!==null,yt=e=>e.some(t=>{if(t.type==="characterData")return V(t.target)?!1:B(t.target);if(V(t.target))return!1;if(B(t.target))return!0;for(const n of Array.from(t.addedNodes))if(!V(n)&&B(n))return!0;for(const n of Array.from(t.removedNodes))if(!V(n)&&B(n))return!0;return!1}),de=()=>{if(!I){fe();return}T!==null&&clearTimeout(T),T=window.setTimeout(()=>{T=null,$e()},220)},At=()=>{[180,800,1800,3200].forEach(e=>{const t=window.setTimeout(()=>{Y.delete(t),I&&$e()},e);Y.add(t)})};function St(){I=!0,gt(),!L&&document.body&&(L=new MutationObserver(e=>{yt(e)&&de()}),L.observe(document.body,{childList:!0,subtree:!0,characterData:!0})),de(),At()}function Lt(){I=!1,L&&(L.disconnect(),L=null),T!==null&&(clearTimeout(T),T=null),Y.forEach(e=>clearTimeout(e)),Y.clear(),fe(),document.getElementById(ce)?.remove()}export{y as S,Pe as _,Lt as a,wt as b,St as c,Tt as d,xt as e,vt as s};
