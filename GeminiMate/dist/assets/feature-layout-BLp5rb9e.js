import{S as r,d as it}from"./feature-reading-C80NGcap.js";const $="geminimate-chat-width",V=100,R=100,F=170,Et=70;let M=Et;const It="[GM-ChatWidth]",G=(e,t={})=>{try{console.info(It,{event:e,detail:t,ts:new Date().toISOString()}),it.log("chat-width",e,t)}catch{}};function K(){return[".user-query-bubble-container",".user-query-container","user-query-content","user-query",'div[aria-label="User message"]','article[data-author="user"]','[data-message-author-role="user"]']}function Z(){return["model-response",".model-response","response-container",".response-container",".presented-response-container",'[aria-label="Gemini response"]','[data-message-author-role="assistant"]','[data-message-author-role="model"]','article[data-author="assistant"]']}function St(){return["table-block",".table-block","table-block .table-block","table-block .table-content",".table-block.new-table-style",".table-block.has-scrollbar",".table-block .table-content"]}const ee=(e,t,n)=>Math.min(n,Math.max(t,Math.round(e))),Ae=e=>{const t=Math.max(window.innerWidth,1);return e/t*100},He=e=>{const t=[];for(const n of e){const o=document.querySelector(n);if(!o)continue;const i=o.getBoundingClientRect(),a=window.getComputedStyle(o);if(t.push({selector:n,tag:o.tagName.toLowerCase(),className:o.className||"",rectWidthVw:Number(Ae(i.width).toFixed(3)),computedMaxWidth:a.maxWidth}),t.length>=4)break}return t},gt=e=>{const t=e.trim().toLowerCase();if(!t||t==="none"||t==="auto"||!t.endsWith("px"))return null;const n=Number.parseFloat(t);return Number.isFinite(n)?n:null},Pe=e=>{const t=[];for(const n of e){const o=Array.from(document.querySelectorAll(n));for(const i of o){const a=i.getBoundingClientRect();if(a.width<120||a.height<16)continue;const c=window.getComputedStyle(i);if(c.display==="none"||c.visibility==="hidden")continue;const u=gt(c.maxWidth);u!==null&&(u<120||u>window.innerWidth||t.push(Ae(u)))}}return t.length===0?null:(t.sort((n,o)=>n-o),t[Math.floor(t.length/2)]??null)},se=e=>{for(const t of e){const n=Array.from(document.querySelectorAll(t));for(const o of n){const i=o.getBoundingClientRect();if(i.width<120||i.height<16)continue;const a=window.getComputedStyle(o);if(!(a.display==="none"||a.visibility==="hidden"))return Ae(i.width)}}return null},ke=()=>{const e=document.getElementById($),t=e?.textContent??null;e&&(e.textContent="");const n=Pe(Z())??Pe(K())??se(Z())??se(K())??se([".presented-response-container","model-response",".response-container"]);e&&t!==null&&(e.textContent=t),n&&Number.isFinite(n)&&n>20&&n<=100?(M=n,G("native-base-measured",{nativeBaseVw:M})):G("native-base-measure-fallback",{measured:n,assistantSnapshot:He(Z()),userSnapshot:He(K())})},We=e=>{const t=Number(e);if(!Number.isFinite(t))return V;if(t>=R&&t<=F)return ee(t,R,F);if(t>0){const n=t/Math.max(M,1)*100;return ee(n,R,F)}return V},_t=e=>{const t=ee(e,R,F);return M*t/100};function ce(e){const t=ee(e,R,F);if(t===V){const l=document.getElementById($);l&&l.remove(),G("apply-native",{uiPercent:t,nativeBaseVw:M});return}const n=_t(t);G("apply-scaled",{uiPercent:t,nativeBaseVw:M,targetWidthVw:n});const o=`${n.toFixed(3)}vw`;let i=document.getElementById($);i||(i=document.createElement("style"),i.id=$,document.head.appendChild(i));const a=K(),c=Z(),u=St(),d=a.map(l=>`${l}`).join(`,
    `),s=c.map(l=>`${l}`).join(`,
    `),S=u.map(l=>`${l}`).join(`,
    `);G("apply-style-scope",{uiPercent:t,widthValue:o,userSelectors:a.length,assistantSelectors:c.length,tableSelectors:u.length}),i.textContent=`
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

    ${S} {
      max-width: ${o} !important;
      box-sizing: border-box !important;
    }

    table-block .table-block,
    .table-block.has-scrollbar,
    .table-block.new-table-style {
      overflow-x: hidden !important;
    }

    table-block .table-content,
    .table-block .table-content {
      width: 100% !important;
      overflow-x: auto !important;
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
  `}function pn(){let e=V;ke(),chrome.storage.local.get([r.GEMINI_CHAT_WIDTH],i=>{const a=i[r.GEMINI_CHAT_WIDTH];e=We(a),ce(e)}),chrome.storage.onChanged.addListener((i,a)=>{if(a==="local"&&i[r.GEMINI_CHAT_WIDTH]){const c=i[r.GEMINI_CHAT_WIDTH].newValue;e=We(c),ce(e)}});let t=null;const n=new MutationObserver(()=>{t!==null&&clearTimeout(t),t=window.setTimeout(()=>{e===V&&ke(),ce(e),t=null},200)}),o=document.querySelector("main");o&&n.observe(o,{childList:!0,subtree:!0}),window.addEventListener("beforeunload",()=>{n.disconnect();const i=document.getElementById($);i&&i.remove()},{once:!0})}const D="geminimate-edit-input-width",U=100,H=100,P=170,bt=60;let C=bt;const Tt="[GM-EditWidth]",k=(e,t={})=>{try{console.info(Tt,{event:e,detail:t,ts:new Date().toISOString()}),it.log("edit-width",e,t)}catch{}},te=(e,t,n)=>Math.min(n,Math.max(t,Math.round(e))),ve=e=>{const t=Math.max(window.innerWidth,1);return e/t*100},Be=e=>{const t=[];for(const n of e){const o=document.querySelector(n);if(!o)continue;const i=o.getBoundingClientRect(),a=window.getComputedStyle(o);if(t.push({selector:n,tag:o.tagName.toLowerCase(),className:o.className||"",rectWidthVw:Number(ve(i.width).toFixed(3)),computedMaxWidth:a.maxWidth}),t.length>=4)break}return t},wt=e=>{const t=e.trim().toLowerCase();if(!t||t==="none"||t==="auto"||!t.endsWith("px"))return null;const n=Number.parseFloat(t);return Number.isFinite(n)?n:null},Nt=e=>{const t=[];for(const n of e){const o=Array.from(document.querySelectorAll(n));for(const i of o){const a=i.getBoundingClientRect();if(a.width<120||a.height<16)continue;const c=window.getComputedStyle(i);if(c.display==="none"||c.visibility==="hidden")continue;const u=wt(c.maxWidth);u!==null&&(u<120||u>window.innerWidth||t.push(ve(u)))}}return t.length===0?null:(t.sort((n,o)=>n-o),t[Math.floor(t.length/2)]??null)},Oe=e=>{for(const t of e){const n=Array.from(document.querySelectorAll(t));for(const o of n){const i=o.getBoundingClientRect();if(i.width<120||i.height<16)continue;const a=window.getComputedStyle(o);if(!(a.display==="none"||a.visibility==="hidden"))return ve(i.width)}}return null},Ve=()=>{const e=document.getElementById(D),t=e?.textContent??null;e&&(e.textContent="");const n=Nt(["input-container fieldset.input-area-container","chat-window input-container fieldset.input-area-container",".query-content.edit-mode",".edit-container"])??Oe(["input-container fieldset.input-area-container","chat-window input-container fieldset.input-area-container",".query-content.edit-mode",".edit-container"])??Oe(pe());e&&t!==null&&(e.textContent=t),n&&Number.isFinite(n)&&n>20&&n<=100?(C=n,k("native-base-measured",{nativeBaseVw:C})):k("native-base-measure-fallback",{measured:n,editSnapshot:Be(pe()),inputSnapshot:Be(["input-container fieldset.input-area-container","chat-window input-container fieldset.input-area-container"])})},Ue=e=>{const t=Number(e);if(!Number.isFinite(t))return U;if(t>=H&&t<=P)return te(t,H,P);if(t>0){const n=t/Math.max(C,1)*100;return te(n,H,P)}return U},yt=e=>{const t=te(e,H,P);return C*t/100};function pe(){return[".query-content.edit-mode","div.edit-mode",'[class*="edit-mode"]']}function le(e){const t=te(e,H,P);if(t===U){const d=document.getElementById(D);d&&d.remove(),k("apply-native",{uiPercent:t,nativeBaseVw:C});return}const n=yt(t);k("apply-scaled",{uiPercent:t,nativeBaseVw:C,targetWidthVw:n});const o=`${n.toFixed(3)}vw`,i=`width: min(100%, ${o}) !important;`;let a=document.getElementById(D);a||(a=document.createElement("style"),a.id=D,document.head.appendChild(a));const c=pe(),u=c.map(d=>`${d}`).join(`,
    `);k("apply-style-scope",{uiPercent:t,widthValue:o,editModeSelectors:c.length}),a.textContent=`
    ${u} {
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
  `}function En(){let e=U;Ve(),chrome.storage.local.get([r.GEMINI_EDIT_INPUT_WIDTH],i=>{const a=i[r.GEMINI_EDIT_INPUT_WIDTH];e=Ue(a),le(e)}),chrome.storage.onChanged.addListener((i,a)=>{if(a==="local"&&i[r.GEMINI_EDIT_INPUT_WIDTH]){const c=i[r.GEMINI_EDIT_INPUT_WIDTH].newValue;e=Ue(c),le(e)}});let t=null;const n=new MutationObserver(()=>{t!==null&&clearTimeout(t),t=window.setTimeout(()=>{e===U&&Ve(),le(e),t=null},200)}),o=document.querySelector("main");o&&n.observe(o,{childList:!0,subtree:!0,attributes:!0,attributeFilter:["class"]}),window.addEventListener("beforeunload",()=>{n.disconnect();const i=document.getElementById(D);i&&i.remove()},{once:!0})}const ne="geminimate-sidebar-width-style",Mt=312,Ee=180,Ie=540,Se=(e,t,n)=>Math.min(n,Math.max(t,Math.round(e)));function Ct(e){const t=`${Se(e,Ee,Ie)}px`,o=`max(0px, calc(${t} - var(--bard-sidenav-closed-width, 72px)))`;return`
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
  `}function qe(e){let t=document.getElementById(ne);t||(t=document.createElement("style"),t.id=ne,document.documentElement.appendChild(t)),t.textContent=Ct(e)}function ze(){const e=document.getElementById(ne);e&&e.remove()}function In(){let e=Mt;chrome.storage.local.get([r.GEMINI_SIDEBAR_WIDTH],t=>{const n=t[r.GEMINI_SIDEBAR_WIDTH];typeof n=="number"&&Number.isFinite(n)?(e=Se(n,Ee,Ie),qe(e)):ze()}),chrome.storage.onChanged.addListener((t,n)=>{if(n==="local"&&t[r.GEMINI_SIDEBAR_WIDTH]){const o=Number(t[r.GEMINI_SIDEBAR_WIDTH].newValue);Number.isFinite(o)?(e=Se(o,Ee,Ie),qe(e)):ze()}}),window.addEventListener("beforeunload",()=>{const t=document.getElementById(ne);t&&t.remove()},{once:!0})}const ge="geminimate-sidebar-auto-hide-style",At=500,vt=300,Lt=1e3,xt=200,$t=1500;let h=!1,E=null,I=null,f=null,b=null,T=null,g=null,W=null,w=null,A=!1,Le=0;function _e(e){const t=window.getComputedStyle(e);if(t.display==="none"||t.visibility==="hidden")return!1;const n=e.getBoundingClientRect();return n.width>0||n.height>0}function Rt(){if(document.getElementById(ge))return;const e=document.createElement("style");e.id=ge,e.textContent=`
    bard-sidenav,
    bard-sidenav side-navigation-content,
    bard-sidenav side-navigation-content > div {
      transition: width 0.25s ease, transform 0.25s ease !important;
    }
  `,document.documentElement.appendChild(e)}function Ft(){const e=document.querySelector('button[data-test-id="side-nav-menu-button"]');if(e)return e;const t=document.querySelector("side-nav-menu-button");return t?t.querySelector("button"):null}function xe(){if(document.body.classList.contains("mat-sidenav-opened"))return!1;if(document.querySelector("bard-sidenav side-navigation-content > div")?.classList.contains("collapsed"))return!0;const t=document.querySelector("bard-sidenav");return!!(t&&t.getBoundingClientRect().width<80)}function be(){const e=document.querySelector("bard-sidenav");return e?_e(e):!1}function Gt(){return Date.now()<Le}function rt(){for(const e of document.querySelectorAll(".mat-mdc-dialog-container"))if(_e(e))return!0;for(const e of document.querySelectorAll(".mat-mdc-menu-panel"))if(_e(e))return!0;return!1}function Dt(){if(f?.matches(":hover"))return!0;for(const e of document.querySelectorAll(".mat-mdc-dialog-container"))if(e.matches(":hover"))return!0;for(const e of document.querySelectorAll(".mat-mdc-menu-panel"))if(e.matches(":hover"))return!0;return!1}function Ht(e){if(!h)return;e.target.closest('[role="menuitem"], .mat-mdc-menu-item, bard-sidenav button, [data-test-id*="options"]')&&(Le=Date.now()+$t)}function $e(){const e=Ft();return e?(e.click(),!0):!1}function at(){Gt()||rt()||Dt()||xe()||$e()&&(A=!0)}function Pt(){xe()&&($e(),A=!1)}function Te(){h&&(E!==null&&(clearTimeout(E),E=null),I!==null&&clearTimeout(I),I=window.setTimeout(()=>{I=null,h&&Pt()},vt))}function we(){h&&(I!==null&&(clearTimeout(I),I=null),E!==null&&clearTimeout(E),E=window.setTimeout(()=>{E=null,h&&at()},At))}function st(){const e=document.querySelector("bard-sidenav");return!e||!be()?!1:(e===f||(f&&(f.removeEventListener("mouseenter",Te),f.removeEventListener("mouseleave",we)),f=e,e.addEventListener("mouseenter",Te),e.addEventListener("mouseleave",we)),!0)}function ct(){f&&(f.removeEventListener("mouseenter",Te),f.removeEventListener("mouseleave",we),f=null)}function ue(){if(!h)return;const e=document.querySelector("bard-sidenav");if(f&&!be()){ct(),A=!1;return}e&&be()&&e!==f&&st()}function Ye(){h||(h=!0,A=!1,Le=0,Rt(),st(),b||(b=new MutationObserver(()=>h&&ue()),b.observe(document.body,{childList:!0,subtree:!0})),T||(T=()=>{h&&(g!==null&&clearTimeout(g),g=window.setTimeout(()=>{g=null,ue()},xt))},window.addEventListener("resize",T)),w||(w=Ht,document.addEventListener("click",w,!0)),W===null&&(W=window.setInterval(ue,Lt)),setTimeout(()=>{h&&f&&!f.matches(":hover")&&!rt()&&at()},500))}function je(){if(!h)return;h=!1,I!==null&&(clearTimeout(I),I=null),E!==null&&(clearTimeout(E),E=null),g!==null&&(clearTimeout(g),g=null),W!==null&&(clearInterval(W),W=null),A&&xe()&&$e(),A=!1,ct();const e=document.getElementById(ge);e&&e.remove(),b&&(b.disconnect(),b=null),T&&(window.removeEventListener("resize",T),T=null),w&&(document.removeEventListener("click",w,!0),w=null)}function Sn(){chrome.storage.local.get({[r.GEMINI_SIDEBAR_AUTO_HIDE]:!1},e=>{e[r.GEMINI_SIDEBAR_AUTO_HIDE]&&Ye()}),chrome.storage.onChanged.addListener((e,t)=>{t==="local"&&e[r.GEMINI_SIDEBAR_AUTO_HIDE]&&(e[r.GEMINI_SIDEBAR_AUTO_HIDE].newValue?Ye():je())}),window.addEventListener("beforeunload",je,{once:!0})}const de="geminimate-font-size-scale",Xe=100,kt=80,Wt=130,q=400,Bt=200,Ot=900,_="default",Re="sans-apple",J="serif-source",Vt=0,Ut=8,qt=1.75,zt=.1,Yt=.2;function Ke(e){const t=String(e||_);return t==="monospace"?"sans":t}function me(e,t){return String(e||"")==="monospace"?"sans-tech":String(t||Re)}const fe={"sans-apple":"system-ui, -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Hiragino Sans GB', 'Noto Sans SC', sans-serif","sans-sys":"'Segoe UI', 'Microsoft YaHei UI', 'Noto Sans SC', sans-serif","sans-harmony":"'HarmonyOS Sans SC', 'HarmonyOS Sans', 'PingFang SC', 'Noto Sans SC', sans-serif","sans-modern":"'MiSans', 'Alibaba PuHuiTi 3.0', 'PingFang SC', 'Noto Sans SC', sans-serif","sans-grotesk":"'Helvetica Neue', Arial, 'Noto Sans SC', sans-serif","sans-humanist":"'Source Sans 3', 'Noto Sans SC', 'Microsoft YaHei UI', sans-serif","sans-tech":"'JetBrains Mono', 'Fira Code', 'Cascadia Code', 'Courier New', monospace"},Ze={"serif-source":"'Source Han Serif SC', 'Noto Serif SC', 'Songti SC', serif","serif-traditional":"'Songti SC', SimSun, 'Noto Serif SC', serif","serif-fangsong":"FangSong, STFangsong, 'Noto Serif SC', serif","serif-kaiti":"'Kaiti SC', KaiTi, STKaiti, 'Noto Serif SC', serif","serif-newspaper":"Constantia, 'Times New Roman', STSong, 'Noto Serif SC', serif","serif-editorial":"Baskerville, 'Times New Roman', STSong, serif","serif-georgia":"Georgia, Cambria, 'Noto Serif SC', serif"},Ne=e=>Math.min(Wt,Math.max(kt,Math.round(e))),Je=e=>Math.min(Ot,Math.max(Bt,Math.round(e))),oe=e=>Math.min(Ut,Math.max(Vt,Math.round(e)));function jt(e){return qt+oe(e)*zt}const Xt=".markdown",Kt=".query-text, .query-text-line",Zt="rich-textarea p, rich-textarea [contenteditable], input-area-v2 p",Jt=`
    .markdown strong:not(.gemini-md-underline), .markdown b:not(.gemini-md-underline), .markdown h1, .markdown h2, .markdown h3,
  .markdown h4, .markdown h5, .markdown h6,
    .query-text strong:not(.gemini-md-underline), .query-text b:not(.gemini-md-underline),
    .query-text-line strong:not(.gemini-md-underline), .query-text-line b:not(.gemini-md-underline)`.trim(),Qe=".markdown .katex, .query-text .katex, .query-text-line .katex";function X(e,t,n){switch(e){case"monospace":return fe["sans-tech"];case"sans":return fe[t]??fe[Re];case"serif":return Ze[n]??Ze[J];case"default":return"inherit";default:return`'${e}', sans-serif`}}function Qt(e){const n=700+(e-q);return Math.min(900,Math.max(e,n))}function en(e,t,n,o,i,a,c){const d=Ne(e)/100,s=`font-size: calc(1rem * ${d}) !important;`,S=t!==q?`font-weight: ${t} !important;`:"",l=t!==q?`font-variation-settings: 'wght' ${t};`:"",m=n!==_?`font-family: ${X(n,o,i)} !important;`:"",re=a>0?`letter-spacing: ${(a*.01).toFixed(2)}em !important;`:"",ae=oe(c),Fe=jt(ae),ft=ae>0?`line-height: ${Fe.toFixed(3)} !important;`:"",p=[],ht=[s,S,l,m,re,ft].filter(Boolean).join(`
      `);p.push(`${Xt}, ${Kt}, ${Zt} {
      ${ht}
    }`);const z=n!==_?`
      font-family: ${X(n,o,i)} !important;`:"",Y=re?`
      ${re}`:"",j=`
      line-height: ${(ae>0?Math.max(1.2,Fe-Yt):1.25).toFixed(2)} !important;`;p.push(`.markdown h1 { font-size: calc(1.75rem * ${d}) !important;${z}${Y}${j}
      margin-top: 1.6em !important; margin-bottom: 0.5em !important; }`),p.push(`.markdown h2 { font-size: calc(1.5rem * ${d}) !important;${z}${Y}${j}
      margin-top: 1.4em !important; margin-bottom: 0.45em !important; }`),p.push(`.markdown h3 { font-size: calc(1.2rem * ${d}) !important;${z}${Y}${j}
      margin-top: 1.2em !important; margin-bottom: 0.4em !important; }`),p.push(`.markdown h4, .markdown h5, .markdown h6 { font-size: calc(1.05rem * ${d}) !important;${z}${Y}${j}
      margin-top: 1.0em !important; margin-bottom: 0.35em !important; }`),n!==_&&p.push(`.timeline-preview-search input::placeholder { font-family: ${X(n,o,i)} !important; }`);const Ge=Qt(t),De=n!==_?`font-family: ${X(n,o,i)} !important;`:"",pt=`font-variation-settings: 'wght' ${Ge};`;return p.push(`${Jt} {
            font-weight: ${Ge} !important;${De?`
      `+De:""}
      ${pt}
    }`),p.push(`${Qe} {
      font-weight: ${t} !important;
      font-variation-settings: normal !important;
    }`),p.push(`${Qe} * {
      font-weight: inherit !important;
      font-variation-settings: normal !important;
    }`),p.join(`
`)}function gn(){let e=Xe,t=q,n=_,o=Re,i=J,a=0,c=0;const u=(s,S)=>{if(S!=="local")return;let l=!1;if(s[r.GEMINI_FONT_SIZE_SCALE]){const m=Number(s[r.GEMINI_FONT_SIZE_SCALE].newValue);Number.isFinite(m)&&(e=Ne(m),l=!0)}if(s[r.GEMINI_FONT_WEIGHT]){const m=Number(s[r.GEMINI_FONT_WEIGHT].newValue);Number.isFinite(m)&&(t=Je(m),l=!0)}if(s[r.GEMINI_FONT_FAMILY]&&(n=Ke(s[r.GEMINI_FONT_FAMILY].newValue),s[r.GEMINI_SANS_PRESET]||(o=me(s[r.GEMINI_FONT_FAMILY].newValue,o)),l=!0),s[r.GEMINI_SANS_PRESET]&&(o=me(s[r.GEMINI_FONT_FAMILY]?.newValue??n,s[r.GEMINI_SANS_PRESET].newValue),l=!0),s[r.GEMINI_SERIF_PRESET]&&(i=String(s[r.GEMINI_SERIF_PRESET].newValue||J),l=!0),s[r.GEMINI_LETTER_SPACING]){const m=Number(s[r.GEMINI_LETTER_SPACING].newValue);Number.isFinite(m)&&(a=m,l=!0)}if(s[r.GEMINI_LINE_HEIGHT]){const m=Number(s[r.GEMINI_LINE_HEIGHT].newValue);Number.isFinite(m)&&(c=oe(m),l=!0)}l&&d()},d=()=>{let s=document.getElementById(de);s||(s=document.createElement("style"),s.id=de,document.head.appendChild(s));const S=en(e,t,n,o,i,a,c);s.textContent=S};chrome.storage.local.get([r.GEMINI_FONT_SIZE_SCALE,r.GEMINI_FONT_WEIGHT,r.GEMINI_FONT_FAMILY,r.GEMINI_SANS_PRESET,r.GEMINI_SERIF_PRESET,r.GEMINI_LETTER_SPACING,r.GEMINI_LINE_HEIGHT],s=>{e=Ne(Number(s[r.GEMINI_FONT_SIZE_SCALE])||Xe),t=Je(Number(s[r.GEMINI_FONT_WEIGHT])||q),n=Ke(s[r.GEMINI_FONT_FAMILY]),o=me(s[r.GEMINI_FONT_FAMILY],s[r.GEMINI_SANS_PRESET]),i=String(s[r.GEMINI_SERIF_PRESET]||J),a=Number(s[r.GEMINI_LETTER_SPACING])||0,c=oe(Number(s[r.GEMINI_LINE_HEIGHT])||0),d()}),chrome.storage.onChanged.addListener(u),window.addEventListener("beforeunload",()=>{chrome.storage.onChanged.removeListener(u);const s=document.getElementById(de);s&&s.remove()},{once:!0})}const et="geminimate-custom-fonts";function tn(e){return e.map(t=>`@font-face { font-family: '${t.name}'; src: url('${t.data}'); font-display: swap; }`).join(`
`)}function tt(e){let t=document.getElementById(et);t||(t=document.createElement("style"),t.id=et,document.head.appendChild(t)),t.textContent=tn(e)}function _n(){chrome.storage.local.get([r.GEMINI_CUSTOM_FONTS],e=>{const t=e[r.GEMINI_CUSTOM_FONTS]??[];tt(t)}),chrome.storage.onChanged.addListener((e,t)=>{if(t!=="local"||!e[r.GEMINI_CUSTOM_FONTS])return;const n=e[r.GEMINI_CUSTOM_FONTS].newValue??[];tt(n)})}const ye="geminimate-paragraph-indent-style",ie="gm-first-line-indent",B="data-gm-indent-applied",v="data-gm-indent-normalized",Me="data-gm-indent-original-text",lt="gm-indent-body-line",nn=!1,nt=["model-response message-content p","model-response .markdown p","model-response .markdown-main-panel p","model-response .model-response-text .markdown p",".model-response-text .markdown p","message-content .markdown p",".response-content .markdown p","structured-content-container message-content p","structured-content-container .markdown p",'[data-test-id="message-content"] p'].join(", "),on=/^(?:第\s*[一二三四五六七八九十百千万\d]+\s*[章节部分节讲]|[一二三四五六七八九十百千万]+\s*[、.．:：-])\s*/,rn=/^\d+\s*[、.．:)）-]\s*$/;let he=!1,O=nn,N=null,y=[],L=null;function an(){let e=document.getElementById(ye);e||(e=document.createElement("style"),e.id=ye,e.textContent=`
    .${ie} {
      text-indent: 2em !important;
    }

    .${lt} {
      display: block !important;
      text-indent: 2em !important;
    }
  `,document.head.appendChild(e))}function x(e){if(!(e instanceof HTMLElement))return;const t=e.getAttribute(Me);t!==null&&(e.textContent=t,e.removeAttribute(Me),e.removeAttribute(v)),e.classList.remove(ie),e.removeAttribute(B)}function Ce(){document.querySelectorAll(`[${B}], [${v}]`).forEach(e=>x(e))}const sn=["li","ul","ol","table","blockquote","pre","code",".code-block","code-block",".gm-mermaid-diagram",'[data-gm-mermaid-host="1"]',"h1","h2","h3","h4","h5","h6","model-thoughts",".thoughts-container",".thoughts-content",'[data-test-id*="thought"]'].join(", ");function ut(e){return!!e.closest(sn)}function cn(e){return rn.test(e.trim())}function dt(e){return e.replace(/\u00a0/g," ").trim().length>0}function ln(e){if(e.getAttribute(v)==="1"||ut(e)||e.children.length>0)return;const t=(e.textContent||"").replace(/\r/g,"");if(!t.includes(`
`))return;const[n,...o]=t.split(`
`),i=n.trim(),a=o.join(`
`).trim();if(!i||!a||cn(i)||!on.test(i)||!dt(a))return;e.setAttribute(Me,t),e.setAttribute(v,"1"),e.textContent="",e.appendChild(document.createTextNode(i));const c=document.createElement("span");c.className=lt,c.textContent=a,e.appendChild(c)}function un(e){const t=e.tagName.toUpperCase();if(t==="P")return!0;if(t!=="DIV"||window.getComputedStyle(e).display!=="block")return!1;const o=Array.from(e.children);return o.length===0?!0:o.every(i=>{const a=i.tagName.toUpperCase();if(a==="BR"||["B","STRONG","SPAN","A","EM","I","U","CODE","MARK","SMALL","SUB","SUP"].includes(a))return!0;const c=window.getComputedStyle(i).display;return c==="inline"||c==="inline-block"||c==="contents"})}function dn(){if(!O){Ce();return}document.querySelectorAll(nt).forEach(o=>{o instanceof HTMLElement&&ln(o)});const t=document.querySelectorAll(nt),n=new Set;t.forEach(o=>{o instanceof HTMLElement&&n.add(o)}),document.querySelectorAll(`[${B}], [${v}]`).forEach(o=>{o instanceof HTMLElement&&(n.has(o)||x(o))}),t.forEach(o=>{if(o instanceof HTMLElement){if(!un(o)){x(o);return}if(ut(o)){x(o);return}if(o.getAttribute(v)==="1"){o.classList.add(ie),o.setAttribute(B,"1");return}if(!dt(o.innerText||o.textContent||"")){x(o);return}o.classList.add(ie),o.setAttribute(B,"1")}})}function mt(){y.length!==0&&(y.forEach(e=>clearTimeout(e)),y=[])}function Q(){mt(),[120,360,900].forEach(e=>{const t=window.setTimeout(()=>{dn(),y=y.filter(n=>n!==t)},e);y.push(t)})}function ot(){N||!document.body||(N=new MutationObserver(e=>{!O||e.length===0||Q()}),N.observe(document.body,{childList:!0,subtree:!0,characterData:!0,attributes:!0,attributeFilter:["class","style","hidden","aria-hidden"]}))}function bn(){he||(he=!0,an(),chrome.storage.local.get([r.GEMINI_PARAGRAPH_INDENT_ENABLED],e=>{O=e[r.GEMINI_PARAGRAPH_INDENT_ENABLED]===!0,Q()}),L=(e,t)=>{if(t==="local"&&e[r.GEMINI_PARAGRAPH_INDENT_ENABLED]){if(O=e[r.GEMINI_PARAGRAPH_INDENT_ENABLED].newValue===!0,!O){Ce();return}Q()}},chrome.storage.onChanged.addListener(L),document.body?ot():document.addEventListener("DOMContentLoaded",()=>{ot(),Q()},{once:!0}),window.addEventListener("beforeunload",()=>{N&&(N.disconnect(),N=null),L&&(chrome.storage.onChanged.removeListener(L),L=null),mt(),Ce(),document.getElementById(ye)?.remove(),he=!1},{once:!0}))}export{En as a,In as b,Sn as c,gn as d,_n as e,bn as f,pn as s};
