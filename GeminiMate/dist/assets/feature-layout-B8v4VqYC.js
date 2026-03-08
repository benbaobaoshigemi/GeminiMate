import{S as r,d as ie}from"./feature-reading-Yu-Fs4wA.js";const U="geminimate-chat-width",V=100,k=100,$=170,Ee=960;let I=Ee;const be="[GM-ChatWidth]",R=(t,e={})=>{try{console.info(be,{event:t,detail:e,ts:new Date().toISOString()}),ie.log("chat-width",t,e)}catch{}};function J(){return[".user-query-bubble-container",".user-query-container","user-query-content","user-query",'div[aria-label="User message"]','article[data-author="user"]','[data-message-author-role="user"]']}function Q(){return["model-response",".model-response","response-container",".response-container",".presented-response-container",'[aria-label="Gemini response"]','[data-message-author-role="assistant"]','[data-message-author-role="model"]','article[data-author="assistant"]']}function Ie(){return["table-block",".table-block","table-block .table-block","table-block .table-content",".table-block.new-table-style",".table-block.has-scrollbar",".table-block .table-content",".table-block-component",".table-block-component > response-element",".table-block-component response-element",".table-block-component table-block",".table-block-component .horizontal-scroll-wrapper",".table-block-component .table-footer",".horizontal-scroll-wrapper",".table-footer"]}const nt=(t,e,n)=>Math.min(n,Math.max(e,Math.round(t))),F=t=>{const e=Math.max(window.innerWidth,1);return t/e*100},Ht=t=>{const e=[];for(const n of t){const o=document.querySelector(n);if(!o)continue;const i=o.getBoundingClientRect(),a=window.getComputedStyle(o);if(e.push({selector:n,tag:o.tagName.toLowerCase(),className:o.className||"",rectWidthVw:Number(F(i.width).toFixed(3)),computedMaxWidth:a.maxWidth}),e.length>=4)break}return e},Se=t=>{const e=t.trim().toLowerCase();if(!e||e==="none"||e==="auto"||!e.endsWith("px"))return null;const n=Number.parseFloat(e);return Number.isFinite(n)?n:null},Pt=t=>{const e=[];for(const n of t){const o=Array.from(document.querySelectorAll(n));for(const i of o){const a=i.getBoundingClientRect();if(a.width<120||a.height<16)continue;const l=window.getComputedStyle(i);if(l.display==="none"||l.visibility==="hidden")continue;const d=Se(l.maxWidth);d!==null&&(d<120||d>window.innerWidth||e.push(d))}}return e.length===0?null:(e.sort((n,o)=>n-o),e[Math.floor(e.length/2)]??null)},ct=t=>{for(const e of t){const n=Array.from(document.querySelectorAll(e));for(const o of n){const i=o.getBoundingClientRect();if(i.width<120||i.height<16)continue;const a=window.getComputedStyle(o);if(!(a.display==="none"||a.visibility==="hidden"))return i.width}}return null},dt=()=>{const t=document.getElementById(U),e=t?.textContent??null;t&&(t.textContent="");const n=ct(Q())??ct(J())??Pt(Q())??Pt(J())??ct([".presented-response-container","model-response",".response-container"]);t&&e!==null&&(t.textContent=e),n&&Number.isFinite(n)&&n>120&&n<=window.innerWidth?(I=n,R("native-base-measured",{nativeBasePx:I,nativeBaseVw:Number(F(I).toFixed(3))})):R("native-base-measure-fallback",{measured:n,assistantSnapshot:Ht(Q()),userSnapshot:Ht(J())})},Wt=t=>{const e=Number(t);if(!Number.isFinite(e))return V;if(e>=k&&e<=$)return nt(e,k,$);if(e>0){const n=e/Math.max(I,1)*100;return nt(n,k,$)}return V},ge=t=>{const e=nt(t,k,$);return I*e/100},we=()=>{let t=document.getElementById(U);return t||(t=document.createElement("style"),t.id=U,document.head.appendChild(t)),t};function K(t){const e=nt(t,k,$);if(e===V){const c=document.getElementById(U);c&&c.remove(),R("apply-native",{uiPercent:e,nativeBasePx:I,nativeBaseVw:Number(F(I).toFixed(3))});return}const n=ge(e);R("apply-scaled",{uiPercent:e,nativeBasePx:I,nativeBaseVw:Number(F(I).toFixed(3)),targetWidthPx:n,targetWidthVw:Number(F(n).toFixed(3))});const o=`${n.toFixed(3)}px`,i=we(),a=J(),l=Q(),d=Ie(),u=a.map(c=>`${c}`).join(`,
    `),s=l.map(c=>`${c}`).join(`,
    `),S=d.map(c=>`${c}`).join(`,
    `);R("apply-style-scope",{uiPercent:e,widthValue:o,userSelectors:a.length,assistantSelectors:l.length,tableSelectors:d.length}),i.textContent=`
    chat-window-content > .conversation-container,
    .chat-history-scroll-container > .conversation-container,
    .chat-history > .conversation-container,
    .conversation-container {
      max-width: ${o} !important;
      box-sizing: border-box !important;
    }

    ${u} {
      max-width: ${o} !important;
    }

    ${s} {
      max-width: ${o} !important;
    }

    ${S} {
      max-width: ${o} !important;
      box-sizing: border-box !important;
    }

    .horizontal-scroll-wrapper,
    .horizontal-scroll-wrapper > .table-block-component,
    .table-block-component,
    .table-block-component > response-element,
    .table-block-component response-element,
    .table-block-component table-block,
    table-block,
    table-block .table-block,
    .table-block,
    .table-block.has-scrollbar,
    .table-block.new-table-style {
      display: block !important;
      width: 100% !important;
      max-width: 100% !important;
      min-width: 0 !important;
      box-sizing: border-box !important;
    }

    table-block .table-block,
    .table-block.has-scrollbar,
    .table-block.new-table-style {
      overflow-x: hidden !important;
    }

    table-block .table-content,
    .table-block .table-content,
    .table-block-component .horizontal-scroll-wrapper,
    .horizontal-scroll-wrapper {
      width: 100% !important;
      max-width: 100% !important;
      min-width: 0 !important;
      overflow-x: auto !important;
      box-sizing: border-box !important;
    }

    table-block .table-footer,
    .table-block .table-footer,
    .table-block-component .table-footer,
    .table-footer {
      width: 100% !important;
      max-width: 100% !important;
      min-width: 0 !important;
      box-sizing: border-box !important;
    }

    model-response:has(> .deferred-response-indicator),
    .response-container:has(img[src*="sparkle"]), 
    main > div:has(img[src*="sparkle"]) {
      max-width: ${o} !important;
    }

    .user-query-bubble-with-background {
      max-width: ${o} !important;
      width: fit-content !important;
    }
  `}function bn(){let t=V;dt(),chrome.storage.local.get([r.GEMINI_CHAT_WIDTH],i=>{const a=i[r.GEMINI_CHAT_WIDTH];t=Wt(a),K(t)}),chrome.storage.onChanged.addListener((i,a)=>{if(a==="local"&&i[r.GEMINI_CHAT_WIDTH]){const l=i[r.GEMINI_CHAT_WIDTH].newValue;t=Wt(l),K(t)}});let e=null;const n=new MutationObserver(()=>{e!==null&&clearTimeout(e),e=window.setTimeout(()=>{t===V&&dt(),K(t),e=null},200)}),o=document.querySelector("main");o&&n.observe(o,{childList:!0,subtree:!0}),window.addEventListener("resize",()=>{dt(),K(t)}),window.addEventListener("beforeunload",()=>{n.disconnect();const i=document.getElementById(U);i&&i.remove()},{once:!0})}const G="geminimate-edit-input-width",q=100,D=50,H=170,_e=60;let M=_e;const Te="[GM-EditWidth]",P=(t,e={})=>{try{console.info(Te,{event:t,detail:e,ts:new Date().toISOString()}),ie.log("edit-width",t,e)}catch{}},ot=(t,e,n)=>Math.min(n,Math.max(e,Math.round(t))),Lt=t=>{const e=Math.max(window.innerWidth,1);return t/e*100},Bt=t=>{const e=[];for(const n of t){const o=document.querySelector(n);if(!o)continue;const i=o.getBoundingClientRect(),a=window.getComputedStyle(o);if(e.push({selector:n,tag:o.tagName.toLowerCase(),className:o.className||"",rectWidthVw:Number(Lt(i.width).toFixed(3)),computedMaxWidth:a.maxWidth}),e.length>=4)break}return e},Ne=t=>{const e=t.trim().toLowerCase();if(!e||e==="none"||e==="auto"||!e.endsWith("px"))return null;const n=Number.parseFloat(e);return Number.isFinite(n)?n:null},ye=t=>{const e=[];for(const n of t){const o=Array.from(document.querySelectorAll(n));for(const i of o){const a=i.getBoundingClientRect();if(a.width<120||a.height<16)continue;const l=window.getComputedStyle(i);if(l.display==="none"||l.visibility==="hidden")continue;const d=Ne(l.maxWidth);d!==null&&(d<120||d>window.innerWidth||e.push(Lt(d)))}}return e.length===0?null:(e.sort((n,o)=>n-o),e[Math.floor(e.length/2)]??null)},Ot=t=>{for(const e of t){const n=Array.from(document.querySelectorAll(e));for(const o of n){const i=o.getBoundingClientRect();if(i.width<120||i.height<16)continue;const a=window.getComputedStyle(o);if(!(a.display==="none"||a.visibility==="hidden"))return Lt(i.width)}}return null},Ut=()=>{const t=document.getElementById(G),e=t?.textContent??null;t&&(t.textContent="");const n=ye(["input-container fieldset.input-area-container","chat-window input-container fieldset.input-area-container",".query-content.edit-mode",".edit-container"])??Ot(["input-container fieldset.input-area-container","chat-window input-container fieldset.input-area-container",".query-content.edit-mode",".edit-container"])??Ot(bt());t&&e!==null&&(t.textContent=e),n&&Number.isFinite(n)&&n>20&&n<=100?(M=n,P("native-base-measured",{nativeBaseVw:M})):P("native-base-measure-fallback",{measured:n,editSnapshot:Bt(bt()),inputSnapshot:Bt(["input-container fieldset.input-area-container","chat-window input-container fieldset.input-area-container"])})},Vt=t=>{const e=Number(t);if(!Number.isFinite(e))return q;if(e>=D&&e<=H)return ot(e,D,H);if(e>0){const n=e/Math.max(M,1)*100;return ot(n,D,H)}return q},Ce=t=>{const e=ot(t,D,H);return M*e/100};function bt(){return[".query-content.edit-mode","div.edit-mode",'[class*="edit-mode"]']}function ut(t){const e=ot(t,D,H);if(e===q){const u=document.getElementById(G);u&&u.remove(),P("apply-native",{uiPercent:e,nativeBaseVw:M});return}const n=Ce(e);P("apply-scaled",{uiPercent:e,nativeBaseVw:M,targetWidthVw:n});const o=`${n.toFixed(3)}vw`,i=`width: min(100%, ${o}) !important;`;let a=document.getElementById(G);a||(a=document.createElement("style"),a.id=G,document.head.appendChild(a));const l=bt(),d=l.map(u=>`${u}`).join(`,
    `);P("apply-style-scope",{uiPercent:e,widthValue:o,editModeSelectors:l.length}),a.textContent=`
    ${d} {
      max-width: ${o} !important;
      ${i}
      margin-left: auto !important;
      margin-right: auto !important;
    }

    .edit-mode .edit-container,
    .query-content.edit-mode .edit-container {
      max-width: ${o} !important;
      ${i}
      margin-left: auto !important;
      margin-right: auto !important;
    }

    .edit-mode .mat-mdc-form-field,
    .edit-container .mat-mdc-form-field,
    .edit-mode .edit-form {
      max-width: ${o} !important;
      width: 100% !important;
    }

    .edit-mode .mat-mdc-text-field-wrapper,
    .edit-mode .mat-mdc-form-field-flex,
    .edit-mode .mdc-text-field {
      max-width: ${o} !important;
      width: 100% !important;
    }

    .edit-mode .mat-mdc-form-field-infix {
      max-width: ${o} !important;
      width: 100% !important;
    }

    .edit-mode textarea,
    .edit-container textarea,
    .edit-mode .mat-mdc-input-element,
    .edit-mode .cdk-textarea-autosize {
      max-width: 100% !important;
      width: 100% !important;
      box-sizing: border-box !important;
    }

    input-container fieldset.input-area-container,
    chat-window input-container fieldset.input-area-container {
      max-width: ${o} !important;
      ${i}
      margin-left: auto !important;
      margin-right: auto !important;
    }

    input-container .input-area-container,
    input-area-v2,
    input-area-v2 .input-area-container {
      width: 100% !important;
      box-sizing: border-box !important;
    }
  `}function In(){let t=q;Ut(),chrome.storage.local.get([r.GEMINI_EDIT_INPUT_WIDTH],i=>{const a=i[r.GEMINI_EDIT_INPUT_WIDTH];t=Vt(a),ut(t)}),chrome.storage.onChanged.addListener((i,a)=>{if(a==="local"&&i[r.GEMINI_EDIT_INPUT_WIDTH]){const l=i[r.GEMINI_EDIT_INPUT_WIDTH].newValue;t=Vt(l),ut(t)}});let e=null;const n=new MutationObserver(()=>{e!==null&&clearTimeout(e),e=window.setTimeout(()=>{t===q&&Ut(),ut(t),e=null},200)}),o=document.querySelector("main");o&&n.observe(o,{childList:!0,subtree:!0,attributes:!0,attributeFilter:["class"]}),window.addEventListener("beforeunload",()=>{n.disconnect();const i=document.getElementById(G);i&&i.remove()},{once:!0})}const it="geminimate-sidebar-width-style",Me=312,It=180,St=540,gt=(t,e,n)=>Math.min(n,Math.max(e,Math.round(t)));function Ae(t){const e=`${gt(t,It,St)}px`,o=`max(0px, calc(${e} - var(--bard-sidenav-closed-width, 72px)))`;return`
    :root {
      --bard-sidenav-open-width: ${e} !important;
      --bard-sidenav-open-closed-width-diff: ${o} !important;
      --gv-sidenav-shift: ${o} !important;
    }

    #app-root:has(side-navigation-content > div.collapsed) {
      --gv-sidenav-shift: 0px !important;
    }

    bard-sidenav {
      --bard-sidenav-open-width: ${e} !important;
      --bard-sidenav-open-closed-width-diff: ${o} !important;
    }
  `}function qt(t){let e=document.getElementById(it);e||(e=document.createElement("style"),e.id=it,document.documentElement.appendChild(e)),e.textContent=Ae(t)}function zt(){const t=document.getElementById(it);t&&t.remove()}function Sn(){let t=Me;chrome.storage.local.get([r.GEMINI_SIDEBAR_WIDTH],e=>{const n=e[r.GEMINI_SIDEBAR_WIDTH];typeof n=="number"&&Number.isFinite(n)?(t=gt(n,It,St),qt(t)):zt()}),chrome.storage.onChanged.addListener((e,n)=>{if(n==="local"&&e[r.GEMINI_SIDEBAR_WIDTH]){const o=Number(e[r.GEMINI_SIDEBAR_WIDTH].newValue);Number.isFinite(o)?(t=gt(o,It,St),qt(t)):zt()}}),window.addEventListener("beforeunload",()=>{const e=document.getElementById(it);e&&e.remove()},{once:!0})}const wt="geminimate-sidebar-auto-hide-style",ve=500,Le=300,xe=1e3,ke=200,$e=1500;let p=!1,E=null,b=null,f=null,_=null,T=null,g=null,W=null,N=null,A=!1,xt=0;function _t(t){const e=window.getComputedStyle(t);if(e.display==="none"||e.visibility==="hidden")return!1;const n=t.getBoundingClientRect();return n.width>0||n.height>0}function Re(){if(document.getElementById(wt))return;const t=document.createElement("style");t.id=wt,t.textContent=`
    bard-sidenav,
    bard-sidenav side-navigation-content,
    bard-sidenav side-navigation-content > div {
      transition: width 0.25s ease, transform 0.25s ease !important;
    }
  `,document.documentElement.appendChild(t)}function Fe(){const t=document.querySelector('button[data-test-id="side-nav-menu-button"]');if(t)return t;const e=document.querySelector("side-nav-menu-button");return e?e.querySelector("button"):null}function kt(){if(document.body.classList.contains("mat-sidenav-opened"))return!1;if(document.querySelector("bard-sidenav side-navigation-content > div")?.classList.contains("collapsed"))return!0;const e=document.querySelector("bard-sidenav");return!!(e&&e.getBoundingClientRect().width<80)}function Tt(){const t=document.querySelector("bard-sidenav");return t?_t(t):!1}function Ge(){return Date.now()<xt}function re(){for(const t of document.querySelectorAll(".mat-mdc-dialog-container"))if(_t(t))return!0;for(const t of document.querySelectorAll(".mat-mdc-menu-panel"))if(_t(t))return!0;return!1}function De(){if(f?.matches(":hover"))return!0;for(const t of document.querySelectorAll(".mat-mdc-dialog-container"))if(t.matches(":hover"))return!0;for(const t of document.querySelectorAll(".mat-mdc-menu-panel"))if(t.matches(":hover"))return!0;return!1}function He(t){if(!p)return;t.target.closest('[role="menuitem"], .mat-mdc-menu-item, bard-sidenav button, [data-test-id*="options"]')&&(xt=Date.now()+$e)}function $t(){const t=Fe();return t?(t.click(),!0):!1}function ae(){Ge()||re()||De()||kt()||$t()&&(A=!0)}function Pe(){kt()&&($t(),A=!1)}function Nt(){p&&(E!==null&&(clearTimeout(E),E=null),b!==null&&clearTimeout(b),b=window.setTimeout(()=>{b=null,p&&Pe()},Le))}function yt(){p&&(b!==null&&(clearTimeout(b),b=null),E!==null&&clearTimeout(E),E=window.setTimeout(()=>{E=null,p&&ae()},ve))}function se(){const t=document.querySelector("bard-sidenav");return!t||!Tt()?!1:(t===f||(f&&(f.removeEventListener("mouseenter",Nt),f.removeEventListener("mouseleave",yt)),f=t,t.addEventListener("mouseenter",Nt),t.addEventListener("mouseleave",yt)),!0)}function le(){f&&(f.removeEventListener("mouseenter",Nt),f.removeEventListener("mouseleave",yt),f=null)}function mt(){if(!p)return;const t=document.querySelector("bard-sidenav");if(f&&!Tt()){le(),A=!1;return}t&&Tt()&&t!==f&&se()}function Yt(){p||(p=!0,A=!1,xt=0,Re(),se(),_||(_=new MutationObserver(()=>p&&mt()),_.observe(document.body,{childList:!0,subtree:!0})),T||(T=()=>{p&&(g!==null&&clearTimeout(g),g=window.setTimeout(()=>{g=null,mt()},ke))},window.addEventListener("resize",T)),N||(N=He,document.addEventListener("click",N,!0)),W===null&&(W=window.setInterval(mt,xe)),setTimeout(()=>{p&&f&&!f.matches(":hover")&&!re()&&ae()},500))}function Xt(){if(!p)return;p=!1,b!==null&&(clearTimeout(b),b=null),E!==null&&(clearTimeout(E),E=null),g!==null&&(clearTimeout(g),g=null),W!==null&&(clearInterval(W),W=null),A&&kt()&&$t(),A=!1,le();const t=document.getElementById(wt);t&&t.remove(),_&&(_.disconnect(),_=null),T&&(window.removeEventListener("resize",T),T=null),N&&(document.removeEventListener("click",N,!0),N=null)}function gn(){chrome.storage.local.get({[r.GEMINI_SIDEBAR_AUTO_HIDE]:!1},t=>{t[r.GEMINI_SIDEBAR_AUTO_HIDE]&&Yt()}),chrome.storage.onChanged.addListener((t,e)=>{e==="local"&&t[r.GEMINI_SIDEBAR_AUTO_HIDE]&&(t[r.GEMINI_SIDEBAR_AUTO_HIDE].newValue?Yt():Xt())}),window.addEventListener("beforeunload",Xt,{once:!0})}const ft="geminimate-font-size-scale",jt=100,We=80,Be=130,z=400,Oe=200,Ue=900,w="default",Rt="sans-apple",tt="serif-source",Ve=0,qe=8,ze=1.75,Ye=.1,Xe=.2;function Kt(t){const e=String(t||w);return e==="monospace"?"sans":e}function pt(t,e){return String(t||"")==="monospace"?"sans-tech":String(e||Rt)}const ht={"sans-apple":"system-ui, -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Hiragino Sans GB', 'Noto Sans SC', sans-serif","sans-sys":"'Segoe UI', 'Microsoft YaHei UI', 'Noto Sans SC', sans-serif","sans-harmony":"'HarmonyOS Sans SC', 'HarmonyOS Sans', 'PingFang SC', 'Noto Sans SC', sans-serif","sans-modern":"'MiSans', 'Alibaba PuHuiTi 3.0', 'PingFang SC', 'Noto Sans SC', sans-serif","sans-grotesk":"'Helvetica Neue', Arial, 'Noto Sans SC', sans-serif","sans-humanist":"'Source Sans 3', 'Noto Sans SC', 'Microsoft YaHei UI', sans-serif","sans-tech":"'JetBrains Mono', 'Fira Code', 'Cascadia Code', 'Courier New', monospace"},Zt={"serif-source":"'Source Han Serif SC', 'Noto Serif SC', 'Songti SC', serif","serif-traditional":"'Songti SC', SimSun, 'Noto Serif SC', serif","serif-fangsong":"FangSong, STFangsong, 'Noto Serif SC', serif","serif-kaiti":"'Kaiti SC', KaiTi, STKaiti, 'Noto Serif SC', serif","serif-newspaper":"Constantia, 'Times New Roman', STSong, 'Noto Serif SC', serif","serif-editorial":"Baskerville, 'Times New Roman', STSong, serif","serif-georgia":"Georgia, Cambria, 'Noto Serif SC', serif"},Ct=t=>Math.min(Be,Math.max(We,Math.round(t))),Jt=t=>Math.min(Ue,Math.max(Oe,Math.round(t))),rt=t=>Math.min(qe,Math.max(Ve,Math.round(t)));function je(t){return ze+rt(t)*Ye}const Ke=".markdown",Ze=`
    .markdown table th,
    .markdown table td,
    .markdown table th > p,
    .markdown table td > p,
    .markdown table th li,
    .markdown table td li,
    .markdown table th span:not(.katex):not(.katex *):not(.google-symbols),
    .markdown table td span:not(.katex):not(.katex *):not(.google-symbols)`.trim(),Je=".query-text, .query-text-line",Qe="rich-textarea p, rich-textarea [contenteditable], input-area-v2 p",tn=`
    .markdown strong:not(.gemini-md-underline), .markdown b:not(.gemini-md-underline), .markdown h1, .markdown h2, .markdown h3,
  .markdown h4, .markdown h5, .markdown h6,
    .query-text strong:not(.gemini-md-underline), .query-text b:not(.gemini-md-underline),
    .query-text-line strong:not(.gemini-md-underline), .query-text-line b:not(.gemini-md-underline)`.trim(),Qt=".markdown .katex, .query-text .katex, .query-text-line .katex";function Z(t,e,n){switch(t){case"monospace":return ht["sans-tech"];case"sans":return ht[e]??ht[Rt];case"serif":return Zt[n]??Zt[tt];case"default":return"inherit";default:return`'${t}', sans-serif`}}function en(t){const n=700+(t-z);return Math.min(900,Math.max(t,n))}function nn(t,e,n,o,i,a,l){const u=Ct(t)/100,s=`font-size: calc(1rem * ${u}) !important;`,S=e!==z?`font-weight: ${e} !important;`:"",c=e!==z?`font-variation-settings: 'wght' ${e};`:"",m=n!==w?`font-family: ${Z(n,o,i)} !important;`:"",st=a>0?`letter-spacing: ${(a*.01).toFixed(2)}em !important;`:"",lt=rt(l),Ft=je(lt),fe=lt>0?`line-height: ${Ft.toFixed(3)} !important;`:"",h=[],pe=[s,S,c,m,st,fe].filter(Boolean).join(`
      `);h.push(`${Ke}, ${Ze}, ${Je}, ${Qe} {
      ${pe}
    }`);const Y=n!==w?`
      font-family: ${Z(n,o,i)} !important;`:"",X=st?`
      ${st}`:"",j=`
      line-height: ${(lt>0?Math.max(1.2,Ft-Xe):1.25).toFixed(2)} !important;`;h.push(`.markdown h1 { font-size: calc(1.75rem * ${u}) !important;${Y}${X}${j}
      margin-top: 1.6em !important; margin-bottom: 0.5em !important; }`),h.push(`.markdown h2 { font-size: calc(1.5rem * ${u}) !important;${Y}${X}${j}
      margin-top: 1.4em !important; margin-bottom: 0.45em !important; }`),h.push(`.markdown h3 { font-size: calc(1.2rem * ${u}) !important;${Y}${X}${j}
      margin-top: 1.2em !important; margin-bottom: 0.4em !important; }`),h.push(`.markdown h4, .markdown h5, .markdown h6 { font-size: calc(1.05rem * ${u}) !important;${Y}${X}${j}
      margin-top: 1.0em !important; margin-bottom: 0.35em !important; }`),n!==w&&h.push(`.timeline-preview-search input::placeholder { font-family: ${Z(n,o,i)} !important; }`);const Gt=en(e),Dt=n!==w?`font-family: ${Z(n,o,i)} !important;`:"",he=`font-variation-settings: 'wght' ${Gt};`;return h.push(`${tn} {
            font-weight: ${Gt} !important;${Dt?`
      `+Dt:""}
      ${he}
    }`),h.push(`${Qt} {
      font-weight: ${e} !important;
      font-variation-settings: normal !important;
    }`),h.push(`${Qt} * {
      font-weight: inherit !important;
      font-variation-settings: normal !important;
    }`),h.join(`
`)}function wn(){let t=jt,e=z,n=w,o=Rt,i=tt,a=0,l=0;const d=(s,S)=>{if(S!=="local")return;let c=!1;if(s[r.GEMINI_FONT_SIZE_SCALE]){const m=Number(s[r.GEMINI_FONT_SIZE_SCALE].newValue);Number.isFinite(m)&&(t=Ct(m),c=!0)}if(s[r.GEMINI_FONT_WEIGHT]){const m=Number(s[r.GEMINI_FONT_WEIGHT].newValue);Number.isFinite(m)&&(e=Jt(m),c=!0)}if(s[r.GEMINI_FONT_FAMILY]&&(n=Kt(s[r.GEMINI_FONT_FAMILY].newValue),s[r.GEMINI_SANS_PRESET]||(o=pt(s[r.GEMINI_FONT_FAMILY].newValue,o)),c=!0),s[r.GEMINI_SANS_PRESET]&&(o=pt(s[r.GEMINI_FONT_FAMILY]?.newValue??n,s[r.GEMINI_SANS_PRESET].newValue),c=!0),s[r.GEMINI_SERIF_PRESET]&&(i=String(s[r.GEMINI_SERIF_PRESET].newValue||tt),c=!0),s[r.GEMINI_LETTER_SPACING]){const m=Number(s[r.GEMINI_LETTER_SPACING].newValue);Number.isFinite(m)&&(a=m,c=!0)}if(s[r.GEMINI_LINE_HEIGHT]){const m=Number(s[r.GEMINI_LINE_HEIGHT].newValue);Number.isFinite(m)&&(l=rt(m),c=!0)}c&&u()},u=()=>{let s=document.getElementById(ft);s||(s=document.createElement("style"),s.id=ft,document.head.appendChild(s));const S=nn(t,e,n,o,i,a,l);s.textContent=S};chrome.storage.local.get([r.GEMINI_FONT_SIZE_SCALE,r.GEMINI_FONT_WEIGHT,r.GEMINI_FONT_FAMILY,r.GEMINI_SANS_PRESET,r.GEMINI_SERIF_PRESET,r.GEMINI_LETTER_SPACING,r.GEMINI_LINE_HEIGHT],s=>{t=Ct(Number(s[r.GEMINI_FONT_SIZE_SCALE])||jt),e=Jt(Number(s[r.GEMINI_FONT_WEIGHT])||z),n=Kt(s[r.GEMINI_FONT_FAMILY]),o=pt(s[r.GEMINI_FONT_FAMILY],s[r.GEMINI_SANS_PRESET]),i=String(s[r.GEMINI_SERIF_PRESET]||tt),a=Number(s[r.GEMINI_LETTER_SPACING])||0,l=rt(Number(s[r.GEMINI_LINE_HEIGHT])||0),u()}),chrome.storage.onChanged.addListener(d),window.addEventListener("beforeunload",()=>{chrome.storage.onChanged.removeListener(d);const s=document.getElementById(ft);s&&s.remove()},{once:!0})}const te="geminimate-custom-fonts";function on(t){return t.map(e=>`@font-face { font-family: '${e.name}'; src: url('${e.data}'); font-display: swap; }`).join(`
`)}function ee(t){let e=document.getElementById(te);e||(e=document.createElement("style"),e.id=te,document.head.appendChild(e)),e.textContent=on(t)}function _n(){chrome.storage.local.get([r.GEMINI_CUSTOM_FONTS],t=>{const e=t[r.GEMINI_CUSTOM_FONTS]??[];ee(e)}),chrome.storage.onChanged.addListener((t,e)=>{if(e!=="local"||!t[r.GEMINI_CUSTOM_FONTS])return;const n=t[r.GEMINI_CUSTOM_FONTS].newValue??[];ee(n)})}const Mt="geminimate-paragraph-indent-style",at="gm-first-line-indent",B="data-gm-indent-applied",v="data-gm-indent-normalized",At="data-gm-indent-original-text",ce="gm-indent-body-line",rn=!1,ne=["model-response message-content p","model-response .markdown p","model-response .markdown-main-panel p","model-response .model-response-text .markdown p",".model-response-text .markdown p","message-content .markdown p",".response-content .markdown p","structured-content-container message-content p","structured-content-container .markdown p",'[data-test-id="message-content"] p'].join(", "),an=/^(?:第\s*[一二三四五六七八九十百千万\d]+\s*[章节部分节讲]|[一二三四五六七八九十百千万]+\s*[、.．:：-])\s*/,sn=/^\d+\s*[、.．:)）-]\s*$/;let Et=!1,O=rn,y=null,C=[],L=null;function ln(){let t=document.getElementById(Mt);t||(t=document.createElement("style"),t.id=Mt,t.textContent=`
    .${at} {
      text-indent: 2em !important;
    }

    .${ce} {
      display: block !important;
      text-indent: 2em !important;
    }
  `,document.head.appendChild(t))}function x(t){if(!(t instanceof HTMLElement))return;const e=t.getAttribute(At);e!==null&&(t.textContent=e,t.removeAttribute(At),t.removeAttribute(v)),t.classList.remove(at),t.removeAttribute(B)}function vt(){document.querySelectorAll(`[${B}], [${v}]`).forEach(t=>x(t))}const cn=["li","ul","ol","table","blockquote","pre","code",".code-block","code-block",".gm-mermaid-diagram",'[data-gm-mermaid-host="1"]',"h1","h2","h3","h4","h5","h6","model-thoughts",".thoughts-container",".thoughts-content",'[data-test-id*="thought"]'].join(", ");function de(t){return!!t.closest(cn)}function dn(t){return sn.test(t.trim())}function ue(t){return t.replace(/\u00a0/g," ").trim().length>0}function un(t){if(t.getAttribute(v)==="1"||de(t)||t.children.length>0)return;const e=(t.textContent||"").replace(/\r/g,"");if(!e.includes(`
`))return;const[n,...o]=e.split(`
`),i=n.trim(),a=o.join(`
`).trim();if(!i||!a||dn(i)||!an.test(i)||!ue(a))return;t.setAttribute(At,e),t.setAttribute(v,"1"),t.textContent="",t.appendChild(document.createTextNode(i));const l=document.createElement("span");l.className=ce,l.textContent=a,t.appendChild(l)}function mn(t){const e=t.tagName.toUpperCase();if(e==="P")return!0;if(e!=="DIV"||window.getComputedStyle(t).display!=="block")return!1;const o=Array.from(t.children);return o.length===0?!0:o.every(i=>{const a=i.tagName.toUpperCase();if(a==="BR"||["B","STRONG","SPAN","A","EM","I","U","CODE","MARK","SMALL","SUB","SUP"].includes(a))return!0;const l=window.getComputedStyle(i).display;return l==="inline"||l==="inline-block"||l==="contents"})}function fn(){if(!O){vt();return}document.querySelectorAll(ne).forEach(o=>{o instanceof HTMLElement&&un(o)});const e=document.querySelectorAll(ne),n=new Set;e.forEach(o=>{o instanceof HTMLElement&&n.add(o)}),document.querySelectorAll(`[${B}], [${v}]`).forEach(o=>{o instanceof HTMLElement&&(n.has(o)||x(o))}),e.forEach(o=>{if(o instanceof HTMLElement){if(!mn(o)){x(o);return}if(de(o)){x(o);return}if(o.getAttribute(v)==="1"){o.classList.add(at),o.setAttribute(B,"1");return}if(!ue(o.innerText||o.textContent||"")){x(o);return}o.classList.add(at),o.setAttribute(B,"1")}})}function me(){C.length!==0&&(C.forEach(t=>clearTimeout(t)),C=[])}function et(){me(),[120,360,900].forEach(t=>{const e=window.setTimeout(()=>{fn(),C=C.filter(n=>n!==e)},t);C.push(e)})}function oe(){y||!document.body||(y=new MutationObserver(t=>{!O||t.length===0||et()}),y.observe(document.body,{childList:!0,subtree:!0,characterData:!0,attributes:!0,attributeFilter:["class","style","hidden","aria-hidden"]}))}function Tn(){Et||(Et=!0,ln(),chrome.storage.local.get([r.GEMINI_PARAGRAPH_INDENT_ENABLED],t=>{O=t[r.GEMINI_PARAGRAPH_INDENT_ENABLED]===!0,et()}),L=(t,e)=>{if(e==="local"&&t[r.GEMINI_PARAGRAPH_INDENT_ENABLED]){if(O=t[r.GEMINI_PARAGRAPH_INDENT_ENABLED].newValue===!0,!O){vt();return}et()}},chrome.storage.onChanged.addListener(L),document.body?oe():document.addEventListener("DOMContentLoaded",()=>{oe(),et()},{once:!0}),window.addEventListener("beforeunload",()=>{y&&(y.disconnect(),y=null),L&&(chrome.storage.onChanged.removeListener(L),L=null),me(),vt(),document.getElementById(Mt)?.remove(),Et=!1},{once:!0}))}export{In as a,Sn as b,gn as c,wn as d,_n as e,Tn as f,bn as s};
