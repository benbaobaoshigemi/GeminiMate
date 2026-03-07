import{S as o}from"./feature-reading-BoCbnQAC.js";const J="geminimate-chat-width",U=70,Q=30,tt=100;function Yt(){return[".user-query-bubble-container",".user-query-container","user-query-content","user-query",'div[aria-label="User message"]','article[data-author="user"]','[data-message-author-role="user"]']}function jt(){return["model-response",".model-response","response-container",".response-container",".presented-response-container",'[aria-label="Gemini response"]','[data-message-author-role="assistant"]','[data-message-author-role="model"]','article[data-author="assistant"]']}function Xt(){return["table-block",".table-block","table-block .table-block","table-block .table-content",".table-block.new-table-style",".table-block.has-scrollbar",".table-block .table-content"]}const et=(t,e,n)=>Math.min(n,Math.max(e,Math.round(t)));function q(t){const e=et(t,Q,tt),n=`${e}vw`,i=e>=95?`
    chat-window > div > input-container,
    chat-window input-container,
    input-container.input-gradient,
    input-container[class*="input-gradient"],
    input-gradient,
    .input-gradient {
      background: transparent !important;
      background-color: transparent !important;
      background-image: none !important;
      box-shadow: none !important;
      -webkit-box-shadow: none !important;
      filter: none !important;
      mask-image: none !important;
      -webkit-mask-image: none !important;
      --bard-color-synthetic--chat-window-surface: transparent !important;
    }

    chat-window > div > input-container::before,
    chat-window > div > input-container::after,
    input-container.input-gradient::before,
    input-container.input-gradient::after,
    input-container[class*="input-gradient"]::before,
    input-container[class*="input-gradient"]::after,
    input-gradient::before,
    input-gradient::after,
    .input-gradient::before,
    .input-gradient::after {
      display: none !important;
      content: none !important;
      background: transparent !important;
      opacity: 0 !important;
      mask-image: none !important;
      -webkit-mask-image: none !important;
    }

    .autosuggest-scrim,
    chat-window-content > .autosuggest-scrim {
      display: none !important;
      opacity: 0 !important;
      pointer-events: none !important;
      background: transparent !important;
      background-image: none !important;
    }

    .hidden-content-image-cache,
    chat-window-content > div.hidden-content-image-cache,
    chat-window-content > .hidden-content-image-cache,
    chat-window .hidden-content-image-cache {
      display: none !important;
      background: transparent !important;
      background-image: none !important;
    }

    chat-window > div,
    chat-window-content,
    input-container fieldset.input-area-container,
    input-container .input-area-container,
    condensed-tos-disclaimer,
    hallucination-disclaimer {
      background: transparent !important;
      background-image: none !important;
      max-width: 100% !important;
      width: 100% !important;
    }
  `:"";let a=document.getElementById(J);a||(a=document.createElement("style"),a.id=J,document.head.appendChild(a));const c=Yt(),s=jt(),g=Xt(),f=c.map(d=>`${d}`).join(`,
    `),r=s.map(d=>`${d}`).join(`,
    `),b=g.map(d=>`${d}`).join(`,
    `),u=10;a.textContent=`
    /* Remove width constraints from outer containers that contain conversations */
    .content-wrapper:has(chat-window),
    .main-content:has(chat-window),
    .content-container:has(chat-window),
    .content-container:has(.conversation-container) {
      max-width: none !important;
    }

    /* Remove width constraints from main and conversation containers, but not buttons */
    [role="main"]:has(chat-window),
    [role="main"]:has(.conversation-container) {
      max-width: none !important;
    }

    /* Target chat window and related containers; A small gap to account for scrollbars */
    chat-window,
    .chat-container,
    chat-window-content,
    .chat-history-scroll-container,
    .chat-history,
    .conversation-container {
      max-width: none !important;
      padding-right: ${u}px !important;
      box-sizing: border-box !important;
    }

    main > div:has(user-query),
    main > div:has(model-response),
    main > div:has(.conversation-container) {
      max-width: none !important;
      width: 100% !important;
    }

    @supports not selector(:has(*)) {
      .content-wrapper,
      .main-content,
      .content-container {
        max-width: none !important;
      }

      main > div:not(:has(button)):not(.main-menu-button) {
        max-width: none !important;
        width: 100% !important;
      }
    }

    ${f} {
      max-width: ${n} !important;
      width: min(100%, ${n}) !important;
      margin-left: auto !important;
      margin-right: auto !important;
    }

    ${r} {
      max-width: ${n} !important;
      width: min(100%, ${n}) !important;
      margin-left: auto !important;
      margin-right: auto !important;
    }

    ${b} {
      max-width: ${n} !important;
      width: min(100%, ${n}) !important;
      margin-left: auto !important;
      margin-right: auto !important;
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
      max-width: ${n} !important;
      width: min(100%, ${n}) !important;
      margin-left: auto !important;
      margin-right: auto !important;
    }

    user-query,
    user-query > *,
    user-query > * > *,
    model-response,
    model-response > *,
    model-response > * > *,
    response-container,
    response-container > *,
    response-container > * > * {
      max-width: ${n} !important;
    }

    .presented-response-container,
    [data-message-author-role] {
      max-width: ${n} !important;
    }

    .user-query-bubble-with-background {
      max-width: ${n} !important;
      width: fit-content !important;
    }

    ${i}
  `}function Re(){let t=U;chrome.storage.local.get({[o.GEMINI_CHAT_WIDTH]:U},a=>{const c=a[o.GEMINI_CHAT_WIDTH];t=et(Number(c)||U,Q,tt),q(t)}),chrome.storage.onChanged.addListener((a,c)=>{if(c==="local"&&a[o.GEMINI_CHAT_WIDTH]){const s=a[o.GEMINI_CHAT_WIDTH].newValue;typeof s=="number"&&(t=et(s,Q,tt),q(t))}});let e=null;const n=new MutationObserver(()=>{e!==null&&clearTimeout(e),e=window.setTimeout(()=>{q(t),e=null},200)}),i=document.querySelector("main");i&&n.observe(i,{childList:!0,subtree:!0}),window.addEventListener("beforeunload",()=>{n.disconnect();const a=document.getElementById(J);a&&a.remove()},{once:!0})}const nt="geminimate-edit-input-width",W=60,it=30,ot=100,at=(t,e,n)=>Math.min(n,Math.max(e,Math.round(t)));function Kt(){return[".query-content.edit-mode","div.edit-mode",'[class*="edit-mode"]']}function V(t){const e=at(t,it,ot),n=`${e}vw`,i=e>=95?`
    chat-window > div > input-container,
    chat-window input-container,
    input-container.input-gradient,
    input-container[class*="input-gradient"],
    input-gradient,
    .input-gradient {
      background: transparent !important;
      background-color: transparent !important;
      background-image: none !important;
      box-shadow: none !important;
      -webkit-box-shadow: none !important;
      filter: none !important;
      mask-image: none !important;
      -webkit-mask-image: none !important;
      --bard-color-synthetic--chat-window-surface: transparent !important;
    }

    chat-window > div > input-container::before,
    chat-window > div > input-container::after,
    input-container.input-gradient::before,
    input-container.input-gradient::after,
    input-container[class*="input-gradient"]::before,
    input-container[class*="input-gradient"]::after,
    input-gradient::before,
    input-gradient::after,
    .input-gradient::before,
    .input-gradient::after {
      display: none !important;
      content: none !important;
      background: transparent !important;
      opacity: 0 !important;
    }

    .autosuggest-scrim,
    chat-window-content > .autosuggest-scrim {
      display: none !important;
      opacity: 0 !important;
      pointer-events: none !important;
      background: transparent !important;
      background-image: none !important;
    }

    .hidden-content-image-cache,
    chat-window-content > div.hidden-content-image-cache,
    chat-window-content > .hidden-content-image-cache,
    chat-window .hidden-content-image-cache {
      display: none !important;
      background: transparent !important;
      background-image: none !important;
    }

    chat-window > div,
    chat-window-content,
    input-container fieldset.input-area-container,
    input-container .input-area-container,
    condensed-tos-disclaimer,
    hallucination-disclaimer {
      background: transparent !important;
      background-image: none !important;
      max-width: 100% !important;
      width: 100% !important;
    }
  `:"";let a=document.getElementById(nt);a||(a=document.createElement("style"),a.id=nt,document.head.appendChild(a));const s=Kt().map(g=>`${g}`).join(`,
    `);a.textContent=`
    .content-wrapper:has(.edit-mode),
    .main-content:has(.edit-mode),
    .content-container:has(.edit-mode) {
      max-width: none !important;
    }

    [role="main"]:has(.edit-mode) {
      max-width: none !important;
    }

    main > div:has(.edit-mode) {
      max-width: none !important;
      width: 100% !important;
    }

    ${s} {
      max-width: ${n} !important;
      width: min(100%, ${n}) !important;
    }

    .edit-mode .edit-container,
    .query-content.edit-mode .edit-container {
      max-width: ${n} !important;
      width: min(100%, ${n}) !important;
    }

    .edit-mode .mat-mdc-form-field,
    .edit-container .mat-mdc-form-field,
    .edit-mode .edit-form {
      max-width: ${n} !important;
      width: 100% !important;
    }

    .edit-mode .mat-mdc-text-field-wrapper,
    .edit-mode .mat-mdc-form-field-flex,
    .edit-mode .mdc-text-field {
      max-width: ${n} !important;
      width: 100% !important;
    }

    .edit-mode .mat-mdc-form-field-infix {
      max-width: ${n} !important;
      width: 100% !important;
    }

    .edit-mode textarea,
    .edit-container textarea,
    .edit-mode .mat-mdc-input-element,
    .edit-mode .cdk-textarea-autosize {
      max-width: ${n} !important;
      width: 100% !important;
      box-sizing: border-box !important;
    }

    input-container {
      max-width: ${n} !important;
      width: min(100%, ${n}) !important;
      margin-left: auto !important;
      margin-right: auto !important;
    }

    input-container .input-area-container {
      max-width: 100% !important;
      width: 100% !important;
    }

    input-area-v2 {
      max-width: 100% !important;
      width: 100% !important;
    }

    input-area-v2 .input-area {
      max-width: 100% !important;
      width: 100% !important;
    }

    @supports not selector(:has(*)) {
      .content-wrapper,
      .main-content,
      .content-container {
        max-width: none !important;
      }
    }

    ${i}
  `}function ke(){let t=W;chrome.storage.local.get({[o.GEMINI_EDIT_INPUT_WIDTH]:W},a=>{const c=a[o.GEMINI_EDIT_INPUT_WIDTH];t=at(Number(c)||W,it,ot),V(t)}),chrome.storage.onChanged.addListener((a,c)=>{if(c==="local"&&a[o.GEMINI_EDIT_INPUT_WIDTH]){const s=a[o.GEMINI_EDIT_INPUT_WIDTH].newValue;typeof s=="number"&&(t=at(s,it,ot),V(t))}});let e=null;const n=new MutationObserver(()=>{e!==null&&clearTimeout(e),e=window.setTimeout(()=>{V(t),e=null},200)}),i=document.querySelector("main");i&&n.observe(i,{childList:!0,subtree:!0,attributes:!0,attributeFilter:["class"]}),window.addEventListener("beforeunload",()=>{n.disconnect();const a=document.getElementById(nt);a&&a.remove()},{once:!0})}const rt="geminimate-sidebar-width-style",z=312,st=180,ct=540,dt=(t,e,n)=>Math.min(n,Math.max(e,Math.round(t)));function Zt(t){const e=`${dt(t,st,ct)}px`,i=`max(0px, calc(${e} - var(--bard-sidenav-closed-width, 72px)))`;return`
    :root {
      --bard-sidenav-open-width: ${e} !important;
      --bard-sidenav-open-closed-width-diff: ${i} !important;
      --gv-sidenav-shift: ${i} !important;
    }

    #app-root:has(side-navigation-content > div.collapsed) {
      --gv-sidenav-shift: 0px !important;
    }

    bard-sidenav {
      --bard-sidenav-open-width: ${e} !important;
      --bard-sidenav-open-closed-width-diff: ${i} !important;
    }

    #app-root > main > div > bard-mode-switcher {
      transform: translateX(var(--gv-sidenav-shift)) !important;
      pointer-events: none !important;
    }

    #app-root > main > div > bard-mode-switcher :is(
      button, a, input, select, textarea, [role='button'], [tabindex]:not([tabindex='-1'])
    ) {
      pointer-events: auto;
    }

    #app-root > main > div > bard-mode-switcher .top-bar-actions {
      pointer-events: none !important;
    }

    top-bar-actions .top-bar-actions,
    top-bar-actions {
      pointer-events: none !important;
    }

    #app-root > main > div > bard-mode-switcher .top-bar-actions :is(
      button, a, input, select, textarea, [role='button'], [tabindex]:not([tabindex='-1']), search-nav-button
    ),
    top-bar-actions .top-bar-actions :is(
      button, a, input, select, textarea, [role='button'], [tabindex]:not([tabindex='-1']), search-nav-button
    ),
    top-bar-actions :is(
      button, a, input, select, textarea, [role='button'], [tabindex]:not([tabindex='-1']), search-nav-button
    ) {
      pointer-events: auto !important;
    }

    #app-root > main > div > bard-mode-switcher search-nav-button,
    #app-root > main > div > bard-mode-switcher search-nav-button button,
    top-bar-actions search-nav-button,
    top-bar-actions search-nav-button button {
      position: relative;
      z-index: 1;
      pointer-events: auto !important;
    }
  `}function yt(t){let e=document.getElementById(rt);e||(e=document.createElement("style"),e.id=rt,document.documentElement.appendChild(e)),e.textContent=Zt(t)}function Ge(){let t=z;chrome.storage.local.get({[o.GEMINI_SIDEBAR_WIDTH]:z},e=>{const n=e[o.GEMINI_SIDEBAR_WIDTH];t=dt(Number(n)||z,st,ct),yt(t)}),chrome.storage.onChanged.addListener((e,n)=>{if(n==="local"&&e[o.GEMINI_SIDEBAR_WIDTH]){const i=Number(e[o.GEMINI_SIDEBAR_WIDTH].newValue);Number.isFinite(i)&&(t=dt(i,st,ct),yt(t))}}),window.addEventListener("beforeunload",()=>{const e=document.getElementById(rt);e&&e.remove()},{once:!0})}const ut="geminimate-sidebar-auto-hide-style",Jt=500,Qt=300,te=1e3,ee=200,ne=1500;let l=!1,h=null,E=null,m=null,_=null,T=null,I=null,x=null,v=null,A=!1,wt=0;function mt(t){const e=window.getComputedStyle(t);if(e.display==="none"||e.visibility==="hidden")return!1;const n=t.getBoundingClientRect();return n.width>0||n.height>0}function ie(){if(document.getElementById(ut))return;const t=document.createElement("style");t.id=ut,t.textContent=`
    bard-sidenav,
    bard-sidenav side-navigation-content,
    bard-sidenav side-navigation-content > div {
      transition: width 0.25s ease, transform 0.25s ease !important;
    }
  `,document.documentElement.appendChild(t)}function oe(){const t=document.querySelector('button[data-test-id="side-nav-menu-button"]');if(t)return t;const e=document.querySelector("side-nav-menu-button");return e?e.querySelector("button"):null}function It(){if(document.body.classList.contains("mat-sidenav-opened"))return!1;if(document.querySelector("bard-sidenav side-navigation-content > div")?.classList.contains("collapsed"))return!0;const e=document.querySelector("bard-sidenav");return!!(e&&e.getBoundingClientRect().width<80)}function lt(){const t=document.querySelector("bard-sidenav");return t?mt(t):!1}function ae(){return Date.now()<wt}function Dt(){for(const t of document.querySelectorAll(".mat-mdc-dialog-container"))if(mt(t))return!0;for(const t of document.querySelectorAll(".mat-mdc-menu-panel"))if(mt(t))return!0;return!1}function re(){if(m?.matches(":hover"))return!0;for(const t of document.querySelectorAll(".mat-mdc-dialog-container"))if(t.matches(":hover"))return!0;for(const t of document.querySelectorAll(".mat-mdc-menu-panel"))if(t.matches(":hover"))return!0;return!1}function se(t){if(!l)return;t.target.closest('[role="menuitem"], .mat-mdc-menu-item, bard-sidenav button, [data-test-id*="options"]')&&(wt=Date.now()+ne)}function St(){const t=oe();return t?(t.click(),!0):!1}function Ft(){ae()||Dt()||re()||It()||St()&&(A=!0)}function ce(){It()&&(St(),A=!1)}function pt(){l&&(h!==null&&(clearTimeout(h),h=null),E!==null&&clearTimeout(E),E=window.setTimeout(()=>{E=null,l&&ce()},Qt))}function ft(){l&&(E!==null&&(clearTimeout(E),E=null),h!==null&&clearTimeout(h),h=window.setTimeout(()=>{h=null,l&&Ft()},Jt))}function Ht(){const t=document.querySelector("bard-sidenav");return!t||!lt()?!1:(t===m||(m&&(m.removeEventListener("mouseenter",pt),m.removeEventListener("mouseleave",ft)),m=t,t.addEventListener("mouseenter",pt),t.addEventListener("mouseleave",ft)),!0)}function Ot(){m&&(m.removeEventListener("mouseenter",pt),m.removeEventListener("mouseleave",ft),m=null)}function Y(){if(!l)return;const t=document.querySelector("bard-sidenav");if(m&&!lt()){Ot(),A=!1;return}t&&lt()&&t!==m&&Ht()}function At(){l||(l=!0,A=!1,wt=0,ie(),Ht(),_||(_=new MutationObserver(()=>l&&Y()),_.observe(document.body,{childList:!0,subtree:!0})),T||(T=()=>{l&&(I!==null&&clearTimeout(I),I=window.setTimeout(()=>{I=null,Y()},ee))},window.addEventListener("resize",T)),v||(v=se,document.addEventListener("click",v,!0)),x===null&&(x=window.setInterval(Y,te)),setTimeout(()=>{l&&m&&!m.matches(":hover")&&!Dt()&&Ft()},500))}function Mt(){if(!l)return;l=!1,E!==null&&(clearTimeout(E),E=null),h!==null&&(clearTimeout(h),h=null),I!==null&&(clearTimeout(I),I=null),x!==null&&(clearInterval(x),x=null),A&&It()&&St(),A=!1,Ot();const t=document.getElementById(ut);t&&t.remove(),_&&(_.disconnect(),_=null),T&&(window.removeEventListener("resize",T),T=null),v&&(document.removeEventListener("click",v,!0),v=null)}function De(){chrome.storage.local.get({[o.GEMINI_SIDEBAR_AUTO_HIDE]:!1},t=>{t[o.GEMINI_SIDEBAR_AUTO_HIDE]&&At()}),chrome.storage.onChanged.addListener((t,e)=>{e==="local"&&t[o.GEMINI_SIDEBAR_AUTO_HIDE]&&(t[o.GEMINI_SIDEBAR_AUTO_HIDE].newValue?At():Mt())}),window.addEventListener("beforeunload",Mt,{once:!0})}const j="geminimate-font-size-scale",Ct=100,de=80,ue=130,S=400,w="default",_t="sans-apple",H="serif-source",me=`
    .mat-sidenav,
    .mat-sidenav button,
    .mat-sidenav a,
    .mat-sidenav span,
    .mat-sidenav div,
    side-navigation-v2,
    side-navigation-content,
    side-navigation-content button,
    side-navigation-content a,
    side-navigation-content span,
    side-navigation-content div,
    .bot-row-container,
    .bot-row-container .text-container,
    .bot-row-container .text-container *,
    .project-sidenav-container,
    .project-sidenav-container *
`.trim(),le=`
    .katex-display,
    .katex-display *,
    .katex,
    .katex *,
    ms-katex,
    ms-katex *,
    math,
    math *
`.trim(),pe=`
    .timeline-preview-panel,
    .timeline-preview-panel *,
    .timeline-preview-search input,
    .timeline-preview-item,
    .timeline-preview-index,
    .timeline-preview-text,
    .timeline-preview-empty,
    .timeline-tooltip
`.trim();function Lt(t){const e=String(t||w);return e==="monospace"?"sans":e}function X(t,e){return String(t||"")==="monospace"?"sans-tech":String(e||_t)}const K={"sans-apple":"system-ui, -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Hiragino Sans GB', 'Noto Sans SC', sans-serif","sans-sys":"'Segoe UI', 'Microsoft YaHei UI', 'Noto Sans SC', sans-serif","sans-harmony":"'HarmonyOS Sans SC', 'HarmonyOS Sans', 'PingFang SC', 'Noto Sans SC', sans-serif","sans-modern":"'MiSans', 'Alibaba PuHuiTi 3.0', 'PingFang SC', 'Noto Sans SC', sans-serif","sans-grotesk":"'Helvetica Neue', Arial, 'Noto Sans SC', sans-serif","sans-humanist":"'Source Sans 3', 'Noto Sans SC', 'Microsoft YaHei UI', sans-serif","sans-tech":"'JetBrains Mono', 'Fira Code', 'Cascadia Code', 'Courier New', monospace"},xt={"serif-source":"'Source Han Serif SC', 'Noto Serif SC', 'Songti SC', serif","serif-traditional":"'Songti SC', SimSun, 'Noto Serif SC', serif","serif-fangsong":"FangSong, STFangsong, 'Noto Serif SC', serif","serif-kaiti":"'Kaiti SC', KaiTi, STKaiti, 'Noto Serif SC', serif","serif-newspaper":"Constantia, 'Times New Roman', STSong, 'Noto Serif SC', serif","serif-editorial":"Baskerville, 'Times New Roman', STSong, serif","serif-georgia":"Georgia, Cambria, 'Noto Serif SC', serif"},ht=t=>Math.min(ue,Math.max(de,Math.round(t))),fe=".markdown",he=".query-text, .query-text-line",Ee="rich-textarea p, rich-textarea [contenteditable], input-area-v2 p",be=`
    .markdown strong:not(.gemini-md-underline), .markdown b:not(.gemini-md-underline), .markdown h1, .markdown h2, .markdown h3,
  .markdown h4, .markdown h5, .markdown h6,
    .query-text strong:not(.gemini-md-underline), .query-text b:not(.gemini-md-underline),
    .query-text-line strong:not(.gemini-md-underline), .query-text-line b:not(.gemini-md-underline)`.trim();function F(t,e,n){switch(t){case"monospace":return K["sans-tech"];case"sans":return K[e]??K[_t];case"serif":return xt[n]??xt[H];case"default":return"inherit";default:return`'${t}', sans-serif`}}function ge(t){const n=700+(t-S);return Math.min(900,Math.max(t,n))}function we(t,e,n,i,a,c,s){const f=ht(t)/100,r=`font-size: calc(1rem * ${f}) !important;`,b=e!==S?`font-weight: ${e} !important;`:"",u=e!==S?`font-variation-settings: 'wght' ${e};`:"",d=n!==w?`font-family: ${F(n,i,a)} !important;`:"",B=c>0?`letter-spacing: ${(c*.01).toFixed(2)}em !important;`:"",Wt=s>0?`line-height: ${(1.4+s*.1).toFixed(1)} !important;`:"",p=[],Vt=[r,b,u,d,B,Wt].filter(Boolean).join(`
      `);if(p.push(`${fe}, ${he}, ${Ee} {
      ${Vt}
    }`),n!==w||e!==S){const Nt=[d,b,u].filter(Boolean).join(`
      `);p.push(`${me} {
            ${Nt}
        }`),p.push(`${pe} {
            ${Nt}
        }`)}e!==S&&p.push(`${le} {
            ${b}
            ${u}
        }`);const k=n!==w?`
      font-family: ${F(n,i,a)} !important;`:"",G=B?`
      ${B}`:"",D=`
      line-height: ${(s>0?Math.max(1.2,1.4+s*.1-.2):1.25).toFixed(2)} !important;`;p.push(`.markdown h1 { font-size: calc(1.75rem * ${f}) !important;${k}${G}${D}
      margin-top: 1.6em !important; margin-bottom: 0.5em !important; }`),p.push(`.markdown h2 { font-size: calc(1.5rem * ${f}) !important;${k}${G}${D}
      margin-top: 1.4em !important; margin-bottom: 0.45em !important; }`),p.push(`.markdown h3 { font-size: calc(1.2rem * ${f}) !important;${k}${G}${D}
      margin-top: 1.2em !important; margin-bottom: 0.4em !important; }`),p.push(`.markdown h4, .markdown h5, .markdown h6 { font-size: calc(1.05rem * ${f}) !important;${k}${G}${D}
      margin-top: 1.0em !important; margin-bottom: 0.35em !important; }`),n!==w&&p.push(`.timeline-preview-search input::placeholder { font-family: ${F(n,i,a)} !important; }`);const Tt=ge(e),vt=n!==w?`font-family: ${F(n,i,a)} !important;`:"",zt=`font-variation-settings: 'wght' ${Tt};`;return p.push(`${be} {
            font-weight: ${Tt} !important;${vt?`
      `+vt:""}
      ${zt}
    }`),p.join(`
`)}function Fe(){let t=Ct,e=S,n=w,i=_t,a=H,c=0,s=0;const g=(r,b)=>{if(b!=="local")return;let u=!1;if(r[o.GEMINI_FONT_SIZE_SCALE]){const d=Number(r[o.GEMINI_FONT_SIZE_SCALE].newValue);Number.isFinite(d)&&(t=ht(d),u=!0)}if(r[o.GEMINI_FONT_WEIGHT]){const d=Number(r[o.GEMINI_FONT_WEIGHT].newValue);Number.isFinite(d)&&(e=d,u=!0)}if(r[o.GEMINI_FONT_FAMILY]&&(n=Lt(r[o.GEMINI_FONT_FAMILY].newValue),r[o.GEMINI_SANS_PRESET]||(i=X(r[o.GEMINI_FONT_FAMILY].newValue,i)),u=!0),r[o.GEMINI_SANS_PRESET]&&(i=X(r[o.GEMINI_FONT_FAMILY]?.newValue??n,r[o.GEMINI_SANS_PRESET].newValue),u=!0),r[o.GEMINI_SERIF_PRESET]&&(a=String(r[o.GEMINI_SERIF_PRESET].newValue||H),u=!0),r[o.GEMINI_LETTER_SPACING]){const d=Number(r[o.GEMINI_LETTER_SPACING].newValue);Number.isFinite(d)&&(c=d,u=!0)}if(r[o.GEMINI_LINE_HEIGHT]){const d=Number(r[o.GEMINI_LINE_HEIGHT].newValue);Number.isFinite(d)&&(s=d,u=!0)}u&&f()},f=()=>{let r=document.getElementById(j);r||(r=document.createElement("style"),r.id=j,document.head.appendChild(r));const b=we(t,e,n,i,a,c,s);r.textContent=b};chrome.storage.local.get([o.GEMINI_FONT_SIZE_SCALE,o.GEMINI_FONT_WEIGHT,o.GEMINI_FONT_FAMILY,o.GEMINI_SANS_PRESET,o.GEMINI_SERIF_PRESET,o.GEMINI_LETTER_SPACING,o.GEMINI_LINE_HEIGHT],r=>{t=ht(Number(r[o.GEMINI_FONT_SIZE_SCALE])||Ct),e=Number(r[o.GEMINI_FONT_WEIGHT])||S,n=Lt(r[o.GEMINI_FONT_FAMILY]),i=X(r[o.GEMINI_FONT_FAMILY],r[o.GEMINI_SANS_PRESET]),a=String(r[o.GEMINI_SERIF_PRESET]||H),c=Number(r[o.GEMINI_LETTER_SPACING])||0,s=Number(r[o.GEMINI_LINE_HEIGHT])||0,f()}),chrome.storage.onChanged.addListener(g),window.addEventListener("beforeunload",()=>{chrome.storage.onChanged.removeListener(g);const r=document.getElementById(j);r&&r.remove()},{once:!0})}const $t="geminimate-custom-fonts";function Ie(t){return t.map(e=>`@font-face { font-family: '${e.name}'; src: url('${e.data}'); font-display: swap; }`).join(`
`)}function Rt(t){let e=document.getElementById($t);e||(e=document.createElement("style"),e.id=$t,document.head.appendChild(e)),e.textContent=Ie(t)}function He(){chrome.storage.local.get([o.GEMINI_CUSTOM_FONTS],t=>{const e=t[o.GEMINI_CUSTOM_FONTS]??[];Rt(e)}),chrome.storage.onChanged.addListener((t,e)=>{if(e!=="local"||!t[o.GEMINI_CUSTOM_FONTS])return;const n=t[o.GEMINI_CUSTOM_FONTS].newValue??[];Rt(n)})}const Et="geminimate-paragraph-indent-style",P="gm-first-line-indent",$="data-gm-indent-applied",M="data-gm-indent-normalized",bt="data-gm-indent-original-text",Pt="gm-indent-body-line",Se=!1,kt=["model-response message-content p","model-response .markdown p","model-response .markdown-main-panel p","structured-content-container message-content p",'[data-test-id="message-content"] p'].join(", "),_e=/^(?:第\s*[一二三四五六七八九十百千万\d]+\s*[章节部分节讲]|[一二三四五六七八九十百千万]+\s*[、.．:：-])\s*/,Te=/^\d+\s*[、.．:)）-]\s*$/;let Z=!1,R=Se,N=null,y=[],C=null;function ve(){let t=document.getElementById(Et);t||(t=document.createElement("style"),t.id=Et,t.textContent=`
    .${P} {
      text-indent: 2em !important;
    }

    .${Pt} {
      display: block !important;
      text-indent: 2em !important;
    }
  `,document.head.appendChild(t))}function L(t){if(!(t instanceof HTMLElement))return;const e=t.getAttribute(bt);e!==null&&(t.textContent=e,t.removeAttribute(bt),t.removeAttribute(M)),t.classList.remove(P),t.removeAttribute($)}function gt(){document.querySelectorAll(`[${$}], [${M}]`).forEach(t=>L(t))}const Ne=["li","ul","ol","table","blockquote","pre","code","h1","h2","h3","h4","h5","h6","model-thoughts",".thoughts-container",".thoughts-content",'[data-test-id*="thought"]','[class*="thought"]'].join(", ");function Bt(t){return!!t.closest(Ne)}function ye(t){return Te.test(t.trim())}function Ut(t){return t.replace(/\u00a0/g," ").trim().length>0}function Ae(t){if(t.getAttribute(M)==="1"||Bt(t)||t.children.length>0)return;const e=(t.textContent||"").replace(/\r/g,"");if(!e.includes(`
`))return;const[n,...i]=e.split(`
`),a=n.trim(),c=i.join(`
`).trim();if(!a||!c||ye(a)||!_e.test(a)||!Ut(c))return;t.setAttribute(bt,e),t.setAttribute(M,"1"),t.textContent="",t.appendChild(document.createTextNode(a));const s=document.createElement("span");s.className=Pt,s.textContent=c,t.appendChild(s)}function Me(t){const e=t.tagName.toUpperCase();if(e==="P")return!0;if(e!=="DIV"||window.getComputedStyle(t).display!=="block")return!1;const i=Array.from(t.children);return i.length===0?!0:i.every(a=>{const c=a.tagName.toUpperCase();if(c==="BR"||["B","STRONG","SPAN","A","EM","I","U","CODE","MARK","SMALL","SUB","SUP"].includes(c))return!0;const s=window.getComputedStyle(a).display;return s==="inline"||s==="inline-block"||s==="contents"})}function Ce(){if(!R){gt();return}document.querySelectorAll(kt).forEach(i=>{i instanceof HTMLElement&&Ae(i)});const e=document.querySelectorAll(kt),n=new Set;e.forEach(i=>{i instanceof HTMLElement&&n.add(i)}),document.querySelectorAll(`[${$}], [${M}]`).forEach(i=>{i instanceof HTMLElement&&(n.has(i)||L(i))}),e.forEach(i=>{if(i instanceof HTMLElement){if(!Me(i)){L(i);return}if(Bt(i)){L(i);return}if(i.getAttribute(M)==="1"){i.classList.add(P),i.setAttribute($,"1");return}if(!Ut(i.innerText||i.textContent||"")){L(i);return}i.classList.add(P),i.setAttribute($,"1")}})}function qt(){y.length!==0&&(y.forEach(t=>clearTimeout(t)),y=[])}function O(){qt(),[120,360,900].forEach(t=>{const e=window.setTimeout(()=>{Ce(),y=y.filter(n=>n!==e)},t);y.push(e)})}function Gt(){N||!document.body||(N=new MutationObserver(t=>{!R||t.length===0||O()}),N.observe(document.body,{childList:!0,subtree:!0,characterData:!0,attributes:!0,attributeFilter:["class","style","hidden","aria-hidden"]}))}function Oe(){Z||(Z=!0,ve(),chrome.storage.local.get([o.GEMINI_PARAGRAPH_INDENT_ENABLED],t=>{R=t[o.GEMINI_PARAGRAPH_INDENT_ENABLED]===!0,O()}),C=(t,e)=>{if(e==="local"&&t[o.GEMINI_PARAGRAPH_INDENT_ENABLED]){if(R=t[o.GEMINI_PARAGRAPH_INDENT_ENABLED].newValue===!0,!R){gt();return}O()}},chrome.storage.onChanged.addListener(C),document.body?Gt():document.addEventListener("DOMContentLoaded",()=>{Gt(),O()},{once:!0}),window.addEventListener("beforeunload",()=>{N&&(N.disconnect(),N=null),C&&(chrome.storage.onChanged.removeListener(C),C=null),qt(),gt(),document.getElementById(Et)?.remove(),Z=!1},{once:!0}))}export{ke as a,Ge as b,De as c,Fe as d,He as e,Oe as f,Re as s};
