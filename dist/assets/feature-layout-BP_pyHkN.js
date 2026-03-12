import{S as i,d as ft}from"./feature-reading-DmivFZYK.js";const At=["model-response",".model-response",'[data-message-author-role="model"]','[aria-label="Gemini response"]',".presented-response-container",".response-container"].join(", "),Ct="停止生成",Mt=["model-thoughts",'[data-test-id="thoughts-content"]',".thoughts-container",".thoughts-content",".thoughts-content-expanded",".thoughts-streaming",".gm-thought-translation-layout",".gm-thought-translation",'[data-gm-thought-replacement="1"]'].join(", "),vt=["model-response .deferred-response-indicator",".model-response .deferred-response-indicator",'[data-message-author-role="model"] .deferred-response-indicator','[aria-label="Gemini response"] .deferred-response-indicator',".response-container .deferred-response-indicator",'button[aria-label*="Stop generating"]','button[aria-label*="Stop response"]',`button[aria-label*="${Ct}"]`,'[data-test-id*="stop"][data-test-id*="response"]','[data-test-id*="stop"][data-test-id*="generate"]'].join(", "),pt=e=>e?e instanceof Element?e:e.parentElement:null,Fe=e=>{const t=pt(e);return t?t.closest(Mt)!==null:!1},Lt=e=>{const t=pt(e);return t?t.closest(At)!==null:!1},k=(e=document)=>e.querySelector(vt)!==null,j="geminimate-chat-width",X=100,G=100,F=170,xt=960;let S=xt;const Rt="[GM-ChatWidth]",D=(e,t={})=>{try{console.info(Rt,{event:e,detail:t,ts:new Date().toISOString()}),ft.log("chat-width",e,t)}catch{}};function oe(){return[".user-query-bubble-container",".user-query-container","user-query-content","user-query",'div[aria-label="User message"]','article[data-author="user"]','[data-message-author-role="user"]']}function re(){return["model-response",".model-response","response-container",".response-container",".presented-response-container",'[aria-label="Gemini response"]','[data-message-author-role="assistant"]','[data-message-author-role="model"]','article[data-author="assistant"]']}function $t(){return["table-block",".table-block","table-block .table-block","table-block .table-content",".table-block.new-table-style",".table-block.has-scrollbar",".table-block .table-content",".table-block-component",".table-block-component > response-element",".table-block-component response-element",".table-block-component table-block",".table-block-component .horizontal-scroll-wrapper",".table-block-component .table-footer",".horizontal-scroll-wrapper",".table-footer"]}const se=(e,t,n)=>Math.min(n,Math.max(t,Math.round(e))),P=e=>{const t=Math.max(window.innerWidth,1);return e/t*100},Ye=e=>{const t=[];for(const n of e){const o=document.querySelector(n);if(!o)continue;const r=o.getBoundingClientRect(),a=window.getComputedStyle(o);if(t.push({selector:n,tag:o.tagName.toLowerCase(),className:o.className||"",rectWidthVw:Number(P(r.width).toFixed(3)),computedMaxWidth:a.maxWidth}),t.length>=4)break}return t},kt=e=>{const t=e.trim().toLowerCase();if(!t||t==="none"||t==="auto"||!t.endsWith("px"))return null;const n=Number.parseFloat(t);return Number.isFinite(n)?n:null},je=e=>{const t=[];for(const n of e){const o=Array.from(document.querySelectorAll(n));for(const r of o){const a=r.getBoundingClientRect();if(a.width<120||a.height<16)continue;const l=window.getComputedStyle(r);if(l.display==="none"||l.visibility==="hidden")continue;const u=kt(l.maxWidth);u!==null&&(u<120||u>window.innerWidth||t.push(u))}}return t.length===0?null:(t.sort((n,o)=>n-o),t[Math.floor(t.length/2)]??null)},fe=e=>{for(const t of e){const n=Array.from(document.querySelectorAll(t));for(const o of n){const r=o.getBoundingClientRect();if(r.width<120||r.height<16)continue;const a=window.getComputedStyle(o);if(!(a.display==="none"||a.visibility==="hidden"))return r.width}}return null},pe=()=>{const e=document.getElementById(j),t=e?.textContent??null;e&&(e.textContent="");const n=fe(re())??fe(oe())??je(re())??je(oe())??fe([".presented-response-container","model-response",".response-container"]);e&&t!==null&&(e.textContent=t),n&&Number.isFinite(n)&&n>120&&n<=window.innerWidth?(S=n,D("native-base-measured",{nativeBasePx:S,nativeBaseVw:Number(P(S).toFixed(3))})):D("native-base-measure-fallback",{measured:n,assistantSnapshot:Ye(re()),userSnapshot:Ye(oe())})},Xe=e=>{const t=Number(e);if(!Number.isFinite(t))return X;if(t>=G&&t<=F)return se(t,G,F);if(t>0){const n=t/Math.max(S,1)*100;return se(n,G,F)}return X},Gt=e=>{const t=se(e,G,F);return S*t/100},Ft=()=>{let e=document.getElementById(j);return e||(e=document.createElement("style"),e.id=j,document.head.appendChild(e)),e};function te(e){const t=se(e,G,F);if(t===X){const c=document.getElementById(j);c&&c.remove(),D("apply-native",{uiPercent:t,nativeBasePx:S,nativeBaseVw:Number(P(S).toFixed(3))});return}const n=Gt(t);D("apply-scaled",{uiPercent:t,nativeBasePx:S,nativeBaseVw:Number(P(S).toFixed(3)),targetWidthPx:n,targetWidthVw:Number(P(n).toFixed(3))});const o=`${n.toFixed(3)}px`,r=Ft(),a=oe(),l=re(),u=$t(),d=a.map(c=>`${c}`).join(`,
    `),s=l.map(c=>`${c}`).join(`,
    `),w=u.map(c=>`${c}`).join(`,
    `);D("apply-style-scope",{uiPercent:t,widthValue:o,userSelectors:a.length,assistantSelectors:l.length,tableSelectors:u.length}),r.textContent=`
    chat-window-content > .conversation-container,
    .chat-history-scroll-container > .conversation-container,
    .chat-history > .conversation-container,
    .conversation-container {
      max-width: ${o} !important;
      box-sizing: border-box !important;
    }

    ${d} {
      max-width: ${o} !important;
    }

    ${s} {
      max-width: ${o} !important;
    }

    ${w} {
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
  `}function $n(){let e=X;pe(),chrome.storage.local.get([i.GEMINI_CHAT_WIDTH],r=>{const a=r[i.GEMINI_CHAT_WIDTH];e=Xe(a),te(e)}),chrome.storage.onChanged.addListener((r,a)=>{if(a==="local"&&r[i.GEMINI_CHAT_WIDTH]){const l=r[i.GEMINI_CHAT_WIDTH].newValue;e=Xe(l),te(e)}});let t=null;const n=new MutationObserver(()=>{t!==null&&clearTimeout(t),t=window.setTimeout(()=>{e===X&&pe(),te(e),t=null},200)}),o=document.querySelector("main");o&&n.observe(o,{childList:!0,subtree:!0}),window.addEventListener("resize",()=>{pe(),te(e)}),window.addEventListener("beforeunload",()=>{n.disconnect();const r=document.getElementById(j);r&&r.remove()},{once:!0})}const H="geminimate-edit-input-width",K=100,O=50,W=170,Dt=60;let v=Dt;const Pt="[GM-EditWidth]",B=(e,t={})=>{try{console.info(Pt,{event:e,detail:t,ts:new Date().toISOString()}),ft.log("edit-width",e,t)}catch{}},le=(e,t,n)=>Math.min(n,Math.max(t,Math.round(e))),De=e=>{const t=Math.max(window.innerWidth,1);return e/t*100},Ke=e=>{const t=[];for(const n of e){const o=document.querySelector(n);if(!o)continue;const r=o.getBoundingClientRect(),a=window.getComputedStyle(o);if(t.push({selector:n,tag:o.tagName.toLowerCase(),className:o.className||"",rectWidthVw:Number(De(r.width).toFixed(3)),computedMaxWidth:a.maxWidth}),t.length>=4)break}return t},Ht=e=>{const t=e.trim().toLowerCase();if(!t||t==="none"||t==="auto"||!t.endsWith("px"))return null;const n=Number.parseFloat(t);return Number.isFinite(n)?n:null},Ot=e=>{const t=[];for(const n of e){const o=Array.from(document.querySelectorAll(n));for(const r of o){const a=r.getBoundingClientRect();if(a.width<120||a.height<16)continue;const l=window.getComputedStyle(r);if(l.display==="none"||l.visibility==="hidden")continue;const u=Ht(l.maxWidth);u!==null&&(u<120||u>window.innerWidth||t.push(De(u)))}}return t.length===0?null:(t.sort((n,o)=>n-o),t[Math.floor(t.length/2)]??null)},Ze=e=>{for(const t of e){const n=Array.from(document.querySelectorAll(t));for(const o of n){const r=o.getBoundingClientRect();if(r.width<120||r.height<16)continue;const a=window.getComputedStyle(o);if(!(a.display==="none"||a.visibility==="hidden"))return De(r.width)}}return null},Je=()=>{const e=document.getElementById(H),t=e?.textContent??null;e&&(e.textContent="");const n=Ot(["input-container fieldset.input-area-container","chat-window input-container fieldset.input-area-container",".query-content.edit-mode",".edit-container"])??Ze(["input-container fieldset.input-area-container","chat-window input-container fieldset.input-area-container",".query-content.edit-mode",".edit-container"])??Ze(we());e&&t!==null&&(e.textContent=t),n&&Number.isFinite(n)&&n>20&&n<=100?(v=n,B("native-base-measured",{nativeBaseVw:v})):B("native-base-measure-fallback",{measured:n,editSnapshot:Ke(we()),inputSnapshot:Ke(["input-container fieldset.input-area-container","chat-window input-container fieldset.input-area-container"])})},Qe=e=>{const t=Number(e);if(!Number.isFinite(t))return K;if(t>=O&&t<=W)return le(t,O,W);if(t>0){const n=t/Math.max(v,1)*100;return le(n,O,W)}return K},Wt=e=>{const t=le(e,O,W);return v*t/100};function we(){return[".query-content.edit-mode","div.edit-mode",'[class*="edit-mode"]']}function he(e){const t=le(e,O,W);if(t===K){const d=document.getElementById(H);d&&d.remove(),B("apply-native",{uiPercent:t,nativeBaseVw:v});return}const n=Wt(t);B("apply-scaled",{uiPercent:t,nativeBaseVw:v,targetWidthVw:n});const o=`${n.toFixed(3)}vw`,r=`width: min(100%, ${o}) !important;`;let a=document.getElementById(H);a||(a=document.createElement("style"),a.id=H,document.head.appendChild(a));const l=we(),u=l.map(d=>`${d}`).join(`,
    `);B("apply-style-scope",{uiPercent:t,widthValue:o,editModeSelectors:l.length}),a.textContent=`
    ${u} {
      max-width: ${o} !important;
      ${r}
      margin-left: auto !important;
      margin-right: auto !important;
    }

    .edit-mode .edit-container,
    .query-content.edit-mode .edit-container {
      max-width: ${o} !important;
      ${r}
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
      ${r}
      margin-left: auto !important;
      margin-right: auto !important;
    }

    input-container .input-area-container,
    input-area-v2,
    input-area-v2 .input-area-container {
      width: 100% !important;
      box-sizing: border-box !important;
    }
  `}function kn(){let e=K;Je(),chrome.storage.local.get([i.GEMINI_EDIT_INPUT_WIDTH],r=>{const a=r[i.GEMINI_EDIT_INPUT_WIDTH];e=Qe(a),he(e)}),chrome.storage.onChanged.addListener((r,a)=>{if(a==="local"&&r[i.GEMINI_EDIT_INPUT_WIDTH]){const l=r[i.GEMINI_EDIT_INPUT_WIDTH].newValue;e=Qe(l),he(e)}});let t=null;const n=new MutationObserver(()=>{t!==null&&clearTimeout(t),t=window.setTimeout(()=>{e===K&&Je(),he(e),t=null},200)}),o=document.querySelector("main");o&&n.observe(o,{childList:!0,subtree:!0,attributes:!0,attributeFilter:["class"]}),window.addEventListener("beforeunload",()=>{n.disconnect();const r=document.getElementById(H);r&&r.remove()},{once:!0})}const ce="geminimate-sidebar-width-style",Bt=312,Te=180,Ne=540,ye=(e,t,n)=>Math.min(n,Math.max(t,Math.round(e)));function Ut(e){const t=`${ye(e,Te,Ne)}px`,o=`max(0px, calc(${t} - var(--bard-sidenav-closed-width, 72px)))`;return`
    :root {
      --bard-sidenav-open-width: ${t} !important;
      --bard-sidenav-open-closed-width-diff: ${o} !important;
      --gv-sidenav-shift: ${o} !important;
    }

    #app-root:has(side-navigation-content > div.collapsed) {
      --gv-sidenav-shift: 0px !important;
    }

    bard-sidenav {
      --bard-sidenav-open-width: ${t} !important;
      --bard-sidenav-open-closed-width-diff: ${o} !important;
    }
  `}function et(e){let t=document.getElementById(ce);t||(t=document.createElement("style"),t.id=ce,document.documentElement.appendChild(t)),t.textContent=Ut(e)}function tt(){const e=document.getElementById(ce);e&&e.remove()}function Gn(){let e=Bt;chrome.storage.local.get([i.GEMINI_SIDEBAR_WIDTH],t=>{const n=t[i.GEMINI_SIDEBAR_WIDTH];typeof n=="number"&&Number.isFinite(n)?(e=ye(n,Te,Ne),et(e)):tt()}),chrome.storage.onChanged.addListener((t,n)=>{if(n==="local"&&t[i.GEMINI_SIDEBAR_WIDTH]){const o=Number(t[i.GEMINI_SIDEBAR_WIDTH].newValue);Number.isFinite(o)?(e=ye(o,Te,Ne),et(e)):tt()}}),window.addEventListener("beforeunload",()=>{const t=document.getElementById(ce);t&&t.remove()},{once:!0})}const Ae="geminimate-sidebar-auto-hide-style",Vt=500,qt=300,zt=1e3,Yt=200,jt=1500;let p=!1,E=null,b=null,f=null,N=null,y=null,I=null,U=null,A=null,L=!1,Pe=0;function Ce(e){const t=window.getComputedStyle(e);if(t.display==="none"||t.visibility==="hidden")return!1;const n=e.getBoundingClientRect();return n.width>0||n.height>0}function Xt(){if(document.getElementById(Ae))return;const e=document.createElement("style");e.id=Ae,e.textContent=`
    bard-sidenav,
    bard-sidenav side-navigation-content,
    bard-sidenav side-navigation-content > div {
      transition: width 0.25s ease, transform 0.25s ease !important;
    }
  `,document.documentElement.appendChild(e)}function Kt(){const e=document.querySelector('button[data-test-id="side-nav-menu-button"]');if(e)return e;const t=document.querySelector("side-nav-menu-button");return t?t.querySelector("button"):null}function He(){if(document.body.classList.contains("mat-sidenav-opened"))return!1;if(document.querySelector("bard-sidenav side-navigation-content > div")?.classList.contains("collapsed"))return!0;const t=document.querySelector("bard-sidenav");return!!(t&&t.getBoundingClientRect().width<80)}function Me(){const e=document.querySelector("bard-sidenav");return e?Ce(e):!1}function Zt(){return Date.now()<Pe}function ht(){for(const e of document.querySelectorAll(".mat-mdc-dialog-container"))if(Ce(e))return!0;for(const e of document.querySelectorAll(".mat-mdc-menu-panel"))if(Ce(e))return!0;return!1}function Jt(){if(f?.matches(":hover"))return!0;for(const e of document.querySelectorAll(".mat-mdc-dialog-container"))if(e.matches(":hover"))return!0;for(const e of document.querySelectorAll(".mat-mdc-menu-panel"))if(e.matches(":hover"))return!0;return!1}function Qt(e){if(!p)return;e.target.closest('[role="menuitem"], .mat-mdc-menu-item, bard-sidenav button, [data-test-id*="options"]')&&(Pe=Date.now()+jt)}function Oe(){const e=Kt();return e?(e.click(),!0):!1}function Et(){Zt()||ht()||Jt()||He()||Oe()&&(L=!0)}function en(){He()&&(Oe(),L=!1)}function ve(){p&&(E!==null&&(clearTimeout(E),E=null),b!==null&&clearTimeout(b),b=window.setTimeout(()=>{b=null,p&&en()},qt))}function Le(){p&&(b!==null&&(clearTimeout(b),b=null),E!==null&&clearTimeout(E),E=window.setTimeout(()=>{E=null,p&&Et()},Vt))}function bt(){const e=document.querySelector("bard-sidenav");return!e||!Me()?!1:(e===f||(f&&(f.removeEventListener("mouseenter",ve),f.removeEventListener("mouseleave",Le)),f=e,e.addEventListener("mouseenter",ve),e.addEventListener("mouseleave",Le)),!0)}function St(){f&&(f.removeEventListener("mouseenter",ve),f.removeEventListener("mouseleave",Le),f=null)}function Ee(){if(!p)return;const e=document.querySelector("bard-sidenav");if(f&&!Me()){St(),L=!1;return}e&&Me()&&e!==f&&bt()}function nt(){p||(p=!0,L=!1,Pe=0,Xt(),bt(),N||(N=new MutationObserver(()=>p&&Ee()),N.observe(document.body,{childList:!0,subtree:!0})),y||(y=()=>{p&&(I!==null&&clearTimeout(I),I=window.setTimeout(()=>{I=null,Ee()},Yt))},window.addEventListener("resize",y)),A||(A=Qt,document.addEventListener("click",A,!0)),U===null&&(U=window.setInterval(Ee,zt)),setTimeout(()=>{p&&f&&!f.matches(":hover")&&!ht()&&Et()},500))}function ot(){if(!p)return;p=!1,b!==null&&(clearTimeout(b),b=null),E!==null&&(clearTimeout(E),E=null),I!==null&&(clearTimeout(I),I=null),U!==null&&(clearInterval(U),U=null),L&&He()&&Oe(),L=!1,St();const e=document.getElementById(Ae);e&&e.remove(),N&&(N.disconnect(),N=null),y&&(window.removeEventListener("resize",y),y=null),A&&(document.removeEventListener("click",A,!0),A=null)}function Fn(){chrome.storage.local.get({[i.GEMINI_SIDEBAR_AUTO_HIDE]:!1},e=>{e[i.GEMINI_SIDEBAR_AUTO_HIDE]&&nt()}),chrome.storage.onChanged.addListener((e,t)=>{t==="local"&&e[i.GEMINI_SIDEBAR_AUTO_HIDE]&&(e[i.GEMINI_SIDEBAR_AUTO_HIDE].newValue?nt():ot())}),window.addEventListener("beforeunload",ot,{once:!0})}const be="geminimate-font-size-scale",rt=100,tn=80,nn=130,Z=400,on=200,rn=900,T="default",We="sans-apple",ie="serif-source",an=0,sn=8,ln=1.75,cn=.1,un=.2;function it(e){const t=String(e||T);return t==="monospace"?"sans":t}function Se(e,t){return String(e||"")==="monospace"?"sans-tech":String(t||We)}const ge={"sans-apple":"system-ui, -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Hiragino Sans GB', 'Noto Sans SC', sans-serif","sans-sys":"'Segoe UI', 'Microsoft YaHei UI', 'Noto Sans SC', sans-serif","sans-harmony":"'HarmonyOS Sans SC', 'HarmonyOS Sans', 'PingFang SC', 'Noto Sans SC', sans-serif","sans-modern":"'MiSans', 'Alibaba PuHuiTi 3.0', 'PingFang SC', 'Noto Sans SC', sans-serif","sans-grotesk":"'Helvetica Neue', Arial, 'Noto Sans SC', sans-serif","sans-humanist":"'Source Sans 3', 'Noto Sans SC', 'Microsoft YaHei UI', sans-serif","sans-tech":"'JetBrains Mono', 'Fira Code', 'Cascadia Code', 'Courier New', monospace"},at={"serif-source":"'Source Han Serif SC', 'Noto Serif SC', 'Songti SC', serif","serif-traditional":"'Songti SC', SimSun, 'Noto Serif SC', serif","serif-fangsong":"FangSong, STFangsong, 'Noto Serif SC', serif","serif-kaiti":"'Kaiti SC', KaiTi, STKaiti, 'Noto Serif SC', serif","serif-newspaper":"Constantia, 'Times New Roman', STSong, 'Noto Serif SC', serif","serif-editorial":"Baskerville, 'Times New Roman', STSong, serif","serif-georgia":"Georgia, Cambria, 'Noto Serif SC', serif"},dn=".markdown",mn=`
  .markdown table th,
  .markdown table td,
  .markdown table th > p,
  .markdown table td > p,
  .markdown table th li,
  .markdown table td li`.trim(),fn=".query-text, .query-text-line",pn="rich-textarea p, rich-textarea [contenteditable], input-area-v2 p",hn=`
  rich-textarea [contenteditable]::before,
  input-area-v2 [contenteditable]::before,
  rich-textarea [data-placeholder]::before,
  input-area-v2 [data-placeholder]::before,
  input-area-v2 textarea::placeholder`.trim(),En=`
  .markdown strong:not(.gemini-md-underline), .markdown b:not(.gemini-md-underline),
  .markdown h1, .markdown h2, .markdown h3, .markdown h4, .markdown h5, .markdown h6,
  .query-text strong:not(.gemini-md-underline), .query-text b:not(.gemini-md-underline),
  .query-text-line strong:not(.gemini-md-underline), .query-text-line b:not(.gemini-md-underline)`.trim(),st=".markdown .katex, .query-text .katex, .query-text-line .katex",xe=e=>Math.min(nn,Math.max(tn,Math.round(e))),lt=e=>Math.min(rn,Math.max(on,Math.round(e))),ue=e=>Math.min(sn,Math.max(an,Math.round(e)));function bn(e){return ln+ue(e)*cn}function ne(e,t,n){switch(e){case"monospace":return ge["sans-tech"];case"sans":return ge[t]??ge[We];case"serif":return at[n]??at[ie];case"default":return"inherit";default:return`'${e}', sans-serif`}}function Sn(e){const n=700+(e-Z);return Math.min(900,Math.max(e,n))}function gn(e,t,n,o,r,a,l){const d=xe(e)/100,s=ue(l),w=bn(s),c=`font-size: calc(1rem * ${d}) !important;`,m=t!==Z?`font-weight: ${t} !important;`:"",Be=t!==Z?`font-variation-settings: 'wght' ${t} !important;`:"",Ue=n!==T?`font-family: ${ne(n,o,r)} !important;`:"",Ve="font-synthesis: weight !important;",me=a>0?`letter-spacing: ${(a*.01).toFixed(2)}em !important;`:"",wt=s>0?`line-height: ${w.toFixed(3)} !important;`:"",h=[],Tt=[c,m,Be,Ue,Ve,me,wt].filter(Boolean).join(`
      `);h.push(`${dn}, ${mn}, ${fn} {
      ${Tt}
    }`);const Nt=[c,m,Be,Ue,Ve].filter(Boolean).join(`
      `);h.push(`${pn} {
      ${Nt}
    }`),h.push(`${hn} {
      font-size: initial !important;
      letter-spacing: normal !important;
      line-height: normal !important;
      font-variation-settings: normal !important;
      font-family: initial !important;
      font-weight: 400 !important;
      font-synthesis: initial !important;
    }`);const J=n!==T?`
      font-family: ${ne(n,o,r)} !important;`:"",Q=me?`
      ${me}`:"",ee=`
      line-height: ${(s>0?Math.max(1.2,w-un):1.25).toFixed(2)} !important;`;h.push(`.markdown h1 { font-size: calc(1.75rem * ${d}) !important;${J}${Q}${ee}
      margin-top: 1.6em !important; margin-bottom: 0.5em !important; }`),h.push(`.markdown h2 { font-size: calc(1.5rem * ${d}) !important;${J}${Q}${ee}
      margin-top: 1.4em !important; margin-bottom: 0.45em !important; }`),h.push(`.markdown h3 { font-size: calc(1.2rem * ${d}) !important;${J}${Q}${ee}
      margin-top: 1.2em !important; margin-bottom: 0.4em !important; }`),h.push(`.markdown h4, .markdown h5, .markdown h6 { font-size: calc(1.05rem * ${d}) !important;${J}${Q}${ee}
      margin-top: 1.0em !important; margin-bottom: 0.35em !important; }`),n!==T&&h.push(`.timeline-preview-search input::placeholder { font-family: ${ne(n,o,r)} !important; }`);const qe=Sn(t),ze=n!==T?`font-family: ${ne(n,o,r)} !important;`:"",yt=`font-variation-settings: 'wght' ${qe} !important;`;return h.push(`${En} {
      font-weight: ${qe} !important;${ze?`
      ${ze}`:""}
      ${yt}
    }`),h.push(`${st} {
      font-weight: ${t} !important;
      font-variation-settings: normal !important;
      font-synthesis: none !important;
    }`),h.push(`${st} * {
      font-weight: inherit !important;
      font-variation-settings: normal !important;
    }`),h.join(`
`)}function Dn(){let e=rt,t=Z,n=T,o=We,r=ie,a=0,l=0;const u=()=>{let s=document.getElementById(be);s||(s=document.createElement("style"),s.id=be,document.head.appendChild(s)),s.textContent=gn(e,t,n,o,r,a,l)},d=(s,w)=>{if(w!=="local")return;let c=!1;if(s[i.GEMINI_FONT_SIZE_SCALE]){const m=Number(s[i.GEMINI_FONT_SIZE_SCALE].newValue);Number.isFinite(m)&&(e=xe(m),c=!0)}if(s[i.GEMINI_FONT_WEIGHT]){const m=Number(s[i.GEMINI_FONT_WEIGHT].newValue);Number.isFinite(m)&&(t=lt(m),c=!0)}if(s[i.GEMINI_FONT_FAMILY]&&(n=it(s[i.GEMINI_FONT_FAMILY].newValue),s[i.GEMINI_SANS_PRESET]||(o=Se(s[i.GEMINI_FONT_FAMILY].newValue,o)),c=!0),s[i.GEMINI_SANS_PRESET]&&(o=Se(s[i.GEMINI_FONT_FAMILY]?.newValue??n,s[i.GEMINI_SANS_PRESET].newValue),c=!0),s[i.GEMINI_SERIF_PRESET]&&(r=String(s[i.GEMINI_SERIF_PRESET].newValue||ie),c=!0),s[i.GEMINI_LETTER_SPACING]){const m=Number(s[i.GEMINI_LETTER_SPACING].newValue);Number.isFinite(m)&&(a=m,c=!0)}if(s[i.GEMINI_LINE_HEIGHT]){const m=Number(s[i.GEMINI_LINE_HEIGHT].newValue);Number.isFinite(m)&&(l=ue(m),c=!0)}c&&u()};chrome.storage.local.get([i.GEMINI_FONT_SIZE_SCALE,i.GEMINI_FONT_WEIGHT,i.GEMINI_FONT_FAMILY,i.GEMINI_SANS_PRESET,i.GEMINI_SERIF_PRESET,i.GEMINI_LETTER_SPACING,i.GEMINI_LINE_HEIGHT],s=>{e=xe(Number(s[i.GEMINI_FONT_SIZE_SCALE])||rt),t=lt(Number(s[i.GEMINI_FONT_WEIGHT])||Z),n=it(s[i.GEMINI_FONT_FAMILY]),o=Se(s[i.GEMINI_FONT_FAMILY],s[i.GEMINI_SANS_PRESET]),r=String(s[i.GEMINI_SERIF_PRESET]||ie),a=Number(s[i.GEMINI_LETTER_SPACING])||0,l=ue(Number(s[i.GEMINI_LINE_HEIGHT])||0),u()}),chrome.storage.onChanged.addListener(d),window.addEventListener("beforeunload",()=>{chrome.storage.onChanged.removeListener(d),document.getElementById(be)?.remove()},{once:!0})}const ct="geminimate-custom-fonts";function In(e){return e.map(t=>`@font-face { font-family: '${t.name}'; src: url('${t.data}'); font-display: swap; }`).join(`
`)}function ut(e){let t=document.getElementById(ct);t||(t=document.createElement("style"),t.id=ct,document.head.appendChild(t)),t.textContent=In(e)}function Pn(){chrome.storage.local.get([i.GEMINI_CUSTOM_FONTS],e=>{const t=e[i.GEMINI_CUSTOM_FONTS]??[];ut(t)}),chrome.storage.onChanged.addListener((e,t)=>{if(t!=="local"||!e[i.GEMINI_CUSTOM_FONTS])return;const n=e[i.GEMINI_CUSTOM_FONTS].newValue??[];ut(n)})}const Re="geminimate-paragraph-indent-style",de="gm-first-line-indent",V="data-gm-indent-applied",x="data-gm-indent-normalized",$e="data-gm-indent-original-text",gt="gm-indent-body-line",_n=!1,ke=["model-response message-content p",".model-response message-content p",'[data-message-author-role="model"] message-content p','[aria-label="Gemini response"] message-content p',"model-response .markdown p",".model-response .markdown p",'[data-message-author-role="model"] .markdown p','[aria-label="Gemini response"] .markdown p',"model-response .markdown-main-panel p",".model-response .markdown-main-panel p",'[data-message-author-role="model"] .markdown-main-panel p','[aria-label="Gemini response"] .markdown-main-panel p'].join(", "),wn=/^(?:\u7b2c\s*[\u4e00-\u9fff\d]+\s*[\u7ae0\u8282\u90e8\u5206\u8bb2]|[\u4e00-\u9fff]+\s*[\u3001.\)\uff09])\s*/,Tn=/^\d+\s*[\u3001.\)\uff09]\s*$/,Nn=["li","ul","ol","table","blockquote","pre","code",".code-block","code-block",".gm-mermaid-diagram",'[data-gm-mermaid-host="1"]',"h1","h2","h3","h4","h5","h6","model-thoughts",".thoughts-container",".thoughts-content",".thoughts-content-expanded",".thoughts-streaming",'[data-test-id*="thought"]'].join(", ");let Ie=!1,g=_n,C=null,q=null,M=null,_=!1,R=null;function yn(){let e=document.getElementById(Re);e||(e=document.createElement("style"),e.id=Re,e.textContent=`
    .${de} {
      text-indent: 2em !important;
    }

    .${gt} {
      display: block !important;
      text-indent: 2em !important;
    }
  `,document.head.appendChild(e))}function Ge(){q!==null&&(clearTimeout(q),q=null)}function dt(){M!==null&&(clearTimeout(M),M=null)}function $(e){if(!(e instanceof HTMLElement))return;const t=e.getAttribute($e);t!==null&&(e.textContent=t,e.removeAttribute($e),e.removeAttribute(x)),e.classList.remove(de),e.removeAttribute(V)}function ae(){document.querySelectorAll(`[${V}], [${x}]`).forEach(e=>$(e))}function It(e){return Fe(e)?!0:e.closest(Nn)!==null}function An(e){return Tn.test(e.trim())}function _t(e){return e.replace(/\u00a0/g," ").trim().length>0}function Cn(e){if(e.getAttribute(x)==="1"||It(e)||e.children.length>0)return;const t=(e.textContent||"").replace(/\r/g,"");if(!t.includes(`
`))return;const[n,...o]=t.split(`
`),r=n.trim(),a=o.join(`
`).trim();if(!r||!a||An(r)||!wn.test(r)||!_t(a))return;e.setAttribute($e,t),e.setAttribute(x,"1"),e.textContent="",e.appendChild(document.createTextNode(r));const l=document.createElement("span");l.className=gt,l.textContent=a,e.appendChild(l)}function Mn(e){const t=e.tagName.toUpperCase();if(t==="P")return!0;if(t!=="DIV"||window.getComputedStyle(e).display!=="block")return!1;const o=Array.from(e.children);return o.length===0?!0:o.every(r=>{const a=r.tagName.toUpperCase();if(a==="BR"||["B","STRONG","SPAN","A","EM","I","U","CODE","MARK","SMALL","SUB","SUP"].includes(a))return!0;const l=window.getComputedStyle(r).display;return l==="inline"||l==="inline-block"||l==="contents"})}function vn(){if(!g){ae();return}const e=Array.from(document.querySelectorAll(ke)).filter(n=>!Fe(n)),t=new Set(e);e.forEach(n=>{Cn(n)}),document.querySelectorAll(`[${V}], [${x}]`).forEach(n=>{n instanceof HTMLElement&&(t.has(n)||$(n))}),e.forEach(n=>{if(!Mn(n)){$(n);return}if(It(n)){$(n);return}if(n.getAttribute(x)==="1"){n.classList.add(de),n.setAttribute(V,"1");return}if(!_t(n.innerText||n.textContent||"")){$(n);return}n.classList.add(de),n.setAttribute(V,"1")})}function z(){Ge(),q=window.setTimeout(()=>{q=null,vn()},180)}function Y(){_=!0,M===null&&(M=window.setTimeout(()=>{if(M=null,!!_){if(k()){Y();return}_=!1,z()}},220))}function _e(e){const t=e instanceof Element?e:e.parentElement;return!t||Fe(t)?!1:t.closest(ke)!==null||Lt(t)?!0:t.querySelector(ke)!==null}function Ln(e){return e.some(t=>{if(t.type==="characterData")return _e(t.target);if(_e(t.target))return!0;for(const n of Array.from(t.addedNodes))if(_e(n))return!0;return!1})}function mt(){C||!document.body||(C=new MutationObserver(e=>{if(!(!g||e.length===0)&&Ln(e)){if(k()){Y();return}_&&(_=!1),z()}}),C.observe(document.body,{childList:!0,subtree:!0,characterData:!0,attributes:!0,attributeFilter:["class","style","hidden","aria-hidden"]}))}function Hn(){Ie||(Ie=!0,yn(),chrome.storage.local.get([i.GEMINI_PARAGRAPH_INDENT_ENABLED],e=>{if(g=e[i.GEMINI_PARAGRAPH_INDENT_ENABLED]===!0,!g){ae();return}if(k()){Y();return}z()}),R=(e,t)=>{if(t==="local"&&e[i.GEMINI_PARAGRAPH_INDENT_ENABLED]){if(g=e[i.GEMINI_PARAGRAPH_INDENT_ENABLED].newValue===!0,!g){_=!1,Ge(),dt(),ae();return}if(k()){Y();return}z()}},chrome.storage.onChanged.addListener(R),document.body?mt():document.addEventListener("DOMContentLoaded",()=>{if(mt(),!!g){if(k()){Y();return}z()}},{once:!0}),window.addEventListener("beforeunload",()=>{C&&(C.disconnect(),C=null),R&&(chrome.storage.onChanged.removeListener(R),R=null),_=!1,Ge(),dt(),ae(),document.getElementById(Re)?.remove(),Ie=!1},{once:!0}))}export{Lt as a,kn as b,Gn as c,Fn as d,Dn as e,Pn as f,Hn as g,Fe as i,$n as s};
